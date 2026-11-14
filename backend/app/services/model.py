"""Integrity-pinned inference and exact interventional Shapley explanations."""

import hashlib
import json
import logging
import math
import os
import threading
import time
from datetime import datetime, timezone
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
import sklearn
from app.domain import CATEGORIES, DEFINITIONS, FEATURES, FIELD_LABELS, LABELS

logger = logging.getLogger("roadsentinel.model")


class ModelUnavailable(Exception):
    pass


class ModelService:
    def __init__(self, settings):
        self.settings = settings
        self.manifest = json.loads(settings.model_manifest.read_text(encoding="utf-8"))
        self.model = None
        self.explainer = None
        self.background = None
        self.failure = None
        self.lock = threading.Lock()

    def initialize(self):
        try:
            m = self.manifest
            if (
                m["class_labels"] != {str(code): label for code, label in LABELS.items()}
                or m["class_definitions"] != DEFINITIONS
                or m["speed_unit"] != "mph"
            ):
                raise ValueError("Manifest does not match the reviewed source semantics")
            if sklearn.__version__ != m["sklearn_version"]:
                raise ValueError("Model runtime version does not match its manifest")
            path = self.settings.model_archive
            if path.stat().st_size > 15 * 1024 * 1024:
                raise ValueError("Artifact exceeds serving budget")
            if hashlib.sha256(path.read_bytes()).hexdigest() != m["artifact_sha256"]:
                raise ValueError("Model artifact checksum mismatch")
            bundle = joblib.load(path)
            model = bundle["model"]
            if (
                bundle["features"] != FEATURES
                or m["feature_order"] != FEATURES
                or list(model.feature_names_in_) != FEATURES
            ):
                raise ValueError("Feature order mismatch")
            if bundle["model_version"] != m["model_version"]:
                raise ValueError("Artifact model version mismatch")
            if set(str(c) for c in model.classes_) != set(m["class_labels"]):
                raise ValueError("Class mapping mismatch")
            self.background = bundle["background"][FEATURES].to_numpy()
            self.model = model
            self.explainer = self if self.settings.shap_enabled else None
            logger.info("model_initialized version=%s sha256=%s", m["model_version"], m["artifact_sha256"])
        except Exception:
            self.model = None
            self.failure = "Model failed integrity or compatibility checks. See server logs."
            logger.exception("model_initialization_failed")

    def metadata(self):
        return {
            **self.manifest,
            "classes": [{"id": c, "label": label} for c, label in self.manifest["class_labels"].items()],
            "category_source": self.manifest["source"]["files"]["codebook.xlsx"]["url"],
            "input_labels": FIELD_LABELS,
            "categories": CATEGORIES,
        }

    def frame(self, scenarios):
        return pd.DataFrame([s.model_dump() for s in scenarios], columns=FEATURES)

    def predict_many(self, scenarios, explain=False):
        if self.model is None:
            raise ModelUnavailable("The service is waking up. Please wait about a minute and try again.")
        started = time.perf_counter()
        with self.lock:
            matrix = self.model.predict_proba(self.frame(scenarios))
        if (
            not np.isfinite(matrix).all()
            or np.any(matrix < 0)
            or not np.allclose(matrix.sum(axis=1), 1, atol=1e-6)
        ):
            raise RuntimeError("Invalid model probabilities")
        latency = (time.perf_counter() - started) * 1000 / len(scenarios)
        ids = [str(c) for c in self.model.classes_]
        results = []
        for row, scenario in zip(matrix, scenarios):
            index = int(np.argmax(row))
            result = {
                "id": str(uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "model_version": self.manifest["model_version"],
                "artifact_sha256": self.manifest["artifact_sha256"],
                "code_version": os.getenv("RENDER_GIT_COMMIT", "local"),
                "schema_version": 2,
                "scenario": scenario.model_dump(),
                "class_id": ids[index],
                "severity": self.manifest["class_labels"][ids[index]],
                "semantics_verified": True,
                "class_definitions": DEFINITIONS,
                "speed_unit": "mph",
                "probabilities": [
                    {"class_id": c, "label": self.manifest["class_labels"][c], "probability": float(p)}
                    for c, p in zip(ids, row)
                ],
                "confidence": float(row[index]),
                "calibrated": self.manifest["calibrated"],
                "risk_score": None,
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
                    result["explanation"] = self.explain(scenario, index, float(row[index]))
                    result["explanation_status"] = "available"
                    result["latency_ms"] += round((time.perf_counter() - explain_started) * 1000, 3)
            results.append(result)
        return results

    def explain(self, scenario, class_index, expected_output):
        # Exact enumeration of every coalition of the eight ORIGINAL inputs.
        # Each coalition replaces absent features with each of 16 real fit rows.
        # This explains the complete pipeline, including calibration when selected.
        n = len(FEATURES)
        masks = np.arange(2**n)
        present = (masks[:, None] & (1 << np.arange(n))) != 0
        values = np.asarray([scenario.model_dump()[f] for f in FEATURES])
        hybrid = np.where(present[:, None, :], values[None, None, :], self.background[None, :, :])
        with self.lock:
            probabilities = self.model.predict_proba(pd.DataFrame(hybrid.reshape(-1, n), columns=FEATURES))
        coalition = probabilities.reshape(2**n, len(self.background), -1).mean(axis=1)[:, class_index]
        contributions = np.zeros(n)
        for feature in range(n):
            for mask in masks[~present[:, feature]]:
                size = int(mask).bit_count()
                weight = 1 / (n * math.comb(n - 1, size))
                contributions[feature] += weight * (coalition[mask | (1 << feature)] - coalition[mask])
        base = float(coalition[0])
        if not np.isclose(base + contributions.sum(), expected_output, atol=1e-8):
            raise ValueError("Shapley additivity check failed")
        return {
            "class_id": str(self.model.classes_[class_index]),
            "base_value": base,
            "output_value": expected_output,
            "output_space": "class_probability",
            "method": "Exact interventional Shapley values; all 256 input coalitions; 16 seeded real training reference rows; complete serving pipeline",
            "reference_rows": len(self.background),
            "contributions": [
                {"feature": f, "value": scenario.model_dump()[f], "contribution": float(v)}
                for f, v in zip(FEATURES, contributions)
            ],
        }
