# RoadSentinel

[Live application](https://roadsentinel-ashy.vercel.app) · [Backend readiness](https://roadsentinel-api.onrender.com/health) · [Repository](https://github.com/Shouktick/RoadSentinel)

RoadSentinel explores **injury severity conditional on a police-recorded injury crash in Great Britain**. It does not predict whether a crash will happen. The legacy undocumented model has been removed, not relabelled.

The replacement uses official DfT STATS19 collision data, documented categories and mph posted speed limits. It includes prediction, exact local explanations, scenario comparison, posted-limit exploration, validated CSV batches, temporary isolated history, source analytics and an aggregated Great Britain map.

**Major limitation:** on 104,258 held-out 2023 crashes, the model chose slight injury every time. Serious and fatal recall are zero. Macro F1 is 0.2880 and balanced accuracy 0.3333. Probability estimates modestly improve on the class-frequency baseline (log loss 0.5904 vs 0.6054). This is an educational probability explorer, not a safety decision system. Overall accuracy of 76.06% reflects the majority class.

## Data and model

- Source: [DfT road safety open data](https://www.gov.uk/government/statistical-data-sets/road-safety-open-data), 106,004 collisions in 2022 and 104,258 in 2023.
- Coverage: England, Scotland and Wales; no validated India or Northern Ireland coverage.
- Licence: [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). Contains public sector information licensed under the Open Government Licence v3.0. No DfT endorsement is implied.
- Target: recorded severity of the most severely injured casualty. Documented fatal, serious and slight injury labels.
- Model: one-hot categorical preprocessing and multinomial logistic regression; `stats19-gb-2022-v1`.
- Artifact: 3,569 bytes; SHA256 `e49395dcc9860c39980391616afb78b41fbf0dc8d14c69654484f2437cd71687`.

Read [dataset provenance and leakage review](docs/DATASET.md), [training instructions](docs/TRAINING.md), [evaluation](docs/EVALUATION.md), [model card](docs/MODEL_CARD.md), [API](docs/API.md) and [deployment guide](docs/DEPLOYMENT.md).

## Run locally

Python 3.12.13 and Node 22. The pinned release artifact is already included; startup never trains or downloads source data.

```powershell
uv venv --python 3.12.13 .venv
uv pip install --python .venv/Scripts/python.exe -r backend/requirements-dev.txt
.venv/Scripts/python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Development defaults the frontend gateway to localhost:8000. Production requires `NEXT_PUBLIC_API_URL=https://roadsentinel-api.onrender.com`.

## Verify

```powershell
.venv/Scripts/python.exe -m pytest backend/tests -q
.venv/Scripts/ruff.exe check backend/app backend/tests backend/scripts
.venv/Scripts/ruff.exe format --check backend/app backend/tests backend/scripts
cd frontend
npm run lint
npm run typecheck
npm run test
npm run format:check
npm run build
npm run test:e2e
```

The desktop/mobile journeys use genuine model inference. The separate outage test deliberately returns a 503, then removes the interception and retries against the real backend. Set `BASE_URL` to a deployed frontend to run the same tests there.

## Operational limits

Existing free Vercel/Render targets are retained. The backend may sleep and take about a minute to wake. History is temporary SQLite storage, scoped to an unguessable browser token, and can disappear on sleep/restart/redeploy. Export results to retain them. Old records keep their original labels, inputs, explanations and model versions. No durable datastore or paid resource has been provisioned.
