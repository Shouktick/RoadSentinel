"""Validated Indian aggregate release; no model or foreign source fallback."""

import csv
import hashlib
import io
import json
import logging


class DataUnavailable(Exception):
    pass


class DatasetService:
    def __init__(self, settings):
        self.data = self.boundaries = None
        self.version = self.digest = None
        try:
            root = settings.release_dir
            manifest = json.loads((root / "india-manifest.json").read_text(encoding="utf-8"))
            assert manifest["country"] == "India" and manifest["model_version"] is None
            loaded = {}
            for name in ["india-analytics.json", "india-boundaries.json"]:
                blob = (root / name).read_bytes()
                assert hashlib.sha256(blob).hexdigest() == manifest["files"][name]
                loaded[name] = json.loads(blob)
            data = loaded["india-analytics.json"]
            boundaries = loaded["india-boundaries.json"]
            assert data["country"] == "India" and data["granularity"] == "state_ut_year"
            assert data["dataset_version"] == manifest["dataset_version"]
            assert len(data["records"]) == 108
            assert {r["state"] for r in data["records"]} == {
                f["properties"]["state"] for f in boundaries["features"]
            }
            self.data, self.boundaries = data, boundaries
            self.version, self.digest = manifest["dataset_version"], manifest["files"]["india-analytics.json"]
        except (OSError, KeyError, ValueError, AssertionError):
            logging.getLogger("roadsentinel.dataset").exception("india_release_unavailable")

    def require(self):
        if self.data is None:
            raise DataUnavailable(
                "Verified Indian aggregate data are unavailable. Please retry after deployment."
            )
        return self.data

    def overview(self):
        return self.require()

    def states(self, year):
        return {
            "country": "India",
            "dataset_version": self.version,
            "records": [r for r in self.require()["records"] if r["year"] == year],
        }

    def geography(self):
        data = self.require()
        return {
            "country": "India",
            "dataset_version": self.version,
            "kind": "state_ut_boundaries",
            "provenance": data["geography"],
            "geojson": self.boundaries,
        }

    def export(self, year=None):
        data = self.require()
        stream = io.StringIO(newline="")
        writer = csv.writer(stream)
        writer.writerow(
            [
                "country",
                "dataset_version",
                "state_or_union_territory",
                "calendar_year",
                "reported_accidents_count",
                "persons_killed_count",
                "persons_injured_count",
                "source_missing_note",
                "source_url",
            ]
        )
        for row in data["records"]:
            if year is None or row["year"] == year:
                writer.writerow(
                    [
                        "India",
                        self.version,
                        row["state"],
                        row["year"],
                        row["accidents"],
                        row["fatalities"],
                        row["injuries"],
                        json.dumps(row.get("source_missing", {})),
                        data["source_url"],
                    ]
                )
        return stream.getvalue()
