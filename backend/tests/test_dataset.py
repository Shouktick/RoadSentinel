import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import Settings
from app.services.dataset import DatasetService


def test_published_totals_reconcile_and_records_are_aggregates():
    d = DatasetService(Settings()).overview()
    assert d["granularity"] == "state_ut_year"
    for total in d["national"]:
        rows = [r for r in d["records"] if r["year"] == total["year"]]
        assert len(rows) == 36 and len({r["state"] for r in rows}) == 36
        for metric in ["accidents", "fatalities", "injuries"]:
            assert sum(r[metric] or 0 for r in rows) == total[metric]
    assert "speed_limit" not in json.dumps(d["records"])
    assert d["source_sha256"] == "901505420d5b387052ac51e36b4bdce0274f6326b614f9ebcee6e7954d45b5b0"


def test_release_has_no_model_or_foreign_analytics():
    root = Settings().release_dir
    assert {p.name for p in root.iterdir()} == {
        "india-analytics.json",
        "india-boundaries.json",
        "india-manifest.json",
    }
    m = json.loads((root / "india-manifest.json").read_text())
    for name, digest in m["files"].items():
        assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest
