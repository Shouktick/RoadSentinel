# India-only correction audit

The table below records the initial aggregate-only correction at `5889df4`. A subsequent Karnataka research release restores supported Indian inference; see the update after the table. Statements about disabled endpoints describe that initial release, not current capabilities.

Audit started from deployed code `11d5a625bb091c5e80cef89c413838342028b121`, documentation HEAD `7690459`. Public backend health confirmed `stats19-gb-2022-v1`, SHA256 `e49395dcc9860c39980391616afb78b41fbf0dc8d14c69654484f2437cd71687`, before the correction. Existing Render free service and Vercel project were inspected; targets are preserved.

| British dependency / assumption | Previous locations | Correction |
|---|---|---|
| DfT STATS19 2022/2023 CSV and 2025 codebook URLs/checksums | source-manifest.json; download_data.py; verify_codebook.py; train_stats19.py; ignored data/source | Active source manifest and pipeline replaced by India PDF preparation. Old ignored downloads are not read, served or uploaded. Git history retains provenance. |
| Trained GB logistic model and 16-row explanation reference | release/model.joblib, model_metadata.json; services/model.py; predictor.py | Deleted from serving tree; no loader or inference dependencies remain. |
| Eight GB categorical mappings, Sunday=1, weather/road codes, 20-70 mph assumptions | app/domain.py; schemas/scenario.py; schemas.py; frontend/lib/domain.json; contracts; ScenarioForm; Speedometer | Deleted. Active fields are Indian state/UT, calendar year and three count measures, with no speed assumption. |
| Held-out 2023 metrics, selection/calibration/split claims | release/metrics.json, selection.json, split.json; /metrics; Dashboard; ModelCard; documentation | Removed from active release; API returns disabled status and evaluation is null. Historical evidence remains in Git history only and never supports India. |
| GB source aggregates and 0.1-degree coordinate cells, GB map centre | release/analytics.json; DatasetService; /hotspots; GeographicMap; HotspotWorkspace; AnalyticsExplorer | Replaced by MoRTH state/UT totals plus independently sourced Indian polygons. No points, centroids or invented observations. |
| Predictions, SHAP, scenario presets/comparison, posted-limit sweep, batch template/export | PredictionWorkspace, PredictionResult, ExplainLab, WhatIf, BatchWorkspace; prediction/explanation/batch routes and version aliases | All new inference paths disabled together. Old routes explain the limitation; API returns 410 before interpreting payloads. |
| Active GB labels/units, metadata and promotional text | Shell/onboarding, layout/manifest, About, dashboard, CSV, README/docs, obsolete Sidebar/upload helpers | Replaced with India-only analytics vocabulary; obsolete components and model environment example removed. |
| Saved original payloads and mph fields | Store, HistoryWorkspace, PredictionResult | Original payload retained. Country explicitly Great Britain for documented stats19-gb versions; unknown legacy country stays unknown. Separate historical view/export, no rerun or scenario sharing. |
| Foreign screenshots and old walkthroughs | docs/screenshots; AUDIT, DESIGN, PROGRESS, RELEASE | Current screenshots/docs replaced. Historical versions remain in Git history. |

The active backend contains no model artifact and cannot be switched to the foreign model using former model-path environment overrides. Test coverage asserts no model files, no foreign fallback, all prediction aliases disabled, and preservation/isolation of old records. Current release results identify India and the data version; historical results identify their original country and model.


## Karnataka research extension

The current serving tree adds a newly trained Indian-only JSON linear model; it does not restore any British artifact or numeric category mapping. Its independent source review is in [KARNATAKA_DATASET](KARNATAKA_DATASET.md). All national aggregate data remain separate from crash-level fitting. New active categories come from Indian training records; NH is expanded to National Highway in the UI and CSV results, and the source weather typo is explained when displayed. Speed uses explicit metric physics inputs, never the old mph model feature.

Prediction, what-if, batch and exact linear SHAP now use only the Karnataka model. Both JSON manifests are verified and corruption tests fail closed. Old country/version labels remain intact and foreign results cannot be rerun in the Indian model. The current model card shows new Indian test results, including the lower overall accuracy than the majority baseline. No historical British metric supports this release. National polygons plus Karnataka coarse observed-coordinate cells replace all foreign geometry.
