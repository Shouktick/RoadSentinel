# Reproducing the Indian aggregate release

No model is trained. The former British training path is retired and recoverable only from repository history (`11d5a62`), with its original country context. Never apply it to Indian records or rename its outputs.

Use Python 3.12.13 and the pinned preparation dependencies, separate from the web runtime:

```powershell
.venv/Scripts/python -m pip install -r backend/requirements-preparation.txt
.venv/Scripts/python backend/scripts/prepare_india.py
```

`prepare_india.py` downloads the official MoRTH PDF and pinned Indian geometry when absent, checks SHA256 before parsing, extracts three specific tables, retains source missing markers, checks 36 regions x 3 years, reconciles all published totals, matches every geometry name and simplifies display geometry. A changed source fails closed; review changes before updating checksums. Raw sources live under ignored `backend/data/source/india`.

Outputs: `backend/release/india-analytics.json`, `india-boundaries.json`, `india-manifest.json`. The manifest records byte checksums. Backend startup checks those checksums, India scope and the aggregate schema. Corruption disables data readiness; it cannot load a foreign model or fallback dataset. Neither downloads nor preparation run during hosting builds or startup.

Future predictive work requires a new Indian crash-level dataset review, leakage-safe features, duplicate/group controls, training/validation/untouched test splits, a baseline, per-class recall, macro F1, balanced accuracy and confusion matrix. A majority-only classifier is not an acceptable useful severity predictor. Aggregate rows are never eligible training observations.
