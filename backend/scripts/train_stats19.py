# ruff: noqa: E402
# Native thread limits and backend import path must be set before sklearn imports.
"""Offline only: python scripts/train_stats19.py train | evaluate | all.

Selection uses 2022 only. Evaluate opens 2023 after the selected model is frozen.
No fitting, download, or source-data scan occurs at web startup.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.calibration import CalibratedClassifierCV
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    log_loss,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder
from app.domain import CATEGORIES, DEFINITIONS, FEATURES, FIELD_LABELS, LABELS, DEFAULTS, prepare
from download_data import main as verify_sources
from verify_codebook import main as verify_codebook

SEED = 20261114
OUT = ROOT / "release"
VERSION = "stats19-gb-2022-v1"
SOURCE = json.loads((ROOT / "source-manifest.json").read_text(encoding="utf-8"))


def write(name, value):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(year):
    filename = f"collisions-{year}.csv"
    path = ROOT / "data" / "source" / filename
    assert sha(path) == SOURCE["files"][filename]["sha256"], "Source checksum mismatch"
    frame = pd.read_csv(path, low_memory=False)
    assert frame.collision_index.is_unique, "Repeated collision ID: review before splitting"
    assert frame.collision_year.eq(year).all()
    assert frame.collision_severity.isin(LABELS).all()
    return frame


def counts(y):
    return {LABELS[c]: int((np.asarray(y) == c).sum()) for c in LABELS}


def score(model, x, y):
    p = model.predict_proba(x)
    pred = model.classes_[p.argmax(axis=1)]
    truth = np.asarray(y)
    onehot = (truth[:, None] == model.classes_[None, :]).astype(float)
    # Multiclass Brier: sum of three squared errors per example (range 0..2).
    confidence, correct = p.max(axis=1), pred == truth
    reliability = []
    for low in np.arange(0, 1, 0.1):
        mask = (confidence >= low) & (confidence < low + 0.1 + (1e-10 if low > 0.89 else 0))
        if mask.any():
            reliability.append(
                {
                    "lower": round(float(low), 1),
                    "count": int(mask.sum()),
                    "mean_probability": float(confidence[mask].mean()),
                    "observed_correct": float(correct[mask].mean()),
                }
            )
    return {
        "accuracy": float(accuracy_score(y, pred)),
        "macro_f1": float(f1_score(y, pred, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(y, pred, average="weighted", zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y, pred)),
        "log_loss": float(log_loss(y, p, labels=model.classes_)),
        "brier_multiclass": float(np.mean(np.sum((p - onehot) ** 2, axis=1))),
        "ece_10_bins": float(
            sum(r["count"] * abs(r["mean_probability"] - r["observed_correct"]) for r in reliability) / len(y)
        ),
        "reliability": reliability,
        "class_counts": counts(y),
        "confusion_matrix": confusion_matrix(y, pred, labels=list(LABELS)).tolist(),
        "classification_report": classification_report(
            y,
            pred,
            labels=list(LABELS),
            target_names=list(LABELS.values()),
            output_dict=True,
            zero_division=0,
        ),
    }


def train():
    verify_sources()
    verify_codebook()
    OUT.mkdir(exist_ok=True)
    frame = load(2022).sort_values("collision_index").reset_index(drop=True)
    x, y = prepare(frame), frame.collision_severity
    fit_idx, reserve = train_test_split(np.arange(len(frame)), test_size=0.4, stratify=y, random_state=SEED)
    cal_idx, val_idx = train_test_split(
        reserve, test_size=0.5, stratify=y.iloc[reserve], random_state=SEED + 1
    )
    split = {"fit_2022": fit_idx, "calibration_2022": cal_idx, "validation_2022": val_idx}
    split_info = {
        name: {
            "size": len(idx),
            "class_counts": counts(y.iloc[idx]),
            "collision_ids_sha256": hashlib.sha256(
                "\n".join(frame.iloc[idx].collision_index).encode()
            ).hexdigest(),
        }
        for name, idx in split.items()
    }
    write("split.json", split_info)
    candidates = {
        "prior_baseline": DummyClassifier(strategy="prior"),
        "logistic": LogisticRegression(C=1.0, max_iter=1000, random_state=SEED),
        "logistic_balanced": LogisticRegression(
            C=1.0, class_weight="balanced", max_iter=1000, random_state=SEED
        ),
        "forest_balanced": RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_leaf=40,
            max_features=0.8,
            class_weight="balanced_subsample",
            n_jobs=1,
            random_state=SEED,
        ),
    }
    compared, fitted = [], {}
    for name, estimator in candidates.items():
        started = time.perf_counter()
        encoder = OneHotEncoder(
            categories=[sorted(CATEGORIES[f]) for f in FEATURES],
            handle_unknown="error",
            sparse_output=True,
            dtype=np.float64,
        )
        pipeline = make_pipeline(encoder, estimator)
        pipeline.fit(x.iloc[fit_idx], y.iloc[fit_idx])
        raw = score(pipeline, x.iloc[val_idx], y.iloc[val_idx])
        row = {"candidate": name, "validation": raw, "fit_seconds": time.perf_counter() - started}
        if name != "prior_baseline":
            calibrated = CalibratedClassifierCV(FrozenEstimator(pipeline), method="sigmoid")
            calibrated.fit(x.iloc[cal_idx], y.iloc[cal_idx])
            calibrated_score = score(calibrated, x.iloc[val_idx], y.iloc[val_idx])
            # Probability estimates are the product: calibrate only if both proper scores improve.
            use_cal = (
                calibrated_score["log_loss"] < raw["log_loss"]
                and calibrated_score["brier_multiclass"] < raw["brier_multiclass"]
            )
            row.update(calibrated_validation=calibrated_score, calibration_selected=use_cal)
            fitted[name] = calibrated if use_cal else pipeline
            chosen = calibrated_score if use_cal else raw
        else:
            chosen = raw
            row["calibration_selected"] = False
            fitted[name] = pipeline
        row["validation_macro_f1"] = chosen["macro_f1"]
        row["selected_log_loss"] = chosen["log_loss"]
        compared.append(row)
        print(
            name,
            "macro F1",
            row["validation_macro_f1"],
            "log loss",
            row["selected_log_loss"],
            "calibrated",
            row["calibration_selected"],
            flush=True,
        )
    eligible = [r for r in compared if r["candidate"] != "prior_baseline"]
    winner = min(eligible, key=lambda r: (r["selected_log_loss"], -r["validation_macro_f1"]))
    selected = fitted[winner["candidate"]]
    # Real training rows, sampled without label balancing. 16-row reference distribution.
    reference_idx = np.random.default_rng(SEED).choice(fit_idx, size=16, replace=False)
    bundle = {
        "model": selected,
        "background": x.iloc[reference_idx].reset_index(drop=True),
        "features": FEATURES,
        "model_version": VERSION,
    }
    joblib.dump(bundle, OUT / "model.joblib", compress=3)
    joblib.dump(fitted["prior_baseline"], ROOT / "data" / "baseline.joblib", compress=3)
    write(
        "selection.json",
        {
            "selected_model": winner["candidate"],
            "comparison": compared,
            "rule": "Lowest validation log loss (probability estimation is the product); ties use higher macro F1. Calibration only if validation log loss and Brier both improve. Class-weighted models are compared honestly, including their uncalibrated probability distortion.",
            "test_used_for_selection": False,
        },
    )
    manifest = {
        "model_version": VERSION,
        "artifact_sha256": sha(OUT / "model.joblib"),
        "artifact_bytes": (OUT / "model.joblib").stat().st_size,
        "sklearn_version": sklearn.__version__,
        "feature_order": FEATURES,
        "semantics_verified": True,
        "class_labels": {str(k): v for k, v in LABELS.items()},
        "class_definitions": DEFINITIONS,
        "speed_unit": "mph",
        "calibrated": winner["calibration_selected"],
        "algorithm": winner["candidate"],
        "provenance": SOURCE["dataset"],
        "coverage": "Great Britain (England, Scotland and Wales), police-recorded injury collisions on public roads. Not India or Northern Ireland.",
        "target": "Severity of the most severely injured casualty in a recorded injury collision.",
        "seed": SEED,
        "source": SOURCE,
        "explanation_background_rows": 16,
        "limitations": [
            "Conditional on a police-recorded injury crash; does not estimate whether a crash will occur.",
            "Fatal injuries are rare; see per-class recall before interpreting the most likely outcome.",
            "Police reporting and severity recording differ by force and year. Non-fatal injuries are under-reported.",
            "Only eight road/time inputs; no vehicle, occupant, traffic exposure or actual driving speed.",
            "2022 training and 2023 testing do not establish accuracy in India or in later years.",
            "Explanations describe model associations, not causes. Some hypothetical combinations are unrealistic.",
            "Educational exploration only; unsuitable for emergency, individual safety, enforcement or insurance decisions.",
        ],
    }
    write("model_metadata.json", manifest)
    (ROOT.parent / "frontend" / "src" / "lib" / "domain.json").write_text(
        json.dumps(
            {
                "features": FEATURES,
                "labels": FIELD_LABELS,
                "options": {k: list(v.items()) for k, v in CATEGORIES.items()},
                "defaults": DEFAULTS,
                "definitions": DEFINITIONS,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print("Frozen selection:", winner["candidate"], manifest["artifact_sha256"], flush=True)


def evaluate():
    manifest = json.loads((OUT / "model_metadata.json").read_text(encoding="utf-8"))
    assert sha(OUT / "model.joblib") == manifest["artifact_sha256"]
    bundle = joblib.load(OUT / "model.joblib")
    frame = load(2023).sort_values("collision_index").reset_index(drop=True)
    x, y = prepare(frame), frame.collision_severity
    selection = json.loads((OUT / "selection.json").read_text(encoding="utf-8"))
    result = {
        **score(bundle["model"], x, y),
        "model_version": VERSION,
        "dataset_sha256": SOURCE["files"]["collisions-2023.csv"]["sha256"],
        "evaluation_set": "held_out_test",
        "test_size": len(y),
        "class_labels": list(LABELS.values()),
        "split": "2022 stratified 60% fit / 20% calibration / 20% validation; all 2023 held out for test",
        "splits": json.loads((OUT / "split.json").read_text()),
        **selection,
        "baseline_test": score(joblib.load(ROOT / "data" / "baseline.joblib"), x, y),
    }
    write("metrics.json", result)
    # Runtime ships aggregates only; no individual coordinates or raw source records.
    provenance = {
        "source": "DfT STATS19, Great Britain, 2023",
        "sha256": result["dataset_sha256"],
        "record_count": len(frame),
    }
    overview = {
        "provenance": provenance,
        "model_version": VERSION,
        "row_count": len(frame),
        "distribution": [{"label": label, "count": int((y == c).sum())} for c, label in LABELS.items()],
        "missing_values": int((x == -1).sum().sum()),
        "duplicate_rows": int(frame.duplicated().sum()),
    }
    dimensions = {
        "weather": "weather_conditions",
        "road-surface": "road_surface_conditions",
        "lighting": "light_conditions",
        "road-type": "road_type",
        "area-type": "urban_or_rural_area",
        "speed-bands": "speed_limit",
        "hourly": "hour",
        "weekday": "day_of_week",
    }
    aggregates = {}
    for dimension, column in dimensions.items():
        groups = x.assign(severity=y).groupby([column, "severity"]).size()
        aggregates[dimension] = {
            "provenance": provenance,
            "model_version": VERSION,
            "denominator": len(frame),
            "dimension": dimension,
            "items": [
                {"group": CATEGORIES[column][int(code)], "label": LABELS[int(severity)], "count": int(n)}
                for (code, severity), n in groups.items()
            ],
        }
    # WGS84 source coordinates -> 0.1 degree cells. Suppress fewer than 5 records.
    geo = frame.loc[frame.latitude.between(49, 61) & frame.longitude.between(-9, 3)].copy()
    geo["lat_bin"] = np.floor(geo.latitude * 10).astype(int)
    geo["lng_bin"] = np.floor(geo.longitude * 10).astype(int)
    groups = geo.groupby(["lat_bin", "lng_bin"]).size()
    cells = [
        {"lat": round((a + 0.5) / 10, 2), "lng": round((b + 0.5) / 10, 2), "count": int(n)}
        for (a, b), n in groups.items()
        if n >= 5
    ]
    geography = {
        "provenance": provenance,
        "model_version": VERSION,
        "items": cells,
        "total": len(frame),
        "valid_coordinates": len(geo),
        "displayed_records": sum(c["count"] for c in cells),
        "cell_degrees": 0.1,
        "minimum_cell_count": 5,
        "coverage": "Great Britain, 2023",
        "coordinate_system": "WGS84 source latitude/longitude",
    }
    write("analytics.json", {"overview": overview, "aggregates": aggregates, "geography": geography})
    print(
        "Held-out test:",
        json.dumps(
            {
                k: result[k]
                for k in [
                    "test_size",
                    "macro_f1",
                    "balanced_accuracy",
                    "log_loss",
                    "brier_multiclass",
                    "confusion_matrix",
                ]
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["train", "evaluate", "all"])
    command = parser.parse_args().command
    if command in {"train", "all"}:
        train()
    if command in {"evaluate", "all"}:
        evaluate()
