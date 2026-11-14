# Existing-target deployment guide

## Targets

- GitHub: https://github.com/Shouktick/RoadSentinel, main.
- Frontend: https://roadsentinel-ashy.vercel.app, Vercel `roadsentinel`, project `prj_GhzcuXW0pcXLGmD4J7rAjAK7DyTl`, team `hazrashouktick-1391s-projects`.
- Backend: https://roadsentinel-api.onrender.com, Render `srv-dbs3kotg1s2s73e3aal0`, workspace `tea-d47obdk9c44c73caqp40` / My Workspace, Oregon, free plan, one worker.

Retain these targets. The old Accident Atlas hosting is unrelated and unchanged. No paid resources are authorised. The existing Render service's direct configuration is the deployment source of truth; do not create another Blueprint service.

## Runtime setup

Render root: `backend`; Python 3.12.13. Build: `pip install -r requirements.txt` (includes the full pinned runtime lock). Start: `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`. Health path `/health` returns 503 if verified Indian analytics or the database is unavailable; otherwise 200. Severity prediction is intentionally disabled. Former `SHAP_ENABLED` and model-path overrides are ignored. `HISTORY_DURABLE=false`. Default database: temporary local SQLite. No durable datastore has been provisioned or verified.

The serving artifacts are `release/india-analytics.json`, `india-boundaries.json` and `india-manifest.json`. They contain Indian aggregate data and regional geometry, not a trained model. Source data remain ignored. Release artifacts and reports are checked into Git. No source download or fitting runs during builds/startup.

Vercel root: `frontend`; Node 22; Next.js; `npm ci`; `npm run build`. Production and preview use `NEXT_PUBLIC_API_URL=https://roadsentinel-api.onrender.com`. The browser talks only to `/api/service/*`; the server gateway calls Render. Never put credentials in NEXT_PUBLIC variables. `.vercelignore` excludes backend, virtual environments, source data, docs and environment files from frontend uploads.

## Release steps

Run the README quality checks and real desktop/mobile journeys first. Commit/push to the existing repository, capture the full commit SHA, and monitor the particular Render deploy to a terminal `live` state. A push alone is not evidence of a working release.

During this release, Render reported `autoDeploy=yes`, but no deployment appeared after the push (the preceding app commit had also not deployed automatically). The service was therefore deployed manually through the connected Render tool. Render documents that services connected by public repository URL require manual deployment even though branch metadata is available: https://render.com/docs/deploys. Check deployment history before triggering a deploy so a working automatic integration does not receive duplicate deploys.

The Vercel connector lacked team access during this release, while the authenticated CLI was already authorised for the correct team. The user had selected completion without Vercel Git integration. From the repository root:

```powershell
npx --yes vercel@65.16.0 deploy --prod --skip-domain --project roadsentinel --scope hazrashouktick-1391s-projects --non-interactive --yes
# Verify the returned production-target deployment, then promote that exact build:
npx --yes vercel@65.16.0 promote <verified-deployment-url> --scope hazrashouktick-1391s-projects --non-interactive --yes
```

Do not deploy from `frontend` while the project root-directory setting already points there. Do not print auth files or environment secrets. Existing deployment protection may require the access-protected-deployment skill for testing the staged URL; test the public production domain again after promotion.

## Gates and constraints

- Match `/health` code version to the Render deployment commit and aggregate SHA256 to the checked-in India manifest.
- Verify provider states, public frontend access and real gateway analytics, regional map, CSV export, disabled inference and isolated history.
- Verify count units, filter updates, responsive navigation, source analytics and licensed Indian state/UT polygons.
- Scan recent runtime logs and measure hosted API latency/memory. Local observations are not hosted guarantees.
- GitHub warns above 50 MiB and blocks files above 100 MiB; the India release JSON files are below 1 MiB in total. Raw CSV downloads are not committed or uploaded.
- Free Render service sleeps after inactivity; local changes are ephemeral. Explain the cold start and allow explicit retry. History is temporary and historical exports retain original country/model definitions and aggregate exports retain the Indian dataset version.

Observed deployment identifiers and production verification belong in [RELEASE.md](RELEASE.md), after the actual release has completed.
