# Karnataka held-out evaluation

Model `india-karnataka-2016-2023-v1`: class-balanced multinomial logistic regression, C=10 selected from 0.1/1/10 using 2022 validation macro F1. Fit: 140,742 event groups, 2016-2021. Validation: 24,155 groups, 2022. Untouched test: 23,551 groups, 2023. No final refit on validation/test.

Exact narrative/unit/district groups are separated across years before splitting; conflicting labels and short/missing narratives are removed. Near-duplicate narratives may escape exact matching, so absolute event independence cannot be guaranteed. No casualty counts, collision/cause descriptions, identifiers, coordinates, year or narrative features enter the model. Vocabulary, balancing and explanation background are fitted on training records only. The majority baseline predicts the most frequent training class, Grievous Injury.

| Test metric | Indian model | Majority baseline |
|---|---:|---:|
| Macro F1 | 0.325904 | 0.157898 |
| Balanced accuracy | 0.373466 | 0.250000 |
| Overall accuracy | 0.349624 | 0.461552 |

**Overall accuracy is lower than the majority baseline.** Macro F1 and balanced accuracy improve, and all four classes are predicted. Performance remains modest; no personal-risk calibration, nationwide validation or clinical usefulness is established.

| Outcome | Test support | Model recall | Baseline recall |
|---|---:|---:|---:|
| Damage Only | 1540 | 0.424675 | 0.000000 |
| Simple Injury | 4867 | 0.443805 | 0.000000 |
| Grievous Injury | 10870 | 0.325575 | 1.000000 |
| Fatal | 6274 | 0.299809 | 0.000000 |

Confusion matrix: rows are actual outcomes, columns are predicted, in the displayed order.

| Actual / predicted | Damage Only | Simple Injury | Grievous Injury | Fatal |
|---|---:|---:|---:|---:|
| Damage Only | 654 | 352 | 320 | 214 |
| Simple Injury | 1281 | 2160 | 854 | 572 |
| Grievous Injury | 2405 | 2722 | 3539 | 2204 |
| Fatal | 1356 | 1567 | 1470 | 1881 |

The JSON runtime reproduces sklearn labels on all test records. Exact interventional linear SHAP contributions plus the expected logit equal the selected class logit; they are not probability-point contributions or causal effects. Global importance is mean absolute contribution under training marginals.

Source coverage is historical Karnataka police records republished under CC BY-NC-SA 4.0. Filtering, missing narratives, lossy IDs, inconsistent source categories, reporting bias and geographic limits constrain generalization. The published severity names are recorded categories, not a clinical injury scale. No follow-up interval is invented. No Indian accuracy number comes from the retired British model. See [dataset review](KARNATAKA_DATASET.md), [model card](MODEL_CARD.md) and [release evidence](RELEASE.md).

## Additional score diagnostics

Scores are uncalibrated. Lower Brier score and log loss are better; these test diagnostics did not change model selection or calibration. Brier uses the sum over four classes (range 0-2). Log loss clips zero at 1e-15, including the majority baseline.

| Diagnostic | Model | Majority baseline |
|---|---:|---:|
| multiclass_brier_sum | 0.722002 | 1.076897 |
| log_loss | 1.322375 | 18.597351 |

| Outcome | Precision | Recall | F1 |
|---|---:|---:|---:|
| Damage Only | 0.114817 | 0.424675 | 0.180763 |
| Simple Injury | 0.317600 | 0.443805 | 0.370243 |
| Grievous Injury | 0.572376 | 0.325575 | 0.415059 |
| Fatal | 0.386163 | 0.299809 | 0.337550 |
