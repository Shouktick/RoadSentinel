# Model card — stats19-gb-2022-v1

## Intended task

Estimate the distribution of **recorded injury severity**, conditional on a police-recorded personal-injury crash in Great Britain. The target is the most severely injured casualty in a collision. The model does not predict crash occurrence, actual speed, individual injuries, safe routes or causal effects of road changes.

Official STATS19 labels: fatal injury, serious injury, slight injury. Definitions, units, licence and eligibility are documented in [DATASET.md](DATASET.md). The original undocumented model was retired and its meanings were not guessed.

## Model and evidence

Multinomial logistic regression, C=1, max_iter=1000, random_state=20261114, with one-hot categorical preprocessing. Eight inputs: posted limit in mph, weather, surface, lighting, road type, urban/rural area, local hour and weekday. Missing values are explicit categories. No injury fields, counts of casualties/vehicles, post-crash assessments, coordinates or administrative IDs are inputs.

The 2022 data supply separate fitting, calibration and validation partitions. All 104,258 records from 2023 were held out. Lowest validation log loss selected the unweighted logistic model over class-balanced alternatives and a prior baseline. Sigmoid calibration worsened its validation probability quality and was rejected. See [training](TRAINING.md) and [complete evaluation](EVALUATION.md).

Test: macro F1 0.288007; balanced accuracy 0.333333; log loss 0.590404; multiclass Brier 0.363452. The prior baseline has log loss 0.605443 and Brier 0.370785.

**The most likely output was slight injury for every test record. Fatal and serious recall are both zero.** The apparent 76.06% accuracy reflects the majority class; it is not evidence of effective severe-injury classification. Probabilities improve modestly on the prior baseline, but are not individual safety measurements. No subgroup, India, prospective, uncertainty-interval or current-year performance claim is supported.

## Explanations

Exact interventional Shapley values for all 256 feature subsets, using 16 fixed real fitting records as the reference. Every prediction's original feature contributions are preserved with its model version. A separate SHAP implementation verifies per-feature fidelity in tests. Contributions shift a probability from its reference value; they do not establish causation. Feature independence and a small reference sample can yield unrealistic combinations. No unverified global explanation is presented.

## Release integrity and operations

Artifact: `backend/release/model.joblib` (3,569 bytes). SHA256: `e49395dcc9860c39980391616afb78b41fbf0dc8d14c69654484f2437cd71687`. The loader checks checksum, version, class set and feature order before loading. scikit-learn 1.8.0; runtime dependency versions are pinned. Source and codebook checksums, split hashes and selection results ship with the release.

No training at service startup or deployment. One Render worker. The live frontend uses the actual backend through its same-origin gateway. Free-host cold starts may take about a minute. Temporary SQLite history is token-isolated and can disappear on restart/sleep/redeploy; no paid resource or unverified durability claim. Legacy records retain original label text, units and model identity, and cannot be shared as new-model scenarios.

## Limits and non-use

This is an educational model-behaviour explorer. Do not use it for emergency response, insurance, enforcement, individual driving decisions or to claim an intervention will prevent a crash. Police under-reporting, force-specific injury recording, historical distribution shifts and omitted driver/vehicle characteristics limit validity. Training roads can recur in the temporal test; unseen-location generalisation is not measured. Map counts have no exposure denominator and are not safety scores.
