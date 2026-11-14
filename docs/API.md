# API v2

Base: https://roadsentinel-api.onrender.com. Frontend gateway: `/api/service/`. `/api/v1/` aliases remain for route continuity, but the documented input contract is now v2; legacy requests fail validation rather than being reinterpreted.

All mutation/history calls require `Authorization: Bearer <64 lowercase hexadecimal characters>`. The random browser token is an access capability, not a cross-device account. Use HTTPS. Histories are isolated by a server-side token hash; only explicitly saved requests retain full input/results. Unsaved activity retains summary metadata only.

## Scenario

```json
{"speed_limit":30,"weather_conditions":1,"road_surface_conditions":1,"light_conditions":1,"road_type":6,"urban_or_rural_area":1,"hour":12,"day_of_week":2}
```

`speed_limit` is mph: 20/30/40/50/60/70 or -1 (unknown). Other categories follow `app/domain.py`, derived from the pinned official codebook. `hour` is 0–23 local time or -1. Weekday: Sunday=1 through Saturday=7 or -1. Extra fields, fractions, booleans and unknown categories are rejected. No age, vehicle count or casualty count is accepted.

## Endpoints

| Method / route | Purpose |
| --- | --- |
| GET /health | Model/database readiness, deployed code SHA, model version and artifact SHA256; 503 if not ready |
| GET /model/metadata | Target, labels/definitions, units, provenance, categories, limitations and artifact identity |
| POST /predict | `{scenario, save: false, explain: true}`; real versioned probabilities and optional explanation |
| POST /predict/whatif | `{baseline, scenarios: [...]}` up to eight alternatives; individual probabilities and changed inputs; no arbitrary risk score |
| POST /predict/speed-sweep | `{scenario, start:20, stop:70, step:10}`; documented posted limits only |
| POST /explain/local | Scenario directly; exact full-pipeline local contributions |
| POST /batch/preview | Multipart CSV, UTF-8, 2 MiB / 250 rows; header/row preview |
| POST /predict/batch | Multipart CSV and optional JSON `mapping` of feature → column; readable category labels or documented codes; per-row validation |
| GET /metrics | Actual held-out evaluation, split counts, selection and baseline evidence matching serving version |
| GET /insights/overview | 2023 source counts, missing input cells and source fingerprint |
| GET /insights/{dimension} | weather, road-surface, lighting, road-type, area-type, speed-bands, hourly, weekday |
| GET /hotspots | Great Britain 2023 aggregate coordinate cells, minimum count five; no individual points |
| GET /activity | Current token's activity grouped by original label AND model version |
| GET /predictions | Token-isolated saved history; `search`, `label`, `page`, `limit`, `order=newest/oldest/confidence` |
| GET /predictions/{id} | Original stored payload with its version/label semantics |
| DELETE /predictions/{id} | Deletes only the caller's saved record; 204 or 404 |

Result fields include `schema_version=2`, `model_version`, `artifact_sha256`, `code_version`, source label definitions, `speed_unit=mph`, original scenario, three probabilities, most likely outcome, latency and explanation. `confidence` is retained as an internal compatibility field meaning the selected outcome's estimated probability, not accuracy. `risk_score` is always null; no combined safety index is shown. CSV exports include model version, speed unit and all three probabilities; spreadsheet formula-leading cells are escaped.

History is a snapshot. Old schemas/labels are returned unchanged; filtering by a label never silently remaps old class IDs. The UI identifies legacy records and prevents reusing their input dictionaries as new scenarios. Global SHAP and live GPS-speed prediction have been removed because they do not represent the supported release.

Errors: structured `error.code`, `message`, request ID and validation details. 401 for missing token, 422 for invalid data, 413 for oversized batch, 429 with Retry-After, and 503 for unavailable capabilities. The gateway has a bounded timeout and explains free-host wakeup delays. Mutations are never automatically retried.
