# Data and derived-artifact attribution

The existing MoRTH statistics and geoBoundaries/DataMeet geometry retain their separate permissions and attribution documented in [DATASET.md](DATASET.md).

`backend/release/karnataka-model.json`, `karnataka-metadata.json`, `karnataka-analytics.json` and their manifest derive from **Karnataka Accident Dataset v2**, published by **Shubham Sharma**, attributed to Karnataka State Police accident records. Source: https://www.kaggle.com/datasets/shubham2703/karnataka-accident-dataset . Licence: **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International**, https://creativecommons.org/licenses/by-nc-sa/4.0/ . These derived artifacts are distributed under that same licence. No endorsement is implied.

Modifications: filtered documented road-crash labels, removed short-identity and conflicting event groups, grouped rare/missing categorical values, trained a class-balanced multinomial linear model, computed held-out evaluation and exact linear SHAP references, aggregated retained counts and coordinate cells. No raw narratives, exact crash coordinates or identifying records are included in these artifacts. See [the full provenance and cleaning record](KARNATAKA_DATASET.md).

Software code licensing is separate from source and derived-data licences. The crash artifacts are for noncommercial research and demonstration; they are not licensed here for commercial use.
