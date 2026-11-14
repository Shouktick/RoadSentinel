# Indian data provenance and suitability

Dataset version: `india-morth-2023-v1`. Country: India. Granularity: state/union territory and calendar year. This is a pinned historical release, not a claim to publish the latest available annual report.

## Statistics

Publisher: Transport Research Wing, Ministry of Road Transport and Highways, Government of India. Source: [Road Accidents in India 2023](https://morth.gov.in/backend/documents/uploaded/Road-Accident-in-India-2023-Publications.pdf), police-reported aggregates collected from states/UTs. Downloaded without credentials on 2026-11-14.

SHA256: `901505420d5b387052ac51e36b4bdce0274f6326b614f9ebcee6e7954d45b5b0`.

| Field | Definition / unit | Source |
|---|---|---|
| state | Official source state/UT name; merged Dadra & Nagar Haveli and Daman & Diu kept together | All three tables |
| year | Calendar year, 2021-2023 | All three tables |
| accidents | Reported road accidents; events | Annexure 2, printed p112 / PDF p141 |
| fatalities | Persons killed in reported road accidents; people, not fatal crash counts | Annexure 3, printed p114 / PDF p143 |
| injuries | Persons injured; people, not slight/serious class labels | Annexure 4, printed p116 / PDF p145 |

All 36 regions are retained for each of three years (108 aggregate rows). The three tables were rendered and visually inspected before extraction. The pinned PDF is extracted with PyMuPDF; names join exactly after whitespace normalization. Known counts reconcile with each separately published national total. In 2023: 480,583 accidents, 172,890 persons killed, 462,825 persons injured.

The dash for Lakshadweep fatalities in 2023 is preserved as `null` plus `source_missing: {fatalities: "-"}`. It is displayed as not reported and exported as blank, never silently converted to zero. National totals come from the report's total rows, not an imputation. 2020 is excluded to avoid its missing separate Ladakh observation. Counts cannot estimate individual risk or be compared as exposure-adjusted safety rates. There are no crash coordinates, speed measurements or individual severity classes in these selected tables; no mph/km/h conversion is applicable.

## Reuse permission

[MoRTH copyright policy](https://morth.gov.in/website-policies/copyright-policy), read through its public [content API](https://morth.gov.in/backend/api/copyright-policy), permits free reproduction without specific permission provided it is accurate, not misleading, and prominently attributed. Third-party material is excluded. This is the applicable publisher permission, **not an assertion that this PDF has a GODL-India or UK OGL licence**. Attribution accompanies the UI and CSV source URL. No third-party imagery or government logo is redistributed. The policy verification checksum is recorded in `backend/source-manifest.json`.

## Regional geometry

[geoBoundaries IND ADM1 metadata](https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/) identifies boundary ID `IND-ADM1-1811400`, source DataMeet India community / Election Commission of India. Pinned geometry: commit `9469f09`, file `geoBoundaries-IND-ADM1_simplified.geojson` ([download](https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1_simplified.geojson)). SHA256: `4c63fe43294a391e8f2de4e9f86f3edb60f8688275b9fee90c61fb2aa0c26061`.

geoBoundaries publishes gbOpen under CC BY 4.0 and records this upstream release as CC BY 2.5 India. [DataMeet](https://github.com/datameet/maps) currently states CC BY 4.0 for its datasets. Credit both geoBoundaries and DataMeet; retain the pinned metadata's original licence statement. Geometry is WGS84 longitude/latitude in GeoJSON and is simplified by 0.015 degrees with topology preservation for display. Diacritics and '&' vs 'and' are normalized solely to join names; each geometry retains its source ID/name. All 36 regions match one-to-one.

The metadata year says 2011 despite including Ladakh, Telangana and the merged UT. This inconsistency is disclosed: the map is illustrative regional geometry, not a certified boundary survey or verified 2023 boundary vintage. The app shows polygons only, with no crash points, city centroids, basemap or hotspot claims. Accessible tables support every small territory.

## Crash-level assessment and blocker

- [MoRTH recording/reporting formats](https://morth.gov.in/sites/default/files/circulars_document/Revised_Road_Accidents_Data_Recording_and_Reporting_Formats.pdf) distinguish individual records from aggregated reporting forms. Public state totals cannot be expanded into training examples.
- [iRAD/eDAR official manual](https://irad.parivahan.gov.in/downloads/iRAD_MANUAL_May_2024.pdf) describes authenticated departmental access. No public multi-outcome record download with verified reuse permission was obtained.
- IIT Delhi authors' [Media Reported Road Traffic Crash Data v7](https://data.mendeley.com/datasets/bc5sv6wnd9/7), DOI `10.17632/bc5sv6wnd9.7`, explicitly licenses the dataset CC BY 4.0. Its [data paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC12098169/) documents 2,898 fatal crashes reported by Times of India in 2022-2023, with a data dictionary. It is legitimately published Indian crash-level data, but fatal-only selection and news reporting bias make it unsuitable for a fatal/serious/slight classifier. It was assessed, not used to train or populate this dashboard.
- Synthetic and unknown-provenance 'Indian accident' repositories were excluded, as were all foreign records and models.

This is a documented search outcome, not a claim that suitable Indian records do not exist anywhere. The unresolved requirement for prediction is accessible licensed Indian crash-level observations with documented multiple outcomes, eligible pre-outcome inputs, geographic/temporal coverage and adequate class support.
