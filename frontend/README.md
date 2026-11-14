# RoadSentinel India frontend

Run `npm ci`, configure the local untracked `NEXT_PUBLIC_API_URL`, then `npm run dev`. Production uses the same-origin Next.js gateway to the existing Render API. See the root README for checks/deployment.

National pages show MoRTH state/UT aggregates, trends, polygons and CSV export. Karnataka research pages provide four-outcome prediction, local/global linear SHAP, what-if comparison, batch inference, observed crash grids and saved-result reruns. Speed explorer computes idealized stopping distance and energy from explicit user assumptions in km/h, seconds, m/s² and kg; it is not a learned speed-risk curve. Model evaluation, licence and geographic limitations are visible. Legacy records preserve their original country/version and cannot be rerun using the Indian model.
