import csv
import io
import json
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import Settings
from app.main import create_app

TOKEN = "a" * 64
AUTH = {"Authorization": "Bearer " + TOKEN}


@pytest.fixture
def client():
    with TestClient(create_app(Settings(database_url="sqlite:///:memory:"))) as c:
        yield c


def test_health_is_analytics_readiness_not_model_readiness(client):
    r = client.get("/health")
    assert r.status_code == 200
    h = r.json()
    assert h["ready"] and h["analytics_ready"] and h["country"] == "India"
    assert not h["model_available"] and not h["severity_ready"] and h["model_version"] is None
    assert h["dataset_version"] == "india-morth-2023-v1"
    assert len(h["artifact_sha256"]) == 64


@pytest.mark.parametrize(
    "path",
    [
        "/predict",
        "/predict/whatif",
        "/predict/speed-sweep",
        "/predict/batch",
        "/predict-batch",
        "/batch/preview",
        "/explain/local",
    ],
)
def test_inference_disabled_for_any_payload_and_alias(client, path):
    for prefix in ["", "/api/v1"]:
        r = client.post(prefix + path, json={"scenario": {"speed_limit": 30}, "save": True}, headers=AUTH)
        assert r.status_code == 410, (path, r.text)
        assert r.json()["error"]["code"] == "INDIA_MODEL_UNAVAILABLE"
        assert r.json()["model_version"] is None
    assert client.get("/predictions", headers=AUTH).json()["total"] == 0


def test_no_foreign_evaluation_or_explanation(client):
    for path in ["/metrics", "/model-metrics", "/explain/global"]:
        assert client.get(path).status_code == 410
    m = client.get("/model/metadata").json()
    assert m["evaluation"] is None and m["country"] == "India"
    assert client.get("/insights/weather").status_code == 404


def test_real_totals_and_csv_units_missing_and_version(client):
    data = client.get("/insights/overview").json()
    assert len(data["records"]) == 108
    assert data["national"][-1] == {
        "year": 2023,
        "accidents": 480583,
        "fatalities": 172890,
        "injuries": 462825,
    }
    rows = list(csv.DictReader(io.StringIO(client.get("/insights/export?year=2023").text)))
    assert len(rows) == 36 and all(r["country"] == "India" for r in rows)
    assert all(r["dataset_version"] == data["dataset_version"] for r in rows)
    tn = next(r for r in rows if r["state_or_union_territory"] == "Tamil Nadu")
    assert (tn["reported_accidents_count"], tn["persons_killed_count"], tn["persons_injured_count"]) == (
        "67213",
        "18347",
        "72292",
    )
    ld = next(r for r in rows if r["state_or_union_territory"] == "Lakshadweep")
    assert ld["persons_killed_count"] == "" and json.loads(ld["source_missing_note"])["fatalities"] == "-"
    assert len(list(csv.DictReader(io.StringIO(client.get("/insights/export").text)))) == 108
    assert client.get("/insights/states?year=2020").status_code == 422
    assert client.get("/insights/export?year=2024").status_code == 422


def test_map_is_only_matched_indian_regions(client):
    geo = client.get("/hotspots").json()
    assert geo["kind"] == "state_ut_boundaries" and geo["country"] == "India"
    features = geo["geojson"]["features"]
    assert len(features) == 36
    assert all(f["geometry"]["type"] in ["Polygon", "MultiPolygon"] for f in features)
    names = {r["state"] for r in client.get("/insights/overview").json()["records"]}
    assert {f["properties"]["state"] for f in features} == names

    def coords(value):
        if isinstance(value[0], (int, float)):
            yield value
        else:
            for sub in value:
                yield from coords(sub)

    for f in features:
        assert all(65 < lon < 100 and 5 < lat < 40 for lon, lat in coords(f["geometry"]["coordinates"]))


def test_historical_country_and_original_semantics_isolation(client):
    for version, label, country in [
        ("stats19-gb-2022-v1", "Slight injury", "Great Britain"),
        ("legacy-rf-e76f2cb", "Class 3", "Unknown (legacy)"),
    ]:
        payload = {
            "id": str(uuid4()),
            "created_at": "2026-11-14T00:00:00Z",
            "model_version": version,
            "class_id": "3",
            "severity": label,
            "confidence": 0.7,
            "risk_score": None,
            "saved": True,
            "latency_ms": 1,
            "scenario": {"speed_limit": 30},
            "speed_unit": "mph" if version.startswith("stats19") else "unknown",
            "probabilities": [{"class_id": "3", "label": label, "probability": 0.7}],
        }
        client.app.state.store.record(TOKEN, payload)
        result = client.get("/predictions/" + payload["id"], headers=AUTH).json()
        assert result["source_country"] == country and result["historical_only"]
        assert all(result[k] == v for k, v in payload.items())
        assert (
            client.get(
                "/predictions/" + payload["id"], headers={"Authorization": "Bearer " + "b" * 64}
            ).status_code
            == 404
        )
        assert (
            client.delete(
                "/predictions/" + payload["id"], headers={"Authorization": "Bearer " + "b" * 64}
            ).status_code
            == 404
        )
        assert client.get("/predictions/" + payload["id"]).status_code == 401
        assert client.delete("/predictions/" + payload["id"], headers=AUTH).status_code == 204
    assert client.get("/predictions", headers=AUTH).json()["total"] == 0


def test_corrupt_or_missing_india_release_cannot_fallback(tmp_path):
    root = Path(__file__).resolve().parents[1] / "release"
    for p in root.glob("india-*.json"):
        (tmp_path / p.name).write_bytes(p.read_bytes())
    (tmp_path / "india-analytics.json").write_text('{"country":"Great Britain"}')
    with TestClient(create_app(Settings(database_url="sqlite:///:memory:", release_dir=tmp_path))) as c:
        assert c.get("/health").status_code == 503
        assert c.get("/insights/overview").status_code == 503
        assert c.post("/predict", json={}).status_code == 410
