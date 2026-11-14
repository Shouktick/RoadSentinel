# India capability card

- Country: India only for active analytics.
- Dataset: `india-morth-2023-v1`; MoRTH 2021-2023 state/UT aggregates.
- Serving model/version: none.
- Prediction, comparison of hypothetical scenarios, speed exploration, batch inference and explanations: disabled (HTTP 410).
- Evaluation: not applicable. No Indian accuracy or class-performance claim is made.

Supported: dashboard, annual and state/UT comparisons, regional choropleth, accessible tables, aggregate CSV export, and access/export/deletion of original historical records. Units are reported accident events and persons killed/injured. These are not individual severity categories or probability estimates. The tables contain no speed values or crash coordinates.

The public iRAD system does not provide verified open multi-outcome records in the sources reviewed. The open IIT Delhi media dataset is fatal-only and cannot establish severity discrimination. [Dataset assessment and licence evidence](DATASET.md) documents the decision.

The previous foreign model is removed from the serving release. Historical records retain their original model version and country; unknown legacy provenance is not guessed. There is no current safety score, recommended driving speed, synthetic record fallback or foreign model substitution.

The map uses explicitly attributed illustrative regional boundaries, not incident locations. Counts are not exposure adjusted, data may underreport events, and the selected report is historical. History is temporary on free hosting. Future model release requires suitable Indian observations and held-out results demonstrating more than majority-class behaviour.
