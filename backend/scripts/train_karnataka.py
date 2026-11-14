"""Offline, temporal evaluation of the licensed Karnataka crash publication.

Only categorical context enters the model. No narratives, identifiers, coordinates,
casualty counts, cause assessments or severity proxies enter training or artifacts.
"""

import csv
import hashlib
import io
import json
from collections import Counter
from pathlib import Path
import zipfile

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parents[1]
VERSION = "india-karnataka-2016-2023-v1"
SOURCE_SHA = "fa841b6c420ee4a06ef7a9c4b12bb0de6c0f75123abf7c96882c88162d435134"
FEATURES = {
    "district": ("DISTRICTNAME", "Karnataka police district / unit"),
    "road_type": ("Road_Type", "Road type"),
    "weather": ("Weather", "Weather"),
    "surface": ("Surface_Condition", "Road surface condition"),
    "road_character": ("Road_Character", "Road geometry"),
    "junction": ("Junction_Control", "Junction control"),
    "location": ("Accident_Location", "Area type"),
}
CLASSES = ["Damage Only", "Simple Injury", "Grievous Injury", "Fatal"]
UNKNOWN = "Other / unknown"
PROVENANCE = {
    "source_url": "https://www.kaggle.com/datasets/shubham2703/karnataka-accident-dataset",
    "attribution": "Shubham Sharma, Karnataka Accident Dataset v2; RoadSentinel derived research artifacts",
    "license": "CC BY-NC-SA 4.0",
    "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "modifications": "Filtered, deduplicated and aggregated records; fitted categorical linear research model. Raw personal data excluded.",
}


def save(path, value):
    path.write_bytes((json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode())


def metrics(y, pred):
    return {
        "macro_f1": float(f1_score(y, pred, average="macro", zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y, pred)),
        "confusion_matrix": confusion_matrix(y, pred, labels=CLASSES).tolist(),
        "per_class": classification_report(y, pred, labels=CLASSES, output_dict=True, zero_division=0),
        "predicted_counts": dict(Counter(pred)),
        "n": len(y),
    }


def main():
    source = ROOT / "data/source/karnataka/download.zip"
    assert hashlib.sha256(source.read_bytes()).hexdigest() == SOURCE_SHA
    counts = Counter()
    records = {}
    conflicts = set()
    with zipfile.ZipFile(source) as z:
        reader = csv.DictReader(
            io.StringIO(z.read("Copy of AccidentReports.csv").decode("cp1252", errors="replace"))
        )
        for r in reader:
            counts["raw_rows"] += 1
            if None in r or any(v is None for v in r.values()):
                counts["malformed"] += 1
                continue
            if r["Accident_Classification"] != "Road Accidents":
                counts["not_classified_road_accident"] += 1
                continue
            if r["Severity"] not in CLASSES or r["Year"] not in [str(y) for y in range(2016, 2024)]:
                counts["invalid_outcome_or_year"] += 1
                continue
            # The republisher rounded long Crime_No values into scientific notation.
            # They are not usable identifiers. Deduplicate by normalized narrative
            # and police unit across ALL years before splitting; never model text.
            narrative = " ".join(r["Accident_Description"].split()).casefold()
            if len(narrative) < 40 or narrative in {"not applicable", "null"}:
                counts["insufficient_event_identity"] += 1
                continue
            key = hashlib.sha256(
                (r["DISTRICTNAME"] + "|" + r["UNITNAME"] + "|" + narrative).encode()
            ).hexdigest()
            if key in records:
                counts["duplicate_key"] += 1
                if records[key]["Severity"] != r["Severity"]:
                    conflicts.add(key)
                elif int(r["Year"]) < int(records[key]["Year"]):
                    records[key] = r
                continue
            records[key] = r
    counts["conflicting_keys_removed"] = len(conflicts)
    rows = [r for k, r in records.items() if k not in conflicts]
    counts["retained"] = len(rows)
    train = [r for r in rows if int(r["Year"]) <= 2021]
    valid = [r for r in rows if r["Year"] == "2022"]
    test = [r for r in rows if r["Year"] == "2023"]
    # Vocabulary/frequency decisions are made on training years only.
    vocab = {}
    for key, (column, _) in FEATURES.items():
        frequency = Counter(r[column].strip() for r in train)
        vocab[key] = sorted(
            v for v, n in frequency.items() if n >= 100 and v not in {"NULL", "Not Applicable", "", "Others"}
        )
        if key == "weather":
            vocab[key] = [v for v in vocab[key] if v not in {"Snow", "Hail or Sleet"}]
        vocab[key].append(UNKNOWN)

    def transform(items):
        return np.array(
            [
                [r[c].strip() if r[c].strip() in vocab[k] else UNKNOWN for k, (c, _) in FEATURES.items()]
                for r in items
            ]
        )

    encoder = OneHotEncoder(categories=list(vocab.values()), handle_unknown="error", sparse_output=True)
    x = encoder.fit_transform(transform(train))
    xv, xt = encoder.transform(transform(valid)), encoder.transform(transform(test))
    y = np.array([r["Severity"] for r in train])
    yv, yt = np.array([r["Severity"] for r in valid]), np.array([r["Severity"] for r in test])
    majority = Counter(y).most_common(1)[0][0]
    candidates = []
    models = []
    for c in [0.1, 1.0, 10.0]:
        model = LogisticRegression(
            C=c, class_weight="balanced", solver="lbfgs", max_iter=600, random_state=42
        )
        model.fit(x, y)
        result = metrics(yv, model.predict(xv))
        candidates.append({"C": c, "validation": result})
        models.append(model)
        print(
            "validation",
            c,
            result["macro_f1"],
            result["balanced_accuracy"],
            result["predicted_counts"],
            "true",
            Counter(yv),
            "classes",
            model.classes_,
            "rows",
            len(train),
            len(valid),
            len(test),
            flush=True,
        )
    best = max(range(len(candidates)), key=lambda i: candidates[i]["validation"]["macro_f1"])
    model = models[best]
    result = metrics(yt, model.predict(xt))
    baseline = metrics(yt, np.full(len(yt), majority))

    # Diagnostics only: do not recalibrate, select or refit using the test set.
    def probability_quality(probabilities):
        targets = np.array([[float(label == c) for c in model.classes_] for label in yt])
        return {
            "multiclass_brier_sum": float(np.mean(np.sum((probabilities - targets) ** 2, axis=1))),
            "log_loss": float(-np.mean(np.sum(targets * np.log(np.clip(probabilities, 1e-15, 1)), axis=1))),
            "definition": "Brier is the sum across four classes (range 0-2); log loss clips zero scores at 1e-15. Lower is better. No calibration is claimed.",
        }

    result["probability_quality"] = probability_quality(model.predict_proba(xt))
    baseline["probability_quality"] = probability_quality(
        np.tile([float(c == majority) for c in model.classes_], (len(yt), 1))
    )
    assert len(result["predicted_counts"]) == 4
    assert result["macro_f1"] > baseline["macro_f1"] + 0.03
    assert result["balanced_accuracy"] > 0.30
    assert all(result["per_class"][c]["recall"] > 0.02 for c in CLASSES)
    # Portable exact linear model, no pickle or ML import in the serving process.
    weights, reference = {}, {}
    offset = 0
    means = np.asarray(x.mean(axis=0)).ravel()
    for k, categories in vocab.items():
        width = len(categories)
        weights[k] = {v: model.coef_[:, offset + i].tolist() for i, v in enumerate(categories)}
        reference[k] = (model.coef_[:, offset : offset + width] @ means[offset : offset + width]).tolist()
        offset += width
    artifact = {
        **PROVENANCE,
        "country": "India",
        "region": "Karnataka",
        "model_version": VERSION,
        "classes": model.classes_.tolist(),
        "weights": weights,
        "intercept": model.intercept_.tolist(),
        "reference": reference,
    }
    release = ROOT / "release"
    save(release / "karnataka-model.json", artifact)
    # Evaluate the portable representation against sklearn on held-out inputs.
    portable = []
    for values in transform(test):
        scores = np.array(artifact["intercept"])
        for k, v in zip(FEATURES, values):
            scores += artifact["weights"][k][v]
        portable.append(artifact["classes"][int(np.argmax(scores))])
    assert np.array_equal(portable, model.predict(xt))
    metadata = {
        "country": "India",
        "region": "Karnataka",
        "model_version": VERSION,
        "model_available": True,
        "status": "research",
        "source_url": "https://www.kaggle.com/datasets/shubham2703/karnataka-accident-dataset",
        "source": "Karnataka Accident Dataset v2, published by Shubham Sharma; corroborated against KSP Datathon accident-file sample",
        "source_sha256": SOURCE_SHA,
        "license": "CC BY-NC-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        "features": [
            {
                "key": k,
                "label": label,
                "options": vocab[k],
                "default": Counter(transform(train)[:, i]).most_common(1)[0][0],
            }
            for i, (k, (_, label)) in enumerate(FEATURES.items())
        ],
        "classes": CLASSES,
        "algorithm": "Class-balanced multinomial logistic regression",
        "selected_C": candidates[best]["C"],
        "evaluation": result,
        "baseline": baseline,
        "selection": candidates,
        "cleaning": dict(counts),
        "split": {"training_2016_2021": len(train), "validation_2022": len(valid), "test_2023": len(test)},
        "year_counts": dict(Counter(r["Year"] for r in rows)),
        "limitations": [
            "Research estimates conditional on a reported crash; not the probability that a crash will occur.",
            "Karnataka police-unit coverage only. No validated generalization to other Indian states.",
            "Class balancing changes the model's prior: displayed probabilities are model scores, not calibrated personal risk.",
            "Source labels and context fields contain recording inconsistencies. Uncommon, missing and implausible snow categories are grouped as Other / unknown using training-only rules.",
            "No measured speed is present. Speed exploration uses a separate physical calculation, never a fabricated model input.",
            "No causal conclusions, safe-speed recommendation or emergency-response recommendation is made.",
        ],
        "capabilities": [
            "severity_prediction",
            "batch_prediction",
            "scenario_comparison",
            "linear_shap",
            "saved_history",
            "speed_physics",
            "state_ut_analytics",
            "regional_map",
        ],
    }
    metadata["explanation"] = {
        "method": "Exact interventional linear SHAP on class logits, with the training marginal distribution as background",
        "units": "logit contribution (not probability points and not causal effects)",
        "global": {
            label: [
                {
                    "feature": k,
                    "label": FEATURES[k][1],
                    "mean_absolute_shap": float(
                        sum(
                            means[sum(len(vocab[p]) for p in list(vocab)[: list(vocab).index(k)]) + j]
                            * abs(weights[k][v][i] - reference[k][i])
                            for j, v in enumerate(vocab[k])
                        )
                    ),
                }
                for k in FEATURES
            ]
            for i, label in enumerate(artifact["classes"])
        },
    }
    metadata["limitations"].append(
        "Republished Crime_No identifiers lost precision. Event groups use normalized narrative plus police unit before temporal splitting; short/missing narratives and conflicting labels are excluded. This introduces selection bias; residual near-duplicates may remain."
    )
    from shapely.geometry import Point, shape

    boundaries = json.loads((release / "india-boundaries.json").read_text(encoding="utf-8"))
    region = shape(
        next(f["geometry"] for f in boundaries["features"] if f["properties"]["state"] == "Karnataka")
    )
    cells = {}
    valid_geo = 0
    for r in rows:
        try:
            lat, lon = float(r["Latitude"]), float(r["Longitude"])
            if not region.covers(Point(lon, lat)):
                continue
        except ValueError:
            continue
        valid_geo += 1
        lat0, lon0 = np.floor(lat * 10) / 10, np.floor(lon * 10) / 10
        key = (float(lat0), float(lon0))
        cells.setdefault(key, Counter())[r["Severity"]] += 1
    crash_analytics = {
        **PROVENANCE,
        "country": "India",
        "region": "Karnataka",
        "dataset_version": VERSION,
        "scope": "Filtered crash-record sample, 2016-2023. Not statewide official totals or exposure-adjusted risk.",
        "records": len(rows),
        "years": metadata["year_counts"],
        "classes": dict(Counter(r["Severity"] for r in rows)),
        "districts": [
            {"district": d, "count": n} for d, n in Counter(r["DISTRICTNAME"] for r in rows).most_common()
        ],
        "geography": {
            "coordinate_records_inside_boundary": valid_geo,
            "minimum_cell_count": 5,
            "cell_size_degrees": 0.1,
            "note": "0.1-degree cells containing at least 5 source records, restricted to illustrative Karnataka geometry. Counts across 2016-2023; not point locations or driving risk.",
        },
        "cells": [
            {
                "bounds": [[lat, lon], [round(lat + 0.1, 1), round(lon + 0.1, 1)]],
                "count": sum(c.values()),
                "fatal": c["Fatal"],
            }
            for (lat, lon), c in sorted(cells.items())
            if sum(c.values()) >= 5
        ],
    }
    save(release / "karnataka-analytics.json", crash_analytics)
    save(release / "karnataka-metadata.json", metadata)
    manifest = {
        "country": "India",
        "model_version": VERSION,
        "files": {
            n: hashlib.sha256((release / n).read_bytes()).hexdigest()
            for n in ["karnataka-model.json", "karnataka-metadata.json", "karnataka-analytics.json"]
        },
    }
    save(release / "karnataka-manifest.json", manifest)
    print(
        json.dumps(
            {"cleaning": counts, "split": metadata["split"], "model": result, "baseline": baseline}, indent=2
        )
    )


if __name__ == "__main__":
    main()
