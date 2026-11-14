"""Reproduce India-only state/UT aggregates from pinned official PDF tables.

Run with the preparation dependency lock. No fitting or synthetic records.
"""

import hashlib
import json
import unicodedata
import urllib.request
from pathlib import Path

import fitz
from shapely.geometry import mapping, shape

ROOT = Path(__file__).resolve().parents[1]
VERSION = "india-morth-2023-v1"
SOURCES = {
    "morth-2023.pdf": (
        "https://morth.gov.in/backend/documents/uploaded/Road-Accident-in-India-2023-Publications.pdf",
        "901505420d5b387052ac51e36b4bdce0274f6326b614f9ebcee6e7954d45b5b0",
    ),
    "boundaries.geojson": (
        "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1_simplified.geojson",
        "4c63fe43294a391e8f2de4e9f86f3edb60f8688275b9fee90c61fb2aa0c26061",
    ),
}


def normalized(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return " ".join(value.replace("&", "and").lower().split())


def main():
    source = ROOT / "data" / "source" / "india"
    source.mkdir(parents=True, exist_ok=True)
    for name, (url, digest) in SOURCES.items():
        path = source / name
        if not path.exists():
            with urllib.request.urlopen(url, timeout=120) as response:
                path.write_bytes(response.read())
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(f"Source checksum mismatch: {name}")
    pdf = fitz.open(source / "morth-2023.pdf")
    records, totals = {}, {year: {"year": year} for year in range(2021, 2024)}
    for metric, index in [("accidents", 140), ("fatalities", 142), ("injuries", 144)]:
        table = pdf[index].find_tables().tables[0].extract()
        rows = table[4:40]
        assert len(rows) == 36 and table[40][0] == "Total"
        for row in rows:
            state = " ".join(row[1].split())
            for year, column in [(2021, 3), (2022, 4), (2023, 5)]:
                raw = row[column].strip().replace(",", "")
                value = int(raw) if raw.isdigit() else None
                item = records.setdefault((state, year), {"state": state, "year": year})
                item[metric] = value
                if value is None:
                    item.setdefault("source_missing", {})[metric] = raw
        for year, column in [(2021, 3), (2022, 4), (2023, 5)]:
            totals[year][metric] = int(table[40][column].replace(",", ""))
            assert sum(r[metric] or 0 for r in records.values() if r["year"] == year) == totals[year][metric]
    assert totals[2023] == {"year": 2023, "accidents": 480583, "fatalities": 172890, "injuries": 462825}
    assert len(records) == 108
    geometry = json.loads((source / "boundaries.geojson").read_text(encoding="utf-8"))
    names = {normalized(state): state for state, _ in records}
    for feature in geometry["features"]:
        original = feature["properties"]
        state = names[normalized(original["shapeName"])]
        feature["properties"] = {
            "state": state,
            "source_name": original["shapeName"],
            "source_id": original["shapeID"],
        }
        # Simplification changes display geometry only; it creates no observations.
        feature["geometry"] = mapping(shape(feature["geometry"]).simplify(0.015, preserve_topology=True))
    assert {f["properties"]["state"] for f in geometry["features"]} == set(names.values())
    data = {
        "dataset_version": VERSION,
        "country": "India",
        "granularity": "state_ut_year",
        "years": [2021, 2022, 2023],
        "source": "Ministry of Road Transport and Highways, Government of India: Road Accidents in India 2023",
        "source_url": SOURCES["morth-2023.pdf"][0],
        "source_sha256": SOURCES["morth-2023.pdf"][1],
        "license": "MoRTH copyright policy: free accurate reproduction with prominent source attribution; third-party material excluded",
        "license_url": "https://morth.gov.in/website-policies/copyright-policy",
        "units": {
            "accidents": "reported accidents",
            "fatalities": "persons killed",
            "injuries": "persons injured",
        },
        "definitions": {
            "accidents": "Reported road accidents in the state/UT during the calendar year; a count of events.",
            "fatalities": "Persons killed in reported road accidents; a count of people, not fatal crashes.",
            "injuries": "Persons injured in reported road accidents; a count of people, not injury-severity classes.",
        },
        "notes": [
            "Official police-reported aggregates, not individual crash records or a census of every crash.",
            "2021–2023 selected to avoid the 2020 Ladakh reporting gap. Names follow the source's 36 states/UTs, including the merged Dadra & Nagar Haveli and Daman & Diu.",
            "A source dash is retained as missing, not silently changed to zero (Lakshadweep fatalities, 2023). National totals are the separately published totals.",
            "Counts are not exposure-adjusted risk rates. Larger counts do not establish that a state or road is less safe.",
            "No speed, crash coordinates or individual severity labels are present in these tables. No prediction model or evaluation scores are released.",
        ],
        "table_pages": {
            "accidents": "Annexure 2, printed p112 / PDF p141",
            "fatalities": "Annexure 3, printed p114 / PDF p143",
            "injuries": "Annexure 4, printed p116 / PDF p145",
        },
        "records": sorted(records.values(), key=lambda r: (r["year"], r["state"])),
        "national": list(totals.values()),
        "geography": {
            "source": "geoBoundaries IND ADM1 (9469f09), derived from DataMeet India community / Election Commission of India",
            "source_url": SOURCES["boundaries.geojson"][0],
            "source_sha256": SOURCES["boundaries.geojson"][1],
            "license": "geoBoundaries CC BY 4.0; upstream license recorded as CC BY 2.5 India",
            "license_url": "https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/",
            "note": "Illustrative state/UT boundaries, simplified by 0.015 degrees. Source metadata lists 2011 despite including newer units; all 36 names are matched explicitly. Not an authoritative boundary survey. No crash locations are represented.",
        },
    }
    release = ROOT / "release"
    release.mkdir(exist_ok=True)
    for name, value in [("india-analytics.json", data), ("india-boundaries.json", geometry)]:
        (release / name).write_text(
            json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
        )
    manifest = {
        "dataset_version": VERSION,
        "country": "India",
        "model_version": None,
        "files": {
            name: hashlib.sha256((release / name).read_bytes()).hexdigest()
            for name in ["india-analytics.json", "india-boundaries.json"]
        },
    }
    (release / "india-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(records)} documented state/UT-year rows; no model trained.")


if __name__ == "__main__":
    main()
