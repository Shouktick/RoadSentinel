"""Pure-Python inference for a checksum-verified, Indian linear research model."""

import csv
import hashlib
import io
import json
import math
import time
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException

from app.services.dataset import DataUnavailable


class KarnatakaModel:
    def __init__(self, root):
        self.model = self.metadata = self.analytics = None
        self.digest = None
        try:
            manifest = json.loads((root / "karnataka-manifest.json").read_text(encoding="utf-8"))
            assert manifest["country"] == "India"
            loaded = {}
            for name, digest in manifest["files"].items():
                assert name in {"karnataka-model.json", "karnataka-metadata.json", "karnataka-analytics.json"}
                raw = (root / name).read_bytes()
                assert hashlib.sha256(raw).hexdigest() == digest
                loaded[name] = json.loads(raw)
            m = loaded["karnataka-model.json"]
            assert m["country"] == "India" and m["region"] == "Karnataka"
            assert m["model_version"] == manifest["model_version"]
            self.model, self.metadata, self.analytics = (
                m,
                loaded["karnataka-metadata.json"],
                loaded["karnataka-analytics.json"],
            )
            self.digest = manifest["files"]["karnataka-model.json"]
        except (OSError, KeyError, ValueError, AssertionError):
            pass

    def require(self):
        if self.model is None:
            raise DataUnavailable("The verified Karnataka model is not ready. Please retry.")
        return self.model

    def validate(self, scenario):
        m = self.require()
        if not isinstance(scenario, dict) or set(scenario) != set(m["weights"]):
            raise HTTPException(
                422,
                "Use exactly the documented Karnataka scenario fields. Speed and foreign category codes are not model inputs.",
            )
        for key, value in scenario.items():
            if not isinstance(value, str) or value not in m["weights"][key]:
                raise HTTPException(422, f"Choose a documented value for {key}.")
        return dict(scenario)

    def predict(self, scenario, save=False):
        start = time.perf_counter()
        s = self.validate(scenario)
        m = self.require()
        scores = [
            m["intercept"][i] + sum(m["weights"][k][v][i] for k, v in s.items())
            for i in range(len(m["classes"]))
        ]
        exp = [math.exp(v - max(scores)) for v in scores]
        probabilities = [v / sum(exp) for v in exp]
        selected = max(range(len(scores)), key=scores.__getitem__)
        label = m["classes"][selected]
        base = m["intercept"][selected] + sum(v[selected] for v in m["reference"].values())
        contributions = [
            {
                "feature": k,
                "label": f["label"],
                "value": s[k],
                "contribution": m["weights"][k][s[k]][selected] - m["reference"][k][selected],
            }
            for f in self.metadata["features"]
            for k in [f["key"]]
        ]
        return {
            "id": str(uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "country": "India",
            "source_country": "India",
            "region": "Karnataka",
            "model_version": m["model_version"],
            "source_url": self.metadata["source_url"],
            "license": self.metadata["license"],
            "license_url": self.metadata["license_url"],
            "score_interpretation": "Uncalibrated model scores, not personal accident probabilities",
            "historical_only": False,
            "scenario": s,
            "class_id": label,
            "severity": label,
            "confidence": probabilities[selected],
            "risk_score": None,
            "saved": save,
            "probabilities": [
                {"class_id": c, "label": c, "probability": p} for c, p in zip(m["classes"], probabilities)
            ],
            "explanation": {
                "class": label,
                "base_value": base,
                "output_logit": scores[selected],
                "contributions": contributions,
                "units": "logit",
                "method": self.metadata["explanation"]["method"],
            },
            "latency_ms": (time.perf_counter() - start) * 1000,
        }

    def csv_rows(self, text):
        self.require()
        try:
            r = csv.DictReader(io.StringIO(text.lstrip("\ufeff")), strict=True)
            if (
                r.fieldnames is None
                or len(r.fieldnames) != len(set(r.fieldnames))
                or set(r.fieldnames) != set(self.model["weights"])
            ):
                raise HTTPException(422, "CSV headers must exactly match the downloaded scenario template.")
            rows = []
            for line, row in enumerate(r, 2):
                if len(rows) >= 500:
                    raise HTTPException(422, "A batch supports at most 500 scenarios.")
                try:
                    rows.append(self.validate(row))
                except HTTPException as exc:
                    raise HTTPException(422, f"CSV row {line}: {exc.detail}") from exc
            if not rows:
                raise HTTPException(422, "The CSV has no scenario rows.")
            return rows
        except csv.Error as exc:
            raise HTTPException(422, "The CSV could not be parsed.") from exc
