# Karnataka crash-level research release

The national MoRTH dashboard remains unchanged. After the initial aggregate-only release, a renewed search found a separate Indian crash-level publication suitable for a limited research model. This does not turn national aggregate rows into crash examples.

## Publication, provenance and licence

- Publisher: Shubham Sharma, [Karnataka Accident Dataset, version 2](https://www.kaggle.com/datasets/shubham2703/karnataka-accident-dataset), published 2024-03-16. Metadata is accessible without credentials at `https://www.kaggle.com/api/v1/datasets/view/shubham2703/karnataka-accident-dataset`.
- The publication explicitly specifies [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). This project uses it for noncommercial research/demonstration. The derived Karnataka model, metadata and aggregate artifacts are offered under the same licence with attribution and modification notes. It is not a GODL-India claim or permission for commercial deployment.
- The original collection is attributed to Karnataka State Police accident records released for the [KSP Datathon 2024](https://hack2skill.com/hack/kspdatathon2024/). The organizer's accident-analysis brief describes these records and expected analyses. A [participant's publication](https://github.com/theshivam7/accident-severity-ml) links its [shared source folder](https://drive.google.com/drive/folders/1iHHYRkGRhYfO-lTaEjnrkO-QQE428WLU). This is corroborating provenance, not a government endorsement or a new government licence.
- The shared folder contains `Copy of AccidentReports.csv`, file ID `1iC7NS4Uw2VlNm6Zci_jA0faFJOrQ1aO2`. A 120,000-byte sample was downloaded for corroboration: the first 30 rows match the Kaggle publication on 29 structured fields and both numeric coordinates. Crime-number formatting and text encoding differ. This is a sample-level check, not a full-file identity assertion.
- The third-party description says it focuses on Bagalkot, but inspection finds 38 police district/unit names across Karnataka. These include city/district police divisions and railways; they must not be described as 38 administrative districts. The modeling filter excludes records not explicitly classified as road accidents.

Download: `https://www.kaggle.com/api/v1/datasets/download/shubham2703/karnataka-accident-dataset?datasetVersionNumber=2`.

| Artifact | SHA256 |
|---|---|
| Downloaded ZIP, 19,022,346 bytes | `fa841b6c420ee4a06ef7a9c4b12bb0de6c0f75123abf7c96882c88162d435134` |
| Published CSV, 153,696,154 bytes | `b7bcdd6a57a6a795ff366b2f95e5f1b5196c16ab4773c64daed1b5e531848edb` |
| Corroborating source sample, 120,000 bytes | `b86138567b5e99ac67fd378468f24d2d7c575b2d37fd6d0b49813c44fa275fdd` |

Raw files, source narratives, crime numbers, police-unit identifiers and exact coordinates are not redistributed in the repository or serving artifacts. The public derived files contain model coefficients, aggregate evaluation and counts only. Raw downloads stay in the ignored `backend/data/source/karnataka` directory.

## Codebook and measurement scope

The publisher documents all 36 columns. The retained model inputs are categorical: police district/unit, road type, weather, road surface condition, road geometry, junction control and area type. `NH` is displayed as National Highway. Options derive from training records only; infrequent values (under 100 training observations), missing markers, `Others` and implausible snow/hail entries are grouped under `Other / unknown`. The exact option lists are versioned in model metadata. There is no numeric speed, exposure or population input.

Targets retain the original labels **Damage Only**, **Simple Injury**, **Grievous Injury**, **Fatal**. These are recorded crash categories, not casualty counts or clinical diagnoses. The publication does not establish a clinically validated injury scale or a fatality follow-up interval; no such definition is invented. Class scores are conditional on a reported crash within the sample.

Coordinates are used only after checking them against the already documented illustrative Karnataka geometry. Display uses 0.1-degree cells with at least five retained records, not individual markers. Source-record concentration is not exposure-adjusted risk. Coordinates outside the polygon, invalid coordinates and low-count cells are excluded from the grid.

## Cleaning and leakage prevention

The published CSV has 301,761 rows for 2016-2023. Its long `Crime_No` values have been rounded to scientific notation, reducing them to 80 distinct values. They cannot identify independent events and are excluded entirely from modeling.

Event grouping instead uses a hash of normalized accident narrative plus district and police unit, across all years before splitting. Narratives are used for this deduplication only and never become model features or public examples. Short/missing narratives (less than 40 characters) cannot support this grouping and are excluded. Identical groups retain the earliest year; conflicting outcome groups are removed. Near-duplicate narratives can still evade exact matching, and removing insufficient narratives introduces selection bias.

| Step | Count |
|---|---:|
| Raw records | 301,761 |
| Excluded: not explicitly road accidents | 23,660 |
| Excluded: invalid outcome/year | 6,559 |
| Excluded: insufficient narrative for event grouping | 78,326 |
| Duplicate group rows | 3,771 |
| Conflicting groups removed | 997 |
| Retained unique groups | 188,448 |
| Training, 2016-2021 | 140,742 |
| Model selection, 2022 | 24,155 |
| Held-out evaluation, 2023 | 23,551 |

No records, labels, coordinates or accuracy numbers were synthesized. The previous British model and records are not training inputs. Cause assessments, collision descriptions, casualties, injury counts, IDs, narratives, year and coordinates are excluded from the model features. Vocabularies, frequency cutoffs, balancing and SHAP background use training years only. C is selected on 2022 macro F1 from 0.1, 1 and 10; 2023 is evaluated after selection and not refitted into the release.

## Limitations

This is a third-party publication with corroborated Indian provenance, not a certified police database. Its noncommercial licence, incomplete codebook semantics, lossy identifiers, missing narratives, inconsistent categories, reporting bias and historical coverage materially limit conclusions. The limited research model is not validated for other states, current conditions, personal safety, emergency response or insurance decisions. Published test performance is modest and visible in the application; see [EVALUATION.md](EVALUATION.md).
