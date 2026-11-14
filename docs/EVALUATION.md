# Evaluation status - India release

**No Indian severity model is deployed, trained or evaluated.** There are no new accuracy, per-class recall, macro F1, balanced accuracy, calibration or confusion-matrix results. Such values are not zero; they are not applicable because there is no eligible training/evaluation dataset or model.

The former British classifier and its metrics have been removed from active endpoints and the UI. Its historical evaluation is available in Git history under commit `11d5a62`; those results provide no evidence for India. Its majority-only predictions must not be treated as a useful Indian severity predictor.

Current data validation checks source hashes, all 108 state/UT-year rows, exact published national totals, missing-value preservation, one-to-one matching of all 36 regional polygons, CSV units/version, disabled prediction endpoints and preservation of historical country/labels. These are software/data integrity checks, not model-accuracy evidence. Test and deployment evidence is recorded in [RELEASE.md](RELEASE.md).
