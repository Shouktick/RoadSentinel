import csv
import io
import json
import hashlib
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app.core.config import Settings
from app.domain import DEFAULTS, FEATURES, LABELS
from app.main import create_app
from app.schemas.scenario import Scenario
from app.services.model import ModelService
from app.services.batch import safe_cell

HEADERS = {"Authorization": "Bearer " + "a" * 64}
OTHER = {"Authorization": "Bearer " + "b" * 64}


@pytest.fixture(scope="module")
def model():
    service = ModelService(Settings())
    service.initialize()
    assert service.model is not None, service.failure
    return service


@pytest.fixture(scope="module")
def client(model):
    with TestClient(create_app(Settings(database_url="sqlite:///:memory:"), model)) as client:
        yield client


def test_readiness_metadata_and_evaluation(client):
    health = client.get("/health").json()
    assert health["ready"] and health["severity_ready"] and not health["history_durable"]
    metadata = client.get("/model/metadata").json()
    assert metadata["speed_unit"] == "mph"
    assert metadata["classes"] == [{"id": str(i), "label": LABELS[i]} for i in [1, 2, 3]]
    metrics = client.get("/metrics").json()
    assert metrics["model_version"] == health["model_version"]
    assert metrics["test_size"] == 104258
    assert sum(map(sum, metrics["confusion_matrix"])) == metrics["test_size"]
    assert metrics["classification_report"]["Fatal injury"]["recall"] == 0
    assert client.get("/api/v1/health").status_code == 200


def test_actual_inference_and_exact_explanation(client, model):
    result = client.post("/predict", json={"scenario": DEFAULTS, "explain": True}, headers=HEADERS).json()
    assert sum(p["probability"] for p in result["probabilities"]) == pytest.approx(1)
    assert result["severity"] in LABELS.values() and result["risk_score"] is None
    assert result["schema_version"] == 2 and result["speed_unit"] == "mph"
    assert len(result["artifact_sha256"]) == 64
    explanation = result["explanation"]
    assert len(explanation["contributions"]) == 8
    assert explanation["base_value"] + sum(
        c["contribution"] for c in explanation["contributions"]
    ) == pytest.approx(result["confidence"], abs=1e-10)
    # Independent library implementation verifies individual contributions, not just their sum.
    import shap

    background = pd.DataFrame(model.background, columns=FEATURES)
    reference = shap.ExactExplainer(
        lambda rows: model.model.predict_proba(pd.DataFrame(rows, columns=FEATURES)),
        shap.maskers.Independent(background, max_samples=16),
    )
    exact = reference(pd.DataFrame([DEFAULTS], columns=FEATURES))
    index = list(model.model.classes_).index(int(result["class_id"]))
    np.testing.assert_allclose(
        [c["contribution"] for c in explanation["contributions"]], exact.values[0, :, index], atol=1e-10
    )


def test_probabilities_for_each_documented_category(model):
    from app.domain import CATEGORIES

    scenarios = [Scenario(**(DEFAULTS | {f: code})) for f in FEATURES for code in CATEGORIES[f]]
    results = model.predict_many(scenarios)
    assert all(sum(p["probability"] for p in r["probabilities"]) == pytest.approx(1) for r in results)


def test_auth_validation_and_sweep(client):
    assert client.post("/predict", json={"scenario": DEFAULTS}).status_code == 401
    for patch in [
        {"weather_conditions": 999},
        {"speed_limit": 100},
        {"hour": True},
        {"number_of_casualties": 2},
    ]:
        r = client.post("/predict", json={"scenario": DEFAULTS | patch}, headers=HEADERS)
        assert r.status_code == 422
    compare = client.post(
        "/predict/whatif",
        json={"baseline": DEFAULTS, "scenarios": [DEFAULTS | {"speed_limit": 70}]},
        headers=HEADERS,
    ).json()
    assert compare["scenarios"][0]["feature_differences"] == ["speed_limit"]
    assert compare["model_version"] == compare["baseline"]["model_version"]
    sweep = client.post("/predict/speed-sweep", json={"scenario": DEFAULTS}, headers=HEADERS).json()
    assert sweep["speed_unit"] == "mph"
    assert [p["speed"] for p in sweep["points"]] == [20, 30, 40, 50, 60, 70]
    assert (
        client.post(
            "/predict/speed-sweep", json={"scenario": DEFAULTS, "stop": 100}, headers=HEADERS
        ).status_code
        == 422
    )


def test_history_isolation_and_legacy_semantics(client):
    result = client.post("/predict", json={"scenario": DEFAULTS, "save": True}, headers=HEADERS).json()
    identifier = result["id"]
    assert client.get(f"/predictions/{identifier}", headers=OTHER).status_code == 404
    assert client.delete(f"/predictions/{identifier}", headers=OTHER).status_code == 404
    assert client.get(f"/predictions/{identifier}", headers=HEADERS).json() == result
    old = dict(
        result,
        id="legacy-record",
        model_version="legacy-undocumented-v0",
        severity="Class 3",
        semantics_verified=False,
        schema_version=1,
        scenario={"Speed_limit": 30},
    )
    client.app.state.store.record("a" * 64, old)
    assert client.get("/predictions/legacy-record", headers=HEADERS).json() == old
    selected = client.get("/predictions?label=Slight%20injury", headers=HEADERS).json()
    assert all(r["severity"] == "Slight injury" for r in selected["items"])
    activity = client.get("/activity", headers=HEADERS).json()
    assert any(
        r["label"] == "Class 3" and r["model_version"] == old["model_version"]
        for r in activity["class_distribution"]
    )
    assert client.delete(f"/predictions/{identifier}", headers=HEADERS).status_code == 204
    assert client.get(f"/predictions/{identifier}", headers=HEADERS).status_code == 404
    assert client.get("/predictions?search=%27%20OR%201=1--", headers=HEADERS).json()["total"] == 0


def test_batch_readable_names_mixed_validation_and_versioned_export(client):
    from app.domain import CATEGORIES

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(FEATURES)
    writer.writerow([CATEGORIES[f][DEFAULTS[f]] for f in FEATURES])
    writer.writerow([999] + [DEFAULTS[f] for f in FEATURES[1:]])
    files = {"file": ("cases.csv", output.getvalue().encode(), "text/csv")}
    preview = client.post("/batch/preview", files=files, headers=HEADERS)
    assert preview.json()["row_count"] == 2
    response = client.post("/predict/batch", files=files, headers=HEADERS)
    assert response.status_code == 200, response.text
    batch = response.json()
    assert batch["successful"] == 1 and batch["invalid"] == 1
    rows = list(csv.DictReader(io.StringIO(batch["csv"])))
    assert all(
        r["result:model_version"] == batch["model_version"] and r["result:speed_unit"] == "mph" for r in rows
    )
    assert rows[0]["result:label"] in LABELS.values()
    assert sum(
        float(rows[0][f"result:probability_{label}"]) for label in ["fatal", "serious", "slight"]
    ) == pytest.approx(1)
    assert safe_cell("=2+2").startswith("'")
    assert (
        client.post("/predict/batch", files={"file": ("bad.csv", b"a,a\n1,2\n")}, headers=HEADERS).status_code
        == 422
    )
    big = (",".join(FEATURES) + "\n" + (",".join(str(DEFAULTS[f]) for f in FEATURES) + "\n") * 251).encode()
    assert client.post("/predict/batch", files={"file": ("big.csv", big)}, headers=HEADERS).status_code == 413


def test_integrity_and_runtime_compatibility_fail_closed(tmp_path):
    settings = Settings()
    broken = tmp_path / "bad.joblib"
    broken.write_bytes(settings.model_archive.read_bytes() + b"tampered")
    service = ModelService(Settings(model_archive=broken))
    service.initialize()
    assert service.model is None
    manifest = json.loads(settings.model_manifest.read_text(encoding="utf-8"))
    manifest["sklearn_version"] = "0.0"
    changed = tmp_path / "metadata.json"
    changed.write_text(json.dumps(manifest))
    service = ModelService(Settings(model_manifest=changed))
    service.initialize()
    assert service.model is None
    with TestClient(create_app(Settings(database_url="sqlite:///:memory:"), service)) as client:
        assert client.get("/health").status_code == 503
    assert (
        hashlib.sha256(settings.model_archive.read_bytes()).hexdigest()
        == json.loads(settings.model_manifest.read_text())["artifact_sha256"]
    )


def test_artifact_cannot_be_relabelled(tmp_path):
    settings = Settings()
    manifest = json.loads(settings.model_manifest.read_text(encoding="utf-8"))
    manifest["class_labels"]["1"] = "Slight injury"
    path = tmp_path / "relabelled.json"
    path.write_text(json.dumps(manifest), encoding="utf-8")
    model = ModelService(Settings(model_manifest=path))
    model.initialize()
    assert model.model is None
