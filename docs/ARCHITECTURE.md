# India-only architecture

Next.js / React -> same-origin allowlisted `/api/service/*` gateway -> FastAPI -> checksum-verified Indian artifacts. TanStack Query handles loading/error/retry. Leaflet is lazy-loaded for national polygons and Karnataka aggregate grid cells. No external basemap is required.

Offline `prepare_india.py` extracts MoRTH tables and joins attributed Indian boundaries. Separately, `train_karnataka.py` filters and groups published Indian crash records, fits a categorical class-balanced logistic model on 2016-2021, selects C using 2022, and evaluates once on held-out 2023. Raw sources are ignored and never deployed. National aggregate rows never enter model fitting.

The web runtime loads only JSON coefficients, metadata, aggregate counts and geometry. Pure Python softmax inference and exact interventional linear SHAP avoid scikit-learn/pickle/SHAP imports at startup. The exported model's labels were checked against sklearn predictions for every held-out record. A failed checksum leaves readiness degraded and relevant requests return 503. There is no foreign fallback or synthetic data generation.

Prediction and batch routes validate all fields/categories. CSV requests have 500-row and size limits. Speed physics is a separate calculation with explicit units and assumptions, no severity model. Session-isolated SQLite stores opt-in results and activity. Current Indian results may be rerun; old British payloads retain their original labels, units and version. Free-host history remains temporary. No paid/new service is provisioned.
