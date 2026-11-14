# Karnataka research release verification

Verified publicly on 2026-11-14. Application commit: `563a32d63b495ab2c8c136d2ad3d8e3a2e18a1c2`. National dataset: `india-morth-2023-v1`. Indian model: `india-karnataka-2016-2023-v1`. The previous aggregate-only deployment remains documented in [the archived report](releases/india-aggregate-only.md).

## Supported scope and genuine evaluation

National MoRTH analytics cover all 36 states/UTs, 2021-2023: dashboard, counts, trends, filters, accessible tables, CSV exports and regional polygons. Karnataka crash research separately supports four-outcome predictions, exact local/global linear SHAP, what-if comparisons, validated CSV batches, exports, opt-in saved results/reruns and aggregate crash-pattern maps. Speed exploration computes idealized metric stopping distance and energy from user assumptions; measured speeds are absent from the dataset, so it is not a learned speed-risk curve.

The [Karnataka source review](KARNATAKA_DATASET.md) records publisher Shubham Sharma, Kaggle publication v2, its CC BY-NC-SA 4.0 licence, sample-level corroboration against the KSP Datathon source file, codebook limitations and checksums. 301,761 published rows yield 188,448 retained event groups. No British data or model is used, and no Indian observations are fabricated. Raw narratives, IDs and individual coordinates are not published. MoRTH statistics and geoBoundaries/DataMeet geometry retain their [separate source permissions](DATASET.md).

On 23,551 held-out 2023 crashes, the research model has macro F1 **0.325904** versus majority baseline **0.157898**, and balanced accuracy **0.373466** versus **0.250000**. Overall accuracy is **0.349624**, lower than baseline **0.461552**. All four outcomes are predicted. Per-class recalls are Damage Only 0.424675, Simple Injury 0.443805, Grievous Injury 0.325575, Fatal 0.299809. Full precision, F1, confusion matrix, Brier score and log loss are in [EVALUATION.md](EVALUATION.md) and the live model card. The model is limited research, not a calibrated personal-risk or safety-critical system.

## Exact artifacts

Git-stored bytes were checked against both manifests before publishing. The model contains coefficients and training explanation references, with no pickle/ML runtime dependency.

| File | SHA256 |
|---|---|
| india-analytics.json | `90b3c9ea5d4ff37702e8590954eb3cea76bee4acf57050f994cadb46ef41b26b` |
| india-boundaries.json | `6d1e1eeb957cfe01e44b721a33c54f871456d9b59d362a5b9115e8f8c1abb7b8` |
| karnataka-model.json | `996b5266d8f18a18913a28da0f336d41fd0f16e19c8c81d70fc4adfb20802786` |
| karnataka-metadata.json | `06dfcb46279b3756ffdc5b610df894df01fa8b0413b3fc31e9070119c0f9ddf3` |
| karnataka-analytics.json | `b63c371886001525a78cdf4f95efa435cba064c45c58a9a82c6abe807b7d59d4` |

The public backend and frontend gateway report the exact application commit and model/aggregate hashes above. Their entire model metadata and Karnataka analytics responses were compared to the release JSON and matched.

## Quality and production evidence

[GitHub Actions run 43616223324](https://github.com/Shouktick/RoadSentinel/actions/runs/43616223324) passed for the application commit:

- 15 backend tests: source/artifact integrity, aggregate reconciliation, missing values, units, real inference/aliases, score normalization, exact explanation fidelity, unknown/foreign input rejection, CSV validation/limits/parity, physics, genuine non-majority evaluation, corruption failure and historical/session isolation.
- Four frontend component/contract tests; TypeScript, ESLint, Prettier, Ruff and production builds passed. Production dependency audit reported zero vulnerabilities.
- 12 real browser journeys passed locally, in Linux CI and against the **public production domain**. Desktop Chromium and iPhone 13 viewport emulation cover navigation, keyboard/axe checks, themes, national filters/CSV/maps, real prediction, stale-result clearing, local/global explanations, comparisons, CSV rejection and successful batch/export, saved history/rerun/deletion, physics, crash grid, evaluation and visible outage/retry. Only the dedicated outage response is injected; successful results use the real API/model.
- Additional public layout checks found no document-width overflow on prediction, comparison, explanation, model-card and crash-pattern pages in desktop/mobile viewports. Screenshots were reviewed. Mobile evidence is browser emulation, not physical-device testing.

| Existing target | Verified deployment |
|---|---|
| [Public frontend](https://roadsentinel-ashy.vercel.app) | Vercel `dpl_6kxLxnNV8sBQ3hTsnR9dZNSWgoVL`, READY, production, matching Git commit |
| Exact frontend build | `roadsentinel-k3tczq88b-hazrashouktick-1391s-projects.vercel.app` |
| [Backend readiness](https://roadsentinel-api.onrender.com/health) | Render `dep-dbs8qndg1s2s73eh63r0`, live at 16:35:04 UTC, matching Git commit |
| Backend instance | `srv-dbs3kotg1s2s73e3aal0-xk256` |

Render's existing public-repository service required a manual deployment after confirming no auto-deploy appeared. The Vercel CLI deployed to the existing project, the exact build's gateway health was verified, and that build was promoted. The production alias API confirms it points to the deployment above. The temporary automation bypass created for staged verification was revoked; zero bypass entries remained. Public production browser tests used no bypass.

Five measured warm predictions directly to Render had median reported model-plus-explanation inference 0.094 ms; observed wall time median 313 ms, max 801 ms. Five requests through the public gateway had median inference 0.099 ms and wall time median 591 ms, max 840 ms. These are small observations including network effects, not load-test or cold-start guarantees. Render sampled memory at 81.2 MiB at 16:36 and 84.0 MiB at 16:37 against its 512 MiB limit. No new instance error logs appeared from 16:35 through 16:37:59 UTC. Vercel error/fatal and HTTP 5xx queries returned zero records in the checked post-deployment windows.

## Remaining limits

Crash-level validation covers Karnataka only, not all India or current conditions. The source is a third-party publication with corroboration, lossy identifiers, incomplete severity semantics, selection/reporting bias and possible near-duplicates. Crash samples and coarse grids are not official state totals or exposure-adjusted risk. National boundary geometry remains illustrative. CC BY-NC-SA terms restrict the Karnataka derived artifacts to noncommercial use with attribution/share-alike conditions. History remains temporary on free Render storage; no durable datastore or paid resource was created. All earlier foreign results retain their original country/version/units when present.
