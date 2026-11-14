# Architecture

Next.js 16 / React frontend → same-origin `/api/service/*` gateway → FastAPI on Render → integrity-pinned scikit-learn pipeline. SQLAlchemy manages token-isolated temporary SQLite history. No paid/durable datastore is configured. The existing RoadSentinel repo and hosting targets are preserved.

`backend/app/domain.py` is the reviewed STATS19 field/category allowlist. Training exports the matching frontend `domain.json`. Pydantic and Zod reject unknown categories and legacy feature dictionaries. Requests to every prediction surface use the same `ModelService`; no rule-based fallback is substituted on errors.

Offline scripts verify official-source checksums, split 2022 fitting/calibration/validation partitions, select probability models, freeze the artifact, and evaluate the held-out 2023 test. Runtime does not train or download data. `backend/release` carries the small fitted model, manifest, selection/split evidence, test report, codebook extract and source aggregates. JSON metrics must match the serving version and source fingerprint.

Local explanation enumerates every original-feature coalition, evaluating the actual probability pipeline against 16 real fitting reference rows. It is exact for that empirical reference distribution, not a causal explanation or population-wide importance estimate. An independent library verifies individual contributions in tests.

Every stored prediction keeps its original payload, model version, label text, definitions, speed units and explanation. Legacy records are displayed explicitly as legacy; no new category mapping is applied. Activity groups labels together with their model version. Missing/other-owner records both return 404.

Frontend forms disable edits during submission and clear results when inputs change. Comparisons and posted-limit exploration use valid documented mph categories. CSV previews preserve original columns; batches report individual invalid rows and versioned probability exports. CSV formulas are escaped. Explicit outage tests are separate from genuine inference journeys.

The geographic runtime contains only 0.1-degree source-derived cell counts with a minimum of five observations. It never ships individual coordinates. The Leaflet component is loaded only on the map route, with an accessible cell table and OSM attribution. Dataset analytics, model evaluation and personal application activity have separate views and denominators.

Deployment health fails with 503 if the model is unavailable; both artifact hash and Render Git commit are exposed for release verification. Rate/body limits and error envelopes remain in the API. Free-service wakeups have honest retry messaging, and model probabilities are never converted into a safety score.
