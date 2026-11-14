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
