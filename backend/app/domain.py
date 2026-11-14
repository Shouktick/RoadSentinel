"""Reviewed STATS19 collision fields. Source: docs/DATASET.md and source-manifest.json."""

FEATURES = [
    "speed_limit",
    "weather_conditions",
    "road_surface_conditions",
    "light_conditions",
    "road_type",
    "urban_or_rural_area",
    "hour",
    "day_of_week",
]
LABELS = {1: "Fatal injury", 2: "Serious injury", 3: "Slight injury"}
DEFINITIONS = {
    "Fatal injury": "At least one person died from their injuries less than 30 days of the crash (excluding confirmed suicide).",
    "Serious injury": "At least one serious injury, such as a fracture, internal injury or hospital inpatient treatment, and no fatal injury. Includes injury deaths 30 or more days later.",
    "Slight injury": "Minor injuries, such as a sprain, bruise or slight cut, with no serious or fatal injury.",
}
FIELD_LABELS = {
    "speed_limit": "Posted speed limit (mph)",
    "weather_conditions": "Weather",
    "road_surface_conditions": "Road surface",
    "light_conditions": "Lighting",
    "road_type": "Road type",
    "urban_or_rural_area": "Area type",
    "hour": "Hour of day (local time)",
    "day_of_week": "Day of week",
}
CATEGORIES = {
    "speed_limit": {-1: "Unknown", **{n: f"{n} mph" for n in (20, 30, 40, 50, 60, 70)}},
    "weather_conditions": {
        -1: "Not recorded",
        1: "Fine, no high winds",
        2: "Raining, no high winds",
        3: "Snowing, no high winds",
        4: "Fine with high winds",
        5: "Raining with high winds",
        6: "Snowing with high winds",
        7: "Fog or mist",
        8: "Other",
        9: "Unknown",
    },
    "road_surface_conditions": {
        -1: "Not recorded",
        1: "Dry",
        2: "Wet or damp",
        3: "Snow",
        4: "Frost or ice",
        5: "Flood over 3 cm deep",
        6: "Oil or diesel",
        7: "Mud",
        9: "Unknown",
    },
    "light_conditions": {
        -1: "Not recorded",
        1: "Daylight",
        4: "Darkness, lights lit",
        5: "Darkness, lights unlit",
        6: "Darkness, no lighting",
        7: "Darkness, lighting unknown",
    },
    "road_type": {
        -1: "Not recorded",
        1: "Roundabout",
        2: "One way street",
        3: "Dual carriageway",
        6: "Single carriageway",
        7: "Slip road",
        9: "Unknown",
        12: "One way street / slip road",
    },
    "urban_or_rural_area": {-1: "Not recorded", 1: "Urban", 2: "Rural", 3: "Unallocated"},
    "hour": {-1: "Unknown", **{n: f"{n:02}:00–{n:02}:59" for n in range(24)}},
    "day_of_week": {
        -1: "Unknown",
        **dict(enumerate(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], 1)),
    },
}
DEFAULTS = dict(zip(FEATURES, [30, 1, 1, 1, 6, 1, 12, 2]))


def prepare(frame):
    """Keep one row per collision. No casualty/vehicle joins; unknowns stay explicit."""
    import pandas as pd

    result = frame.reindex(columns=FEATURES).copy()
    result["hour"] = pd.to_numeric(frame["time"].str.split(":").str[0], errors="coerce")
    for feature in FEATURES:
        result[feature] = pd.to_numeric(result[feature], errors="coerce").fillna(-1)
        result.loc[~result[feature].isin(CATEGORIES[feature]), feature] = -1
        result[feature] = result[feature].astype(int)
    return result
