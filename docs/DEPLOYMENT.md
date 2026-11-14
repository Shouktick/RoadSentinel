# RoadSentinel standalone deployment

The new project uses the RoadSentinel name independently of the old Accident Atlas hosting configuration.

## Intended targets

- GitHub source: `Shouktick/RoadSentinel`, with the owner explicitly selected by the user.
- Vercel frontend: `roadsentinel` in `hazrashouktick-1391s-projects`.
- Render backend: a new `roadsentinel-api` service in the user-selected `My Workspace`.
- Old repository and old hosting services are retained. Do not redirect changes to those resources.

Source layout is a monorepo. For Git-based Vercel deployments, set the root directory to `frontend`, framework Next.js, Node 22, install `npm ci`, build `npm run build`. For a local CLI upload after setting that root directory, upload from the repository root with the explicit RoadSentinel project; do not upload `frontend` as if it were the monorepo root. `.vercelignore` excludes backend artifacts, virtual environments, local credentials and generated output from frontend uploads.

Render uses root `backend`, Python 3.12.13, install `pip install -r requirements.txt`, and start `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`. Use the free compute plan unless the user explicitly approves otherwise. Set `SHAP_ENABLED=true` and `HISTORY_DURABLE=false` for ephemeral default storage. Configure `NEXT_PUBLIC_API_URL` in Vercel production and preview to the actual returned Render backend URL; never guess the assigned hostname.

## Memory verification

The full-forest SHAP representation exceeded a 512 MiB free instance budget in local measurement. Exact SHAP is now computed tree by tree and averaged across the original 200-tree forest, preserving the model's averaging rule. A regression test compares the bounded implementation with full Tree SHAP to 1e-10 tolerance. The large trusted model member is streamed through a temporary file after checksumming, avoiding simultaneous large byte buffers.

Windows process measurement after actual model loading and a local SHAP prediction: approximately 288 MiB resident, 366 MiB peak, versus approximately 563 MiB for the former full-forest explainer. These are local operational measurements, not model accuracy metrics or guarantees of Linux host resource use. Verify actual Render startup, runtime, logs and inference before marking the deployment live.

## Verification gates

1. Confirm the new repository owner, pushed commit and configured source URLs.
2. Wait for the particular Render deploy to reach live; check `/health`, actual normalized class probabilities, local SHAP additivity, CSV, and scoped history behavior.
3. Build a production-target Vercel deployment, verify its gateway against the actual backend, then promote the tested build and record its assigned production URL.
4. Confirm live web routes and model response behavior. Record failures honestly; queued/building status is not success.
5. The original dataset/codebook is still unavailable. Deployment does not validate severity meanings, canonical speed units, evaluation metrics or geographic observations.

Deployment identifiers, URLs and final verification results are recorded below after they have been observed.

## Observed release ? 14 November 2026

- Repository: https://github.com/Shouktick/RoadSentinel (public, owned by Shouktick).
- Production application: https://roadsentinel-ashy.vercel.app.
- Backend: https://roadsentinel-api.onrender.com; readiness: https://roadsentinel-api.onrender.com/health.
- Vercel project: `prj_GhzcuXW0pcXLGmD4J7rAjAK7DyTl`, team `hazrashouktick-1391s-projects`, Next.js, Node 22.
- Final application commit: `0a4ff255fe14382993f462b774a4294dd890590d`.
- Final frontend deployment: `dpl_FRn4bqZcw3pGqtHXwP2YmiiA7Pzk`, production target, READY, promoted after gateway readiness verification. Build output completed in 31 seconds.
- Render service: `srv-dbs3kotg1s2s73e3aal0`, `roadsentinel-api`, free plan, Oregon, workspace `tea-d47obdk9c44c73caqp40` / My Workspace.
- Render deploy: `dep-dbs3kp5g1s2s73e3ab4g`, LIVE, backend commit `84511320ecb9afc32d1bc2e196da876d0127c324`. Subsequent commits only changed frontend and documentation; backend source is identical.
- Render source: `https://github.com/Shouktick/RoadSentinel`, branch `main`, root `backend`, one worker. Direct service configuration is the deployed source of truth; the optional Blueprint is not managing this resource.
- Vercel production and preview both have `NEXT_PUBLIC_API_URL=https://roadsentinel-api.onrender.com`.

### Verified behavior

Public production gateway health returns HTTP 200 with `ready=true`, model/database available and SHAP available. Actual model probabilities sum to one. Seven local SHAP contributions reconstruct the predicted class probability within 1e-5. Through the deployed Vercel gateway, mixed valid/invalid CSV processing, invalid categorical input, saved-record owner isolation and deletion all passed. These checks use explicit test scenarios, not training or evaluation data.

Local final checks: frontend format, lint, TypeScript, six component tests, production build and all six desktop/mobile browser tests passed. The release CI run also passed backend tests/lint, frontend checks/build/security audit and all six browser tests: https://github.com/Shouktick/RoadSentinel/actions/runs/43587260951.

Mobile CSV verification found that the visually hidden native file input inherited full-width input styling and caused horizontal overflow and a viewport offset. The picker input now uses the native `hidden` attribute while the labeled button opens it. The existing browser journey checks batch-page overflow and completes ordinary clicks without forced interactions.

The five-minute Vercel runtime error query returned zero entries at verification time. This is a bounded observation, not a guarantee of future availability. The temporary automation bypass created by the Vercel verification CLI was revoked after testing; deployment protection remains enabled for protected deployment URLs.

All six browser tests also passed against the public production URL, covering desktop and mobile accessibility/navigation, actual prediction and SHAP, saved history, what-if/speed sweep, CSV validation and explicit outage handling (48.2 seconds).

### Deployment operations

Render is configured to deploy backend changes from the new repository. Vercel rejected Git linking because its GitHub app lacks access to Shouktick/RoadSentinel. The user explicitly selected completion without Vercel auto-deploy. Production uses authenticated CLI uploads from the repository root:

```powershell
npx --yes vercel@65.16.0 deploy --prod --skip-domain --project roadsentinel --scope hazrashouktick-1391s-projects --non-interactive --yes
# Verify the returned production-target deployment, then promote that exact URL:
npx --yes vercel@65.16.0 promote <verified-deployment-url> --scope hazrashouktick-1391s-projects --non-interactive --yes
```

Free Render instances can sleep after inactivity, and initial model startup can delay requests. The gateway reports backend unavailability and supports retry. Default SQL history is ephemeral (`HISTORY_DURABLE=false`); durable hosted history requires a separately configured datastore. Original class meanings, speed units, held-out accuracy and source geography remain unverified because the dataset/codebook is unavailable.
