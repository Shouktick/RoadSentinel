"""Only offline, source-derived aggregates are loaded in the web process."""

import json
from pathlib import Path


class DataUnavailable(Exception):
    pass


class DatasetService:
    def __init__(self, settings):
        self.path = Path(__file__).resolve().parents[2] / "release" / "analytics.json"
        self.data = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else None

    def require(self):
        if self.data is None:
            raise DataUnavailable("Source aggregates are unavailable. Please retry after deployment.")
        return self.data

    def overview(self):
        return self.require()["overview"]

    def aggregate(self, dimension):
        if dimension not in self.require()["aggregates"]:
            raise DataUnavailable("This dimension is not supported by the collision dataset.")
        return self.data["aggregates"][dimension]

    def hotspots(self):
        return self.require()["geography"]
