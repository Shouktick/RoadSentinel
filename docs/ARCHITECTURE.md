# India-only architecture

Next.js 16 / React frontend -> same-origin allowlisted `/api/service/*` gateway -> FastAPI analytics API -> checksum-verified India JSON artifacts. The frontend does not call Render directly. TanStack Query handles loading, error and explicit retry states. Leaflet is lazy-loaded only for the map; geometry is Indian regions without external tiles or observation points.

Offline `prepare_india.py` extracts official tables and joins licensed display boundaries. Raw sources and preparation dependencies are excluded from runtime. The serving environment has no scikit-learn, pandas, joblib or SHAP requirement and loads no model. Prediction endpoints consistently return 410, regardless of submitted old inputs.

SQLite/SQLAlchemy retains session-isolated historical payloads when available. Read-time provenance enrichment does not alter original labels or units. No migration converts old results to India. Temporary storage limitations remain visible. No paid infrastructure or new service is provisioned.
