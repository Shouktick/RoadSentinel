# Progress - India correction

The previous British release has been superseded. See [India correction audit](INDIA_AUDIT.md), [architecture](ARCHITECTURE.md), [dataset provenance](DATASET.md) and [current release verification](RELEASE.md). Historical documents remain available in Git history under commit `11d5a62`.


The Karnataka research extension restores prediction, explanations, what-if, batch, saved results, observed crash grids and an independent metric speed calculator. See [source review](KARNATAKA_DATASET.md), [evaluation](EVALUATION.md) and [model scope](MODEL_CARD.md). National statistics and regional crash research have distinct, visible coverage.
## Journey workspace refresh - 15 November 2026

Reworked the India overview into a task-first homepage with a custom road illustration, richer navy/mint visual system, responsive task cards and a temporary interactive departure checklist. Existing statistics remain available below the workspace; map, speed physics and Karnataka research are one click away. Region/year selections now generate plain-language count and year-over-year summaries, preserving missing values and distinguishing totals from personal risk.

Global panel, button and navigation styling is refreshed across existing routes. Motion is transform-based to preserve text contrast during transitions; road illustration movement stops after five seconds and reduced-motion preferences suppress movement. Color changes are immediate so theme switching does not create low-contrast intermediary text. Checklist controls have accessible labels and progress semantics.

Frontend lint, four component tests, formatting and production build passed. All 14 desktop/mobile browser tests passed, including real India data, regional map, Karnataka prediction/explanation/history/comparison, batch exports, stopping-distance calculator, outage recovery, new task shortcuts and checklist interaction. Browser accessibility checks passed in dark and light themes. No backend or training artifact changes were made.
