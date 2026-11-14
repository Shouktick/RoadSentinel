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


def scenario(client):
    return {f["key"]: f["default"] for f in client.get("/model/metadata").json()["features"]}


def test_health_requires_verified_indian_model_and_data(client):
    h = client.get("/health").json()
    assert h["ready"] and h["analytics_ready"] and h["country"] == "India"
    assert h["model_available"] and h["severity_ready"]
    assert h["model_version"].startswith("india-karnataka-")
    assert h["dataset_version"] == "india-morth-2023-v1"
    assert len(h["model_artifact_sha256"]) == 64


def test_prediction_alias_save_isolation_and_exact_explanation(client):
    values = scenario(client)
    for prefix in ["", "/api/v1"]:
        response = client.post(prefix + "/predict", json={"scenario": values, "save": True}, headers=AUTH)
        assert response.status_code == 200, response.text
        r = response.json()
        assert r["source_country"] == "India" and r["region"] == "Karnataka"
        assert r["risk_score"] is None and not r["historical_only"]
        assert sum(x["probability"] for x in r["probabilities"]) == pytest.approx(1)
        e = r["explanation"]
        assert e["base_value"] + sum(x["contribution"] for x in e["contributions"]) == pytest.approx(
            e["output_logit"]
        )
        saved = client.get("/predictions/" + r["id"], headers=AUTH).json()
        assert saved == r
        assert (
            client.get("/predictions/" + r["id"], headers={"Authorization": "Bearer " + "b" * 64}).status_code
            == 404
        )
    assert client.post("/predict", json={"scenario": values}).status_code == 401
    assert client.get("/predictions", headers=AUTH).json()["total"] == 2


@pytest.mark.parametrize("path", ["/predict", "/explain/local"])
def test_rejects_foreign_unknown_or_extra_model_fields(client, path):
    valid = scenario(client)
    for invalid in [{"speed_limit": 30}, {**valid, "speed_kmh": "50"}, {**valid, "district": "London"}, {}]:
        assert client.post(path, json={"scenario": invalid}, headers=AUTH).status_code == 422


def test_comparison_and_local_explanation_use_same_model(client):
    values = scenario(client)
    single = client.post("/explain/local", json={"scenario": values}).json()
    comparison = client.post("/predict/whatif", json={"baseline": values, "alternative": values}).json()
    assert (
        single["probabilities"]
        == comparison["baseline"]["probabilities"]
        == comparison["alternative"]["probabilities"]
    )
    assert client.get("/explain/global").json()["units"].startswith("logit")


def test_batch_validation_limits_and_parity(client):
    values = scenario(client)
    data = ",".join(values) + "\n" + ",".join(values.values()) + "\n"
    assert client.post("/batch/preview", json={"csv": data}).json()["count"] == 1
    single = client.post("/explain/local", json={"scenario": values}).json()
    for path in ["/predict/batch", "/predict-batch", "/api/v1/predict/batch"]:
        result = client.post(path, json={"csv": data}, headers=AUTH)
        assert result.status_code == 200, result.text
        assert result.json()["results"][0]["probabilities"] == single["probabilities"]
    for invalid in [
        "speed_limit\n30",
        ",".join(values) + "\n",
        data + "London\n",
        ",".join(values) + "\n" + (",".join(values.values()) + "\n") * 501,
    ]:
        assert client.post("/batch/preview", json={"csv": invalid}).status_code == 422
    assert client.get("/predictions", headers=AUTH).json()["total"] == 0


def test_speed_calculation_is_separate_and_has_known_units(client):
    r = client.post(
        "/predict/speed-sweep",
        json={"speed_kmh": 36, "reaction_seconds": 2, "deceleration_ms2": 5, "mass_kg": 1000},
    ).json()
    assert r["kind"] == "physics_calculation" and r["model_version"] is None
    assert r["selected"] == {
        "speed_kmh": 36,
        "reaction_distance_m": 20,
        "braking_distance_m": 10,
        "stopping_distance_m": 30,
        "kinetic_energy_kj": 50,
    }
    assert client.post("/predict/speed-sweep", json={"speed_kmh": -1}).status_code == 422


def test_evaluation_is_real_heldout_and_all_classes_are_predicted(client):
    m = client.get("/metrics").json()
    assert m["country"] == "India" and m["region"] == "Karnataka"
    assert m["split"] == {"training_2016_2021": 140742, "validation_2022": 24155, "test_2023": 23551}
    e, b = m["evaluation"], m["baseline"]
    assert e["macro_f1"] > b["macro_f1"] and e["balanced_accuracy"] > b["balanced_accuracy"]
    assert set(e["predicted_counts"]) == set(m["classes"])
    assert sum(sum(r) for r in e["confusion_matrix"]) == e["n"] == 23551
    for c, r in zip(m["classes"], e["confusion_matrix"]):
        assert sum(r) == e["per_class"][c]["support"]
    assert client.get("/model/metadata").json()["license"] == "CC BY-NC-SA 4.0"


def test_crash_grid_is_aggregated_from_indian_records(client):
    d = client.get("/insights/crashes").json()
    assert d["country"] == "India" and d["region"] == "Karnataka"
    assert sum(d["classes"].values()) == d["records"] == 188448
    assert all(c["count"] >= 5 and c["fatal"] <= c["count"] for c in d["cells"])
    for c in d["cells"]:
        assert 11 < c["bounds"][0][0] < 19 and 73 < c["bounds"][0][1] < 79


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
        assert c.post("/explain/local", json={"scenario": {}}).status_code == 503
