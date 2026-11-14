import pandas as pd
import pytest
from pydantic import ValidationError
from app.domain import CATEGORIES, DEFAULTS, FEATURES, LABELS, prepare
from app.schemas.scenario import Scenario


def test_documented_mapping_and_units():
    assert LABELS == {1: "Fatal injury", 2: "Serious injury", 3: "Slight injury"}
    assert CATEGORIES["speed_limit"] == {
        -1: "Unknown",
        20: "20 mph",
        30: "30 mph",
        40: "40 mph",
        50: "50 mph",
        60: "60 mph",
        70: "70 mph",
    }
    assert CATEGORIES["road_type"][6] == "Single carriageway"
    assert CATEGORIES["day_of_week"][1] == "Sunday"
    assert set(FEATURES).isdisjoint(
        {
            "collision_severity",
            "number_of_casualties",
            "number_of_vehicles",
            "enhanced_severity_collision",
            "collision_adjusted_severity_serious",
            "did_police_officer_attend_scene_of_accident",
            "longitude",
            "latitude",
        }
    )


def test_missing_unknown_and_time_preparation():
    frame = pd.DataFrame(
        [
            DEFAULTS | {"time": "23:45", "speed_limit": 99, "weather_conditions": None},
            DEFAULTS | {"time": None},
        ]
    )
    result = prepare(frame)
    assert result.columns.tolist() == FEATURES
    assert result.iloc[0].speed_limit == -1
    assert result.iloc[0].weather_conditions == -1
    assert result.iloc[0].hour == 23 and result.iloc[1].hour == -1
    for row in result.to_dict("records"):
        assert Scenario(**row)


@pytest.mark.parametrize(
    "patch",
    [
        {"speed_limit": 30.5},
        {"hour": 24},
        {"day_of_week": 8},
        {"weather_conditions": True},
        {"age_of_driver": 30},
    ],
)
def test_invalid_scenarios(patch):
    with pytest.raises(ValidationError):
        Scenario(**(DEFAULTS | patch))


def test_frontend_and_backend_share_the_same_vocabulary():
    import json
    from pathlib import Path
    from app.domain import FIELD_LABELS, DEFINITIONS

    root = Path(__file__).resolve().parents[2]
    domain = json.loads((root / "frontend/src/lib/domain.json").read_text(encoding="utf-8"))
    assert domain["features"] == FEATURES
    assert domain["defaults"] == DEFAULTS
    assert domain["labels"] == FIELD_LABELS
    assert domain["definitions"] == DEFINITIONS
    assert domain["options"] == {
        k: [[code, label] for code, label in values.items()] for k, values in CATEGORIES.items()
    }
