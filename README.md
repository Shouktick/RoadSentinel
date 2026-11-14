# RoadSentinel - India only

Official Indian road accident analytics. **No severity prediction model is deployed.**

- [Application](https://roadsentinel-ashy.vercel.app)
- [Backend readiness](https://roadsentinel-api.onrender.com/health)
- [Dataset and reuse terms](docs/DATASET.md)
- [Capability and evaluation status](docs/MODEL_CARD.md)
- [Release verification](docs/RELEASE.md)

## Supported experience

Explore reported accidents, persons killed and persons injured across India's 36 states/union territories for 2021-2023. Filter by year/region/measure, compare annual counts, view a regional choropleth and accessible table, and export the displayed aggregate rows to CSV. Counts are historical police-reported observations, not real-time incidents or exposure-adjusted risk rates.

MoRTH's Road Accidents in India 2023, Annexures 2-4, supplies the statistics. Its copyright policy permits accurate reproduction with prominent attribution (third-party material excluded). Boundary geometry is from geoBoundaries/DataMeet, separately attributed. See the source checksums, missing-value handling and geographic caveats in [DATASET](docs/DATASET.md).

Suitable licensed Indian crash-level data with multiple injury outcomes were not obtained. State totals cannot train an individual-crash classifier. A verified open media dataset contains fatal crashes only. Prediction, scenario comparison, speed exploration, batch inference and explanations therefore return a clear disabled state, including HTTP 410 at the API. No Indian accuracy, recall, F1 or confusion matrix is claimed.

The previous British model, map aggregates, category mappings and evaluation artifacts have been removed from the active release. Old saved payloads retain their original country and model version. Unknown legacy provenance remains unknown. See [the correction audit](docs/INDIA_AUDIT.md). History is temporary SQLite on the existing free Render service, not verified durable storage.

## Local development

Python 3.12.13 and Node 22. From the repository root:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements-dev.txt
.venv/Scripts/python -m uvicorn main:app --app-dir backend --reload
```

In another terminal, from `frontend`, run `npm ci`, set `NEXT_PUBLIC_API_URL=http://localhost:8000` in a local untracked environment file, then `npm run dev`. The browser calls `/api/service/*`; the Next.js gateway calls the backend. Optional backend variables: `DATABASE_URL`, `CORS_ORIGINS`, `HISTORY_DURABLE=false`. Never commit credentials or environment files. Obsolete model/dataset path overrides are no longer consumed.

## Verification

```powershell
.venv/Scripts/python -m pytest backend/tests -q
.venv/Scripts/ruff check backend/app backend/tests backend/scripts
.venv/Scripts/ruff format --check backend/app backend/tests backend/scripts
cd frontend
npm run lint
npm run typecheck
npm run test
npm run format:check
npm run build
npm audit --omit=dev --audit-level=high
npm run test:e2e
```

Playwright starts the local production frontend and API. To verify the public site, set `BASE_URL=https://roadsentinel-ashy.vercel.app`; no local servers or successful data responses are mocked. Only the dedicated outage test injects one failure, followed by a real retry.

Data preparation is offline, deterministic and checksum-pinned: [commands](docs/TRAINING.md). Runtime startup performs neither downloading nor training. Deploy only to the [existing hosting targets](docs/DEPLOYMENT.md).
