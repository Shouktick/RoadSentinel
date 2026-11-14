import csv
import io
import json
import re

from pydantic import ValidationError

from app.schemas.scenario import FEATURES, Scenario
from app.domain import CATEGORIES, FIELD_LABELS


def read_csv(blob: bytes, max_rows: int):
    try:
        reader = csv.DictReader(io.StringIO(blob.decode("utf-8-sig"), newline=""), strict=True)
        headers = reader.fieldnames
        if not headers or len(headers) != len(set(headers)) or len(headers) > 100:
            raise ValueError("CSV must have unique headers and at most 100 columns.")
        rows = []
        for row in reader:
            if len(rows) >= max_rows:
                raise OverflowError(f"A batch is limited to {max_rows} rows.")
            if None in row:
                raise ValueError("A CSV row contains more values than its headers.")
            rows.append(row)
        if not rows:
            raise ValueError("CSV contains no data rows.")
        return headers, rows
    except (UnicodeError, csv.Error) as exc:
        raise ValueError("Upload a well-formed UTF-8 CSV file.") from exc


def infer_batch(blob: bytes, mapping_text: str, service, max_rows: int):
    headers, rows = read_csv(blob, max_rows)
    mapping = json.loads(mapping_text) if mapping_text else {f: f for f in FEATURES}
    if (
        not isinstance(mapping, dict)
        or set(mapping) != set(FEATURES)
        or any(v not in headers for v in mapping.values())
    ):
        raise ValueError("Map every required model feature to an existing CSV column.")
    if len(set(mapping.values())) != len(FEATURES):
        raise ValueError("Each model feature must map to a distinct input column.")
    valid, indices, outcomes = [], [], []
    for row_number, row in enumerate(rows, start=2):
        try:
            values = {f: row[column] for f, column in mapping.items()}
            for feature, value in values.items():
                if isinstance(value, str):
                    names = {label.casefold(): code for code, label in CATEGORIES[feature].items()}
                    values[feature] = names.get(value.strip().casefold(), value)
            values = {
                f: int(v.strip()) if isinstance(v, str) and re.fullmatch(r"[+-]?\d+", v.strip()) else v
                for f, v in values.items()
            }
            scenario = Scenario.model_validate(values)
            valid.append(scenario)
            indices.append(len(outcomes))
            outcomes.append(
                {"row": row_number, "input": row, "status": "success", "prediction": None, "errors": []}
            )
        except ValidationError as exc:
            errors = [
                f"{FIELD_LABELS.get(str(e['loc'][0]), str(e['loc'][0])) if e['loc'] else 'Scenario'}: {e['msg']}"
                for e in exc.errors()
            ]
            outcomes.append(
                {"row": row_number, "input": row, "status": "invalid", "prediction": None, "errors": errors}
            )
    if valid:
        for index, prediction in zip(indices, service.predict_many(valid)):
            outcomes[index]["prediction"] = prediction
    return {
        "total": len(rows),
        "successful": len(valid),
        "invalid": len(rows) - len(valid),
        "rows": outcomes,
        "model_version": service.manifest["model_version"],
    }


def export_csv(batch):
    output = io.StringIO(newline="")
    inputs = list(batch["rows"][0]["input"]) if batch["rows"] else []
    fieldnames = [f"input:{x}" for x in inputs] + [
        "result:row",
        "result:status",
        "result:model_version",
        "result:speed_unit",
        "result:probability_fatal",
        "result:probability_serious",
        "result:probability_slight",
        "result:label",
        "result:estimated_probability",
        "result:errors",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in batch["rows"]:
        prediction = row["prediction"] or {}
        record = {f"input:{k}": safe_cell(v) for k, v in row["input"].items()}
        record.update(
            {
                "result:row": row["row"],
                "result:status": row["status"],
                "result:model_version": batch["model_version"],
                "result:speed_unit": "mph",
                **{
                    f"result:probability_{name}": next(
                        (
                            p["probability"]
                            for p in prediction.get("probabilities", [])
                            if p["class_id"] == code
                        ),
                        "",
                    )
                    for code, name in [("1", "fatal"), ("2", "serious"), ("3", "slight")]
                },
                "result:label": safe_cell(prediction.get("severity", "")),
                "result:estimated_probability": prediction.get("confidence", ""),
                "result:errors": safe_cell("; ".join(row["errors"])),
            }
        )
        writer.writerow(record)
    return output.getvalue()


def safe_cell(value):
    text = "" if value is None else str(value)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")) else text
