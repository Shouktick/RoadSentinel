# India capability and model card

National analytics: `india-morth-2023-v1`, MoRTH aggregate counts for 36 states/UTs, 2021-2023. Dashboard, year/state comparisons, regional choropleth and CSV export use accident-event and person-count units. These rows never train the classifier.

Severity research: `india-karnataka-2016-2023-v1`, seven categorical context inputs and four published outcomes: Damage Only, Simple Injury, Grievous Injury, Fatal. Class-balanced multinomial logistic regression supports prediction, validated batch CSVs, comparisons, exact local/global linear SHAP, exports and saved-result reruns. Only Karnataka has supporting crash-level training records. [Source, codebook, cleaning and CC BY-NC-SA licence](KARNATAKA_DATASET.md).

Held-out 2023 macro F1 0.325904 and balanced accuracy 0.373466 outperform the majority baseline (0.157898 / 0.25). Overall accuracy 0.349624 is below baseline 0.461552. All four classes are predicted; recall ranges from 0.300 to 0.444. [Per-class recalls and confusion matrix](EVALUATION.md). This is a modest research model, not a validated safety or emergency-response tool. Scores are uncalibrated and conditional on a reported crash, not the probability of having an accident.

Karnataka crash patterns expose aggregate district/unit counts and 0.1-degree cells from observed coordinates, restricted to illustrative Karnataka geometry and at least five records per cell. Sample counts are not official statewide totals or exposure-adjusted risk. No individual point locations, narratives or raw IDs are served.

Speed exploration separately computes reaction distance, braking distance, stopping distance and kinetic energy from user assumptions (km/h, seconds, m/s², kg; outputs meters and kJ). It is not a fitted speed-risk relationship: measured speed is absent from the data. What-if outputs show associations, not causal effects or recommended actions.

Old saved results retain country, version, original categories/units and historical status. Foreign models cannot load through former environment overrides. No observations or evaluation results are invented. History is temporary on existing free hosting. Model/data-derived artifacts are noncommercial share-alike; nationwide crash-level validation and current-period validation remain unresolved.
