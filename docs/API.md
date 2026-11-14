# India API v4

`GET /health` requires verified national artifacts, the Karnataka model and the database. Ready responses identify India, code/dataset/model versions, artifact checksums and temporary-history status. Corruption yields 503; no foreign fallback.

## National analytics

- `GET /insights/overview`: 108 state/UT/year rows, national totals, definitions, units, source/license and caveats.
- `GET /insights/states?year=2023`: 36 regions, supported years 2021-2023.
- `GET /insights/export[?year=2023]`: CSV with country, version, year, event/person counts and source. Missing source counts stay blank.
- `GET /hotspots`: retained legacy path for Indian regional boundaries, not individual hotspots.

## Karnataka research

- `GET /model/metadata`: seven categorical input definitions, allowed values/defaults, four outcomes, coverage, source/licence, cleaning, split and genuine evaluation.
- `GET /metrics`, `/model-metrics`: class recall, macro F1, balanced accuracy, confusion matrix, baseline and selection evidence.
- `POST /predict`: `{scenario, save:false}`. Session bearer required. Exact documented fields only; unknown/foreign codes, speed fields and extra keys return 422. Scores are uncalibrated class scores conditional on a reported crash. Results carry country, region, model, licence, source and exact logit contributions.
- `POST /explain/local`: `{scenario}`; same inference plus local exact linear SHAP. `GET /explain/global` returns training-distribution mean absolute contributions by class, not causal effects.
- `POST /predict/whatif`: `{baseline, alternative}`; both are complete scenarios. Returns two results; score changes are not causal estimates.
- `POST /batch/preview`: `{csv}`; validates exact unique headers and every row before inference. Up to 500 scenarios and 2,000,000 text characters, with an additional transport body cap.
- `POST /predict/batch` or `/predict-batch`: `{csv, save:false}`, session bearer required; results match single inference.
- `GET /insights/crashes`: filtered Karnataka sample counts by year, outcome and police unit; actual-coordinate 0.1-degree cells with at least five records, plus source/licence. These counts are not official statewide totals or exposure-adjusted risk.
- `POST /predict/speed-sweep`: `{speed_kmh, reaction_seconds, deceleration_ms2, mass_kg}`; independent idealized physics, `kind=physics_calculation`, model version null. Bounds: 5-150 km/h, 0.5-5 s, 1-10 m/s², 50-40000 kg. Results use meters and kJ. No measured speed observations or recommended safe speed are implied.

## Records and gateway

`GET /predictions`, `GET /predictions/{id}`, `DELETE /predictions/{id}`, `GET /activity` require `Authorization: Bearer <64 lowercase hex characters>`. History supports search, label, page, limit and order. Tokens are hashed for session isolation. Original British payloads retain Great Britain provenance; unknown legacy provenance stays unknown. Current Indian records have `historical_only=false`; no old result is relabeled as Indian.

The frontend gateway `/api/service/*` allows supported routes only. Existing `/api/v1` migration aliases share the same implementations/schemas; `/model-metrics` is an unversioned compatibility alias. Error envelopes include a request ID. Prediction saves are optional; temporary SQLite history is not durable account storage.
