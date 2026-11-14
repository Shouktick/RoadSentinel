# Documented-model release verification

Verified 2026-11-14, approximately 15:05?15:09 UTC. This replaces the undocumented legacy release.

## Live targets and exact versions

- Public application: https://roadsentinel-ashy.vercel.app
- Backend readiness: https://roadsentinel-api.onrender.com/health
- Repository: https://github.com/Shouktick/RoadSentinel
- Deployed application commit (both providers): `11d5a625bb091c5e80cef89c413838342028b121`.
- Model: `stats19-gb-2022-v1`; schema version 2.
- Artifact SHA256: `e49395dcc9860c39980391616afb78b41fbf0dc8d14c69654484f2437cd71687`; 3,569 bytes.
- Render: `dep-dbs7gmlg1s2s73ede1n0`, service `srv-dbs3kotg1s2s73e3aal0`, terminal state **live**, finished `2026-11-14T15:05:40.348875Z`.
- Vercel: `dpl_4hXYhEz9mXQNxKQZfVqeJGQ3HysU`, state **READY**, production target, promoted after a real staged gateway prediction passed. Provider metadata reports the deployed commit above. Public alias resolves to this deployment.
- Immutable frontend build: https://roadsentinel-7b9gg9rym-hazrashouktick-1391s-projects.vercel.app (deployment protection applies).

A subsequent documentation-only commit records these observations and updated screenshots; it does not change the deployed application code. No paid resources or durable datastore were added. Existing targets and free Render plan remain unchanged.

## Checks completed

- 17 backend tests passed: documented category mappings and mph units; invalid/unknown inputs; normalization; artifact checksum, feature and label compatibility; actual original-feature SHAP contributions independently checked against `shap.ExactExplainer`; batch mapping/validation/exports; history isolation and original legacy labels.
- Backend Ruff lint and formatting passed.
- Frontend lint, TypeScript, formatting, 7 component tests, production build and production dependency audit passed (zero reported vulnerabilities).
- [GitHub Linux CI](https://github.com/Shouktick/RoadSentinel/actions/runs/43608006319) passed on the exact deployed commit, including pinned dependency installation and desktop/mobile browser tests.
- All 6 public Playwright desktop/mobile tests passed in 52.4 seconds using `BASE_URL=https://roadsentinel-ashy.vercel.app`. Predictions, explanations, comparison, posted-limit sweep, CSV template/upload/mixed valid-invalid rows/export, saved history/isolation/deletion, source map, analytics and model card used the real deployed gateway and model. Predictions asserted exact artifact hash, probability normalization and explanation additivity.
- Changed-input results clear; mobile navigation, keyboard command search, light/dark themes, horizontal overflow and automated WCAG 2 A/AA + 2.1 AA checks passed on tested screens. Automated checks do not establish complete accessibility compliance.
- The dedicated outage tests intentionally intercepted one request with a 503 to verify the message; the following retry used real production inference. Final successful inference was never mocked.
- An unauthenticated public HTTP request returned 200 without a login redirect. Both direct backend and public gateway health reported ready, correct commit and artifact hash, verified semantics, explanations available and `history_durable=false`.
- The temporary protection-bypass secret created by authenticated `vercel curl` for staged verification was revoked. Existing deployment protection was retained.
- Render error-level logs were empty from `15:05:00Z` through `15:07:44Z`. Vercel runtime error/fatal entries and HTTP 5xx records were empty from `15:05:40Z` through approximately `15:07:28Z`. An earlier staged health request encountered the old backend waking and correctly returned the new cold-start retry message; production verification occurred after the new backend became live.

Screenshots: [desktop result](screenshots/prediction-desktop.png), [mobile result](screenshots/prediction-mobile.png), [desktop dashboard](screenshots/command-center-desktop.png), [mobile dashboard](screenshots/command-center-mobile.png).

## Hosted resource observations

These are measurements of the actual free Render instance, not extrapolations from local performance or a load test.

- New instance: `srv-dbs3kotg1s2s73e3aal0-bb2lj`. Provider memory samples at 60-second resolution from `15:05:40Z` to `15:08:40Z` ranged from 109,641,730 to 171,814,910 bytes (104.6?163.9 MiB), against a reported 536,870,900-byte limit (approximately 512 MiB). Old-instance samples were excluded.
- Startup log: launch command at `15:05:00.152Z`, application startup complete at `15:05:38.650Z`: approximately 38.5 seconds including Python imports/process startup. The application lifespan stage took approximately 2.6 seconds. This is one deployment startup observation, not a guarantee for future cold starts.
- First staged prediction with exact explanation reported 527.767 ms. Five subsequent public gateway requests reported inference-plus-explanation times of 7.944, 8.281, 7.520, 8.267 and 7.564 ms; median 7.944 ms. Corresponding client round trips were 680.96, 563.20, 497.22, 464.79 and 652.70 ms; median 563.20 ms. These measurements include different amounts of network work and must not be compared as the same metric.
- The selected model and 16-row explanation reference are loaded once. No raw data downloads, fitting, large legacy forest, Numba or SHAP runtime package is needed in production. Exact local explanations use the deployed pipeline itself.

## Evidence and remaining limitations

The source is official DfT STATS19 2022/2023 police-recorded personal-injury collisions in Great Britain, under the Open Government Licence v3.0. [Dataset provenance](DATASET.md), [training procedure](TRAINING.md), [evaluation](EVALUATION.md) and [model card](MODEL_CARD.md) contain the pinned sources, definitions, checksums and reproducible commands.

The target is the most severe casualty injury conditional on a recorded injury crash. It is not crash likelihood, an India model, a safe-speed recommendation or a causal estimate. Posted limits use mph. Maps use actual source coordinates grouped into 0.1-degree cells with at least five records, not invented crash points.

The untouched 2023 test has 104,258 collisions. Macro F1 is 0.2880, balanced accuracy 0.3333, log loss 0.5904 and multiclass Brier score 0.3635. The selected model classified every test collision as slight injury: fatal and serious recall are both zero. Its probability scores modestly improve on the prior baseline, but its severe-outcome classification is unusable. This is prominently disclosed throughout the interface. The full probability distribution is an educational exploration aid, never a basis for judging road safety.

Free-host cold starts remain possible; history is temporary SQLite and can disappear on restart/redeploy. Exports retain model/version and label definitions. There is no verified durable storage, guaranteed service availability, independent geographic validation or demonstrated transfer to India. No remaining access/deployment blocker was observed.
