# Held-out evaluation: stats19-gb-2022-v1

**Interpretation:** the model selected slight injury for all test crashes. Fatal and serious recall are zero. It is unsuitable for classifying whether an individual crash will be severe. Probability quality improves modestly over a prior-frequency baseline; this does not validate safety decisions.

## Split sizes and class counts

| Split | Total | Fatal | Serious | Slight |
| --- | ---: | ---: | ---: | ---: |
| fit_2022 | 63602 | 961 | 14000 | 48641 |
| calibration_2022 | 21201 | 321 | 4666 | 16214 |
| validation_2022 | 21201 | 320 | 4667 | 16214 |
| Test 2023 | 104258 | 1522 | 23438 | 79298 |

All 2023 records were excluded from fitting, calibration and selection. IDs are unique within each source year. No oversampling. Source SHA256: `0c01d4194b4e4c5e1b242a43c633bc30e22cf16e8becca698e63a37f71410cfa`.

## Test metrics

| Measure | Selected model | Prior baseline |
| --- | ---: | ---: |
| accuracy | 0.760594 | 0.760594 |
| macro_f1 | 0.288007 | 0.288007 |
| balanced_accuracy | 0.333333 | 0.333333 |
| weighted_f1 | 0.657168 | 0.657168 |
| log_loss | 0.590404 | 0.605443 |
| brier_multiclass | 0.363452 | 0.370785 |
| ece_10_bins | 0.006850 | 0.004178 |

Multiclass Brier is the mean sum of squared errors over three probabilities (range 0?2). ECE uses ten equal-width bins of the top predicted probability; it is not a guarantee of class-specific or subgroup calibration. Reliability-bin counts and averages are included in metrics.json. No uncertainty interval or prospective validation is claimed.

## Per-class results

| Injury | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| Fatal injury | 0.000000 | 0.000000 | 0.000000 | 1522 |
| Serious injury | 0.000000 | 0.000000 | 0.000000 | 23438 |
| Slight injury | 0.760594 | 1.000000 | 0.864020 | 79298 |

Precision is reported as zero where no cases were predicted for a class.

## Confusion matrix

Rows = observed; columns = predicted. Column order: Fatal, Serious, Slight.

```text
[0, 0, 1522]
[0, 0, 23438]
[0, 0, 79298]
```

## Validation selection

| Candidate | Selected validation log loss | Macro F1 | Sigmoid calibration |
| --- | ---: | ---: | --- |
| prior_baseline | 0.601563 | 0.288904 | False |
| logistic | 0.584221 | 0.288904 | False |
| logistic_balanced | 0.588705 | 0.288904 | True |
| forest_balanced | 0.591670 | 0.288904 | True |

Lowest validation log loss (probability estimation is the product); ties use higher macro F1. Calibration only if validation log loss and Brier both improve. Class-weighted models are compared honestly, including their uncalibrated probability distortion.

The initial validation investigation considered macro F1 first; before opening the 2023 test, the criterion was changed to probability quality because raw class weighting inflated minority probabilities. Logistic regression won. Its sigmoid-calibrated version had worse validation log loss (0.589526 vs 0.584221) and Brier score, so calibration was rejected. Raw and calibrated reports for every candidate are retained in `backend/release/selection.json`. The selected estimator was frozen without refitting.

Full machine-readable evidence: [metrics.json](../backend/release/metrics.json), [selection.json](../backend/release/selection.json), [split.json](../backend/release/split.json). See [training design](TRAINING.md) and [source limitations](DATASET.md).
