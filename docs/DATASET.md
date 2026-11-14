# Dataset provenance and leakage review

## Selection and lawful access

The [official Indian road-accident catalogue](https://data.gov.in/catalog/road-accidents-india-classified-according-various-parameters) found during this review provides state/UT aggregate counts. Those tables cannot reconstruct individual crashes with linked pre-impact conditions and injury severity. This does not claim that no suitable Indian data exist; no accessible official record-level source meeting this task's requirements was verified.

The selected source is [Department for Transport road safety open data](https://www.gov.uk/government/statistical-data-sets/road-safety-open-data). Its downloadable collision CSVs and [data guide](https://assets.publishing.service.gov.uk/media/6ab2a71d997a4b2950cced58/dft-road-casualty-statistics-road-safety-open-dataset-data-guide-2025.xlsx) were downloaded without credentials and inspected on 14 November 2026. The current guide's `2024_code_list` sheet decodes the revised annual extracts, including older years. Neither casualty nor vehicle tables are joined.

The [official catalogue identifies OGL coverage](https://www.data.gov.uk/dataset/cb7ae6f0-4be6-4935-9277-47e5ce24a11f/road-accidents-safety-data). [OGL v3](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) allows copying, adaptation and commercial/non-commercial reuse subject to attribution and its exclusions. These are the publisher's public non-sensitive records. Only model parameters and aggregated geography are shipped. Contains public sector information licensed under the Open Government Licence v3.0. No official endorsement is claimed.

## Verified downloads

Exact URLs and SHA256 digests are machine-readable in `backend/source-manifest.json`. Reproduction fails closed if the publisher revises the files; review such changes instead of blindly updating pins.

| File | Rows | SHA256 |
| --- | ---: | --- |
| collisions-2022.csv | 106,004 | b0a704f7826f53774472254cf0dd5c0d2ec3fef006622a10a2a15f31571d4e7a |
| collisions-2023.csv | 104,258 | 0c01d4194b4e4c5e1b242a43c633bc30e22cf16e8becca698e63a37f71410cfa |
| codebook.xlsx | code guide | 51b08606ef3dad1ae5d4c8726241b022fc8e4bbdc910ef0e5cc2fb92b054fc12 |

The source files are ignored by Git and excluded from deployment. The release includes the relevant codebook extract and aggregate checksums. The download script verifies every byte against the pins.

## Target, units and coverage

`collision_severity`: 1 = Fatal, 2 = Serious, 3 = Slight. These meanings come from this source's codebook, not the retired model's class IDs. The target refers to the most severely injured casualty, as documented in [DfT's quality report](https://www.gov.uk/government/publications/reported-road-casualty-statistics-background-quality-report/reported-road-casualty-statistics-background-quality-report).

- Fatal: injury death less than 30 days after the collision, excluding confirmed suicides.
- Serious: non-fatal serious injury, including fractures, internal injuries or inpatient admission; includes injury deaths at 30 days or later. No casualty has a fatal injury in a serious collision.
- Slight: minor injury such as bruising, a sprain or a minor cut; no serious or fatal injury in that collision.

[STATS20 guidance](https://assets.publishing.service.gov.uk/media/6925a35433d088f6d5da2cf0/STATS20_2024_specification.pdf) establishes posted limits of 20, 30, 40, 50, 60 and 70 **mph**. This is not impact speed, observed vehicle speed, or km/h. The hour is parsed from `time` (HH:MM, local clock); it is not converted to UTC. Sunday is day 1, Saturday day 7.

Population: police-recorded personal-injury crashes on public roads in Great Britain (England, Scotland, Wales). Damage-only incidents, non-crash journeys and unreported incidents are absent. There is no exposure denominator. Consequently, the model cannot estimate crash occurrence, danger per journey, or India performance.

## Input eligibility

Intended use is a hypothetical road environment immediately before a crash, conditional on that crash being recorded. Although the source is collected after incidents, the selected attributes describe conditions already present before impact. Measurement/reporting error remains possible.

| Input | Why eligible |
| --- | --- |
| Posted speed limit | Road restriction already in effect; not inferred impact speed |
| Weather | Ambient conditions existing before impact |
| Road surface | Surface state before impact; not vehicle damage |
| Lighting | Daylight/street-light conditions before impact |
| Road type | Existing road layout |
| Urban/rural area | Existing road-area classification |
| Local hour | Hypothetical time context derived from time only |
| Weekday | Hypothetical calendar context |

Excluded: casualty counts and injury records; adjusted/enhanced severity and injury-reporting flags; vehicle counts (a collision realization, not a pre-impact environment input); police attendance; contributory factors and post-crash assessments; IDs, police force, coordinates and administrative location codes. Driver/vehicle tables are not joined; thus no ambiguous selection of a driver or duplicate rows per collision.

All eight inputs are categorically encoded. Missing or out-of-range source entries become -1, an explicit missing/unknown category. Known source `9` categories remain distinct where the guide defines them. `speed_limit=99` maps to unknown. Public requests accept only documented choices or -1 and reject unknown codes, booleans, fractions and extra fields. CSVs also accept readable choice labels. No imputation statistics are learned from test data.

## Geography and analytics

2023 observations use actual source `latitude`/`longitude`, never city centroids or model-generated points. Plausible Great Britain coordinate bounds are applied; missing or invalid coordinates are excluded and counts reported. Locations are aggregated to 0.1-degree cells using floor(latitude*10), floor(longitude*10); displayed markers are labelled cell centres. Cells with fewer than five records are suppressed. This is coarse display aggregation, not a formal anonymisation guarantee or risk heatmap. No geographic filters permit inference of suppressed individual locations.

The original grid reference is British National Grid. Public longitude/latitude fields are used directly for the coarse map; see [DfT's coordinate-processing guidance](https://www.gov.uk/government/statistics/matching-stats19-collision-data-to-a-road-network-feasibility/matching-stats19-collisions-to-a-road-network-feasibility). Analytics show source counts, not model predictions. Reporting differences, road exposure, the transition to injury-based police recording, and year-to-year changes constrain comparisons.
