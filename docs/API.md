# India analytics API v3

Public reads:

- `GET /health`: 200 when verified Indian data and database are ready; `country=India`, `analytics_ready`, `dataset_version`, aggregate artifact SHA256 and deployed code version. `model_available=false`, `severity_ready=false`, `model_version=null` are intentional.
- `GET /model/metadata`: disabled model status, reason, supported capabilities and `evaluation=null`.
- `GET /insights/overview`: all 108 aggregate rows, national totals, definitions, units, source URLs/checksums, reuse policy and caveats.
- `GET /insights/states?year=2023`: 36 rows for a supported year (2021-2023 only).
- `GET /insights/export[?year=2023]`: CSV with country, dataset version, region, calendar year, event/person count columns, missing marker note and source URL. Missing counts are blank, not zero.
- `GET /hotspots`: historical URL name returning `kind=state_ut_boundaries`, Indian polygons and boundary provenance. No hotspots or crash points are asserted.

All POST prediction, what-if, speed-sweep, batch inference, batch preview and local-explanation routes return 410 `INDIA_MODEL_UNAVAILABLE`, including versioned aliases. GET `/metrics`, `/model-metrics` and `/explain/global` are also disabled. Unknown old category analytics routes return 404. There are no numeric-category input schemas for new predictions.

Historical records require `Authorization: Bearer <64 lowercase hex characters>`: `GET /predictions`, `GET /predictions/{id}`, `DELETE /predictions/{id}`, `GET /activity`. History supports search, label, page, limit and order. Access is scoped by hashed session token; another session sees 404. Old payload values are preserved, with `source_country` and `historical_only=true` added on read. No public endpoint writes new model records.

The frontend gateway is `/api/service/*`, restricted to supported paths. Runtime data loading validates the India manifest and checksums; failed integrity yields 503 readiness/data responses, never a foreign fallback.
