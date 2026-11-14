"""Audit the actual pinned workbook and export the fields used by this release."""

# ruff: noqa: E402
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import openpyxl
from app.domain import CATEGORIES, FEATURES


def main():
    manifest = json.loads((ROOT / "source-manifest.json").read_text(encoding="utf-8"))
    path = ROOT / "data" / "source" / "codebook.xlsx"
    assert hashlib.sha256(path.read_bytes()).hexdigest() == manifest["files"]["codebook.xlsx"]["sha256"]
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    fields = set(FEATURES) | {"collision_severity", "time", "latitude", "longitude"}
    rows = [
        list(row) for row in workbook["2024_code_list"].values if row[0] == "collision" and row[1] in fields
    ]
    for feature in FEATURES:
        if feature in {"hour", "speed_limit"}:
            continue
        official = {row[2] for row in rows if row[1] == feature}
        assert set(CATEGORIES[feature]) - {-1} <= official, f"Undocumented category in {feature}"
    assert {row[2]: row[3] for row in rows if row[1] == "collision_severity"} == {
        1: "Fatal",
        2: "Serious",
        3: "Slight",
    }
    target = ROOT / "release" / "codebook-extract.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(
        json.dumps(
            {
                "source": manifest["files"]["codebook.xlsx"],
                "columns": ["table", "field", "code_or_format", "label", "note"],
                "rows": rows,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("Verified source severity and input categories against pinned workbook.")


if __name__ == "__main__":
    main()
