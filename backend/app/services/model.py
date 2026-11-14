"""One pinned model path for all inference; never substitute a heuristic."""

import hashlib
import io
import json
import logging
import tempfile
import threading
import time
import zipfile
from datetime import datetime, timezone
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
import sklearn

from app.schemas.scenario import FEATURES, Scenario

logger = logging.getLogger("roadsentinel.model")


class ModelUnavailable(Exception):
    pass


class BoundedForestExplainer:
    """Exact Tree SHAP without duplicating the whole forest into dense SHAP arrays."""

    def __init__(self, model):
        self.model = model
        self.expected_value = None

    def shap_values(self, frame, check_additivity=True):
        import shap

        values = np.zeros((len(frame), self.model.n_features_in_, len(self.model.classes_)))
        expected = np.zeros(len(self.model.classes_))
        for tree in self.model.estimators_:
            explainer = shap.TreeExplainer(tree, feature_perturbation="tree_path_dependent")
            values += np.asarray(explainer.shap_values(frame, check_additivity=check_additivity))
            expected += np.asarray(explainer.expected_value)
        count = len(self.model.estimators_)
        self.expected_value = expected / count
        return values / count


def severity_index(probabilities: list[dict], verified: bool) -> float | None:
    if not verified:
        return None
    weights = {"Slight": 0.0, "Serious": 0.5, "Fatal": 1.0}
    if {p["label"] for p in probabilities} != set(weights):
        return None
    return round(100 * sum(p["probability"] * weights[p["label"]] for p in probabilities), 2)


class ModelService:
    def __init__(self, settings):
        self.settings = settings
        self.manifest = json.loads(settings.model_manifest.read_text(encoding="utf-8"))
        self.model = None
        self.explainer = None
        self.failure = None
        self.lock = threading.Lock()

    def initialize(self):
        try:
            m = self.manifest
            if sklearn.__version__ != m["sklearn_version"]:
                raise ValueError("Model runtime version does not match its manifest")
            with self.settings.model_archive.open("rb") as archive_file:
                if hashlib.file_digest(archive_file, "sha256").hexdigest() != m["archive_sha256"]:
                    raise ValueError("Model archive checksum mismatch")
            with zipfile.ZipFile(self.settings.model_archive) as archive:
                if set(archive.namelist()) != {"rf_model.pkl", "feature_names.pkl"}:
                    raise ValueError("Unexpected archive members")
                if sum(i.file_size for i in archive.infolist()) > 200 * 1024 * 1024:
                    raise ValueError("Model archive expands beyond its budget")
                names_bytes = archive.read("feature_names.pkl")
                if hashlib.sha256(names_bytes).hexdigest() != m["features_sha256"]:
                    raise ValueError("Feature checksum mismatch")
                # Stream the large member to an anonymous temporary file. Holding its
                # full bytes alongside deserialization creates an avoidable RAM peak.
                with tempfile.TemporaryFile() as model_file, archive.open("rf_model.pkl") as member:
                    digest = hashlib.sha256()
                    while chunk := member.read(1024 * 1024):
                        digest.update(chunk)
                        model_file.write(chunk)
                    if digest.hexdigest() != m["model_sha256"]:
                        raise ValueError("Model checksum mismatch")
                    model_file.seek(0)
                    # Only the explicitly pinned trusted artifact reaches deserialization.
                    model = joblib.load(model_file)
                names = joblib.load(io.BytesIO(names_bytes))
            if (
                list(names) != FEATURES
                or list(model.feature_names_in_) != FEATURES
                or m["feature_order"] != FEATURES
            ):
                raise ValueError("Feature order mismatch")
            if not hasattr(model, "predict_proba"):
                raise ValueError("Estimator has no probability interface")
            labels = m.get("class_labels", {})
            if m["semantics_verified"] and (
                set(labels) != {str(c) for c in model.classes_}
                or set(labels.values()) != {"Slight", "Serious", "Fatal"}
                or m["speed_unit"] not in {"mph", "km/h"}
            ):
                raise ValueError("Verified metadata needs complete severity labels and speed units")
            model.n_jobs = 1
            self.model = model
            if self.settings.shap_enabled:
                try:
                    import shap

                    # Training path counts supply the background, not invented records.
                    self.explainer = (
                        BoundedForestExplainer(model)
                        if isinstance(model, sklearn.ensemble.RandomForestClassifier)
                        else shap.TreeExplainer(model, feature_perturbation="tree_path_dependent")
                    )
                except Exception:
                    logger.exception("shap_initialization_failed")
            logger.info("model_initialized version=%s", m["model_version"])
        except Exception:
            self.failure = "Model failed integrity or compatibility checks. See server logs."
            logger.exception("model_initialization_failed")

    def metadata(self):
        ids = [str(c) for c in self.model.classes_] if self.model is not None else []
        return {
            **{
                k: self.manifest[k]
                for k in [
                    "model_version",
                    "feature_order",
                    "semantics_verified",
                    "speed_unit",
                    "calibrated",
                    "provenance",
                    "limitations",
                ]
            },
            "algorithm": type(self.model).__name__ if self.model is not None else "Unavailable",
            "classes": [{"id": c, "label": self.label(c)} for c in ids],
            "operational_bounds": {"age": [16, 100], "speed_limit": [10, 140], "vehicles": [1, 20]},
            "category_source": "Existing UI codes; training codebook unavailable",
        }

    def label(self, class_id: str) -> str:
        return (
            self.manifest["class_labels"].get(class_id, f"Class {class_id}")
            if self.manifest["semantics_verified"]
            else f"Class {class_id}"
        )

    def frame(self, scenarios):
        return pd.DataFrame([s.model_dump() for s in scenarios], columns=FEATURES)

    def predict_many(self, scenarios: list[Scenario], explain=False):
        if self.model is None:
            raise ModelUnavailable("The model is not ready. Try again after service startup.")
        started = time.perf_counter()
        frame = self.frame(scenarios)
        with self.lock:
            matrix = self.model.predict_proba(frame)
        if (
            not np.isfinite(matrix).all()
            or np.any(matrix < 0)
            or not np.allclose(matrix.sum(axis=1), 1, atol=1e-6)
        ):
            raise RuntimeError("Invalid model probabilities")
        latency = (time.perf_counter() - started) * 1000 / len(scenarios)
        results = []
        ids = [str(c) for c in self.model.classes_]
        for row, scenario in zip(matrix, scenarios):
            class_index = int(np.argmax(row))
            probabilities = [
                {"class_id": c, "label": self.label(c), "probability": float(p)} for c, p in zip(ids, row)
            ]
            result = {
                "id": str(uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "model_version": self.manifest["model_version"],
                "scenario": scenario.model_dump(),
                "class_id": ids[class_index],
                "severity": self.label(ids[class_index]),
                "semantics_verified": self.manifest["semantics_verified"],
                "probabilities": probabilities,
                "confidence": float(row[class_index]),
                "calibrated": self.manifest["calibrated"],
                "risk_score": severity_index(probabilities, self.manifest["semantics_verified"]),
                "latency_ms": round(latency, 3),
                "explanation": None,
                "explanation_status": "not_requested",
                "saved": False,
            }
            if explain:
                if self.explainer is None:
                    result["explanation_status"] = "unavailable"
                else:
                    explain_started = time.perf_counter()
                    try:
                        result["explanation"] = self.explain(scenario, class_index, float(row[class_index]))
                        result["explanation_status"] = "available"
                    except Exception:
                        logger.exception("local_explanation_failed")
                        result["explanation_status"] = "unavailable"
                    result["latency_ms"] += round((time.perf_counter() - explain_started) * 1000, 3)
            results.append(result)
        return results

    def explain(self, scenario: Scenario, class_index: int, expected_output: float):
        with self.lock:
            values = np.asarray(self.explainer.shap_values(self.frame([scenario]), check_additivity=True))
        if values.shape != (1, len(FEATURES), len(self.model.classes_)):
            raise ValueError("Unexpected multiclass SHAP shape")
        contributions = values[0, :, class_index]
        base = float(np.asarray(self.explainer.expected_value)[class_index])
        if not np.isclose(base + contributions.sum(), expected_output, atol=1e-5):
            raise ValueError("SHAP additivity check failed")
        return {
            "class_id": str(self.model.classes_[class_index]),
            "base_value": base,
            "output_value": expected_output,
            "output_space": "class_probability",
            "method": "Tree SHAP / tree_path_dependent; background from fitted tree path counts",
            "contributions": [
                {"feature": f, "value": scenario.model_dump()[f], "contribution": float(v)}
                for f, v in zip(FEATURES, contributions)
            ],
        }
