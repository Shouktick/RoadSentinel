# Reproducing the Indian releases

Use Python 3.12.13. Offline dependencies are separate from runtime. Raw source files are ignored and must never be committed. No training/download occurs at hosting startup.

## National tables

```powershell
.venv/Scripts/python -m pip install -r backend/requirements-preparation.txt
.venv/Scripts/python backend/scripts/prepare_india.py
```

The script downloads/checksums the official MoRTH PDF and pinned geometry, extracts three tables, preserves missing values, reconciles totals and matches all 36 regional boundaries. Outputs are the three `india-*.json` release artifacts.

## Karnataka model

Read [source review and licence](KARNATAKA_DATASET.md) first. Download the pinned v2 ZIP into ignored `backend/data/source/karnataka/download.zip`:

```powershell
curl.exe --location --max-time 120 --retry 1 --output backend/data/source/karnataka/download.zip 'https://www.kaggle.com/api/v1/datasets/download/shubham2703/karnataka-accident-dataset?datasetVersionNumber=2'
.venv/Scripts/python -m pip install -r backend/requirements-training.txt
.venv/Scripts/python backend/scripts/train_karnataka.py
```

Create that source directory if absent. The pinned ZIP checksum fails closed if upstream bytes change. CSV decoding matches the publication's cp1252 encoding. The script hashes normalized narratives plus police unit/district for grouping before temporal splitting; text, identifiers and post-outcome proxies never enter the features. It excludes ambiguous groups, fits vocabulary and class weights using training years only, selects C on validation macro F1, then evaluates the held-out year against a majority baseline. No oversampled or synthetic observations are created.

Release gates require all four predicted classes, all recalls above 0.02, macro F1 over baseline by 0.03 and balanced accuracy above 0.30. These are modest research gates, not safety validation. Portable JSON labels are compared to sklearn on every held-out row. Local/global explanations use training marginal frequencies, never test data. Full limitations and genuine metrics are in [EVALUATION](EVALUATION.md).

The four `karnataka-*.json` artifacts contain coefficients, metadata, aggregates and a checksum manifest. Licenced raw narratives, personal data, identifiers and individual coordinates are not exported. Outputs are UTF-8 bytes with LF endings; verify Git-stored blob hashes against both manifests before deployment. British training code exists only in repository history and is never used by these scripts.
