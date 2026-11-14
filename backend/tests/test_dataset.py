from app.core.config import Settings
from app.services.dataset import DatasetService


def test_source_aggregate_counts_and_geographic_suppression():
    data = DatasetService(Settings())
    overview = data.overview()
    assert overview["row_count"] == 104258
    assert sum(x["count"] for x in overview["distribution"]) == 104258
    for dimension in [
        "weather",
        "road-surface",
        "lighting",
        "road-type",
        "area-type",
        "speed-bands",
        "hourly",
        "weekday",
    ]:
        agg = data.aggregate(dimension)
        assert agg["denominator"] == sum(x["count"] for x in agg["items"])
        assert agg["provenance"]["sha256"] == overview["provenance"]["sha256"]
    geo = data.hotspots()
    assert all(49 <= p["lat"] <= 61 and -9 <= p["lng"] <= 3 and p["count"] >= 5 for p in geo["items"])
    assert (
        sum(p["count"] for p in geo["items"])
        == geo["displayed_records"]
        <= geo["valid_coordinates"]
        <= geo["total"]
    )
    assert "Great Britain" in geo["coverage"]
