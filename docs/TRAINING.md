# Reproduce training and evaluation

Use Python 3.12.13. Runtime dependencies are pinned transitively in `backend/requirements.lock`, installed by `requirements.txt`; training dependencies are pinned separately. Node dependencies use the committed `package-lock.json` and `npm ci`.

From the repository root on Windows:

```powershell
uv venv --python 3.12.13 .venv
uv pip install --python .venv/Scripts/python.exe -r backend/requirements-training.txt
.venv/Scripts/python.exe backend/scripts/download_data.py
.venv/Scripts/python.exe backend/scripts/verify_codebook.py
.venv/Scripts/python.exe backend/scripts/train_stats19.py train
.venv/Scripts/python.exe backend/scripts/train_stats19.py evaluate
```

On Linux use `.venv/bin/python` instead. `all` combines the last two commands in that order. Download access requires no credentials. Source files live under ignored `backend/data/source`. A changed checksum is an explicit blocker until the new source is reviewed.

## Experiment design

One row per collision; collision IDs must be unique and years must match. No oversampling or synthetic records. No casualty/vehicle join. Repeated input combinations are valid distinct crashes, not duplicate identities. Train/test are temporally separated: 2022 development and the entire 2023 test. Development data are sorted by ID and stratified into 60% fitting, 20% calibration, 20% validation with seeds 20261114 and 20261115. Group leakage within a collision is impossible because there is only one record per collision; the design does not promise generalisation to unseen roads or police forces.

`app/domain.py` defines the sole feature allowlist, missing-value policy and explicit category mappings. All features, including posted limit and hour, are one-hot categories with source-defined categories fixed in advance. One-hot encoding avoids treating numeric codes as ordered measurements. No target information enters preprocessing.

Candidates: prior-frequency baseline; multinomial logistic regression (`C=1`, max_iter=1000); class-balanced logistic regression; class-balanced random forest (100 trees, maximum depth 12, minimum leaf size 40, max_features=0.8). Single-thread computation and fixed seeds limit resource use and improve reproducibility. The calibration partition is used only for sigmoid fitting around a frozen estimator; validation determines whether calibration improves both log loss and multiclass Brier score.

Final selection prioritises validation log loss, with macro F1 as a tie-breaker, because the application presents probabilities. During validation review, the initial macro-F1-first rule was rejected: class weighting produced severely distorted probabilities. This decision was made **before evaluating 2023**. All raw and calibrated validation scores remain in `release/selection.json`. The selected unweighted logistic model was not refitted after selection; sigmoid calibration did not improve it. The final 2023 test was evaluated only after the artifact/selection were frozen. No thresholds were adjusted using the test findings.

## Outputs and explanation

`backend/release/` contains the compressed model bundle, manifest, split counts/ID hashes, selection evidence, held-out metrics and source-derived aggregates. The bundle includes the complete fitted pipeline and 16 seeded actual fitting records used as the explanation reference; they contain only eight road/time categories and no coordinates or identities.

Explanations enumerate all 256 subsets of the eight original inputs, evaluate each subset against the 16 reference records, and apply exact Shapley weights. They explain the whole probability pipeline, including calibration if selected. Contributions sum to output minus reference probability. An independent `shap.ExactExplainer` test verifies each contribution, not merely the sum. SHAP is a development-test dependency, not a production dependency. Independence-based substitutions can be unrealistic, and a small reference sample limits representativeness. There is no claim of causal effect or of global feature importance.

The manifest pins the joblib SHA256 and scikit-learn version; startup checks the artifact size, hash, feature order, class mapping and version before deserialising this trusted repository artifact. Never load user-uploaded joblib files. JSON reports include the selected model version and source fingerprint. No training, source downloading or expensive dataset processing runs at startup or in provider builds.

## Updating deliberately

A new dataset, feature contract, tuning decision or label definition requires a new model version and an independent test plan. Preserve existing result payloads and definitions; never migrate numeric old labels into the new meanings. Re-run backend, frontend, real browser and production checks. Regenerate reports and review resource limits before release.
