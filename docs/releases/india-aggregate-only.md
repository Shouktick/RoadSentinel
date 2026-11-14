# India-only release verification

Verification date: 2026-11-14. Application commit: `5889df4b7c5b4dc4b61e3f03b7700b9090c4a199`. Dataset: `india-morth-2023-v1`. Serving model: **none**.

## Sources and supported scope

The official MoRTH *Road Accidents in India 2023* report supplies 108 state/UT/year aggregates for all 36 regions across 2021-2023. Its publisher permits attributed, accurate reproduction under its website copyright policy; this is not a GODL claim. Separate geoBoundaries/DataMeet polygons have CC BY attribution and the upstream licence recorded in [DATASET.md](../DATASET.md). Geometry is illustrative because its metadata year is inconsistent with the included newer administrative units.

Supported features: national/state totals, three-year trends, state/year/measure filters, accessible tables, selected-row CSV exports, and an Indian regional choropleth. Accident counts are events; fatalities and injuries are people. Missing source dashes remain missing. There are no crash locations, exposure-adjusted risk rates or district observations in this release.

Prediction, batch inference, what-if, speed sweeps and explanations are disabled throughout the UI and API. No Indian model was trained or evaluated; per-class recall, macro F1, balanced accuracy and confusion matrix are not applicable. The assessed IIT Delhi news dataset contains fatal crashes only, and verified public multi-outcome iRAD records were not obtained. Aggregate rows are never expanded into training examples. Historical records retain their original country/version/labels; old British metrics provide no evidence for India.

## Reproducible artifacts

| File | SHA256 |
|---|---|
| india-analytics.json | `90b3c9ea5d4ff37702e8590954eb3cea76bee4acf57050f994cadb46ef41b26b` |
| india-boundaries.json | `6d1e1eeb957cfe01e44b721a33c54f871456d9b59d362a5b9115e8f8c1abb7b8` |

Both runtime artifacts use explicit UTF-8 bytes with LF endings. The initial candidate `7c3adb3` failed Linux checksum validation because text writes translated newlines on Windows; the corrected commit fixes the generator and manifest, and the hashes of Git-stored blobs are verified. The failed backend candidate never passed the health gate.

## Quality evidence

[GitHub Actions run 43611566735](https://github.com/Shouktick/RoadSentinel/actions/runs/43611566735) passed for the application commit:

- 15 backend tests: source/artifact integrity, totals, missing values, units, geography, every prediction alias disabled, no foreign fallback, and historical provenance/session isolation.
- Ruff checks and formatting; four frontend component/contract tests; TypeScript, ESLint, Prettier and production build.
- Production dependency audit: zero reported vulnerabilities.
- Eight real API/browser journeys in Chromium desktop and iPhone 13 viewport emulation: responsive navigation, keyboard/axe checks, live aggregate filters, CSV contents, all 36 polygons, disabled inference, temporary history, and explicit outage/retry. Mobile results are browser emulation, not physical-device testing.

## Hosted verification

| Target | Verified deployment |
|---|---|
| [Public frontend](https://roadsentinel-ashy.vercel.app) | Vercel `dpl_8aixsEJwdWf6zrq9gJ6hCURvB2eZ`, READY, production, application commit above |
| [Backend health](https://roadsentinel-api.onrender.com/health) | Render `dep-dbs82iknjr1c73avl470`, live at 15:56:21 UTC, same application commit |

Vercel's exact build URL is `roadsentinel-3lkrl8vkf-hazrashouktick-1391s-projects.vercel.app`. Authenticated checks of this staged build verified the unavailable prediction page, gateway health and prediction API's 410 response before promotion to the existing public alias. The temporary verification bypass created by the CLI was revoked; deployment protection was not disabled.

The public root returned HTTP 200 without authentication. Public gateway health identifies `country=India`, `ready=true`, `analytics_ready=true`, `model_available=false`, `severity_ready=false`, `model_version=null`, the application commit and the analytics hash above. All eight desktop/mobile browser journeys passed again on `https://roadsentinel-ashy.vercel.app` in 45.7 seconds, including real filter changes, exported values, missing Lakshadweep data, map geometry, disabled routes and history scope. Only the deliberate outage test intercepts a failure response; its retry reconnects to the real API. Production screenshots in `docs/screenshots/india-*.png` were refreshed and visually checked.

The new Render instance `srv-dbs3kotg1s2s73e3aal0-6xbgq` completed application startup in about 0.20 seconds (15:56:17.651-17.853 UTC). Its sampled memory was 68,820,990 to 73,531,390 bytes (about 65.6-70.1 MiB) against a 512 MiB limit. Three warmed direct aggregate requests returned HTTP 200 in 0.674, 0.460 and 0.938 seconds from this workstation. These short observations are not load-test results, latency guarantees or cold-start measurements.

The new Render instance's error-level logs from startup through 15:58:02 UTC were empty. Vercel runtime error/fatal and request HTTP-5xx queries for the promoted build from 15:57:00 through approximately 15:57:47 UTC returned zero records. Expected unsupported-inference responses are HTTP 410. The earlier checksum-failing deployment `dep-dbs81kgn74is7394ob1g` was rejected at 15:55:27 UTC and never became live; its health-check timeout delayed the corrected release. Both existing targets and plans are unchanged; no paid resources were created.

## Remaining limits

Suitable licensed Indian crash-level records with multiple documented injury outcomes remain the blocker for severity prediction. The current report slice is historical 2021-2023 coverage, not the latest annual release. The free Render instance can sleep, and its pre-existing SQLite history is temporary across restarts/deployments. This correction does not relabel old records or provide durable history storage.
