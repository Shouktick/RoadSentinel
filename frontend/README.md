# RoadSentinel India frontend

Run `npm ci`, configure the local untracked `NEXT_PUBLIC_API_URL`, then `npm run dev`. Production uses the same-origin Next.js gateway to the existing Render API. See the root README for quality checks and deployment.

Active pages show Indian state/UT aggregates, trends, regional polygons and CSV export. Former inference routes show a disabled explanation. Historical payloads retain original country/version and cannot be rerun. No foreign model or numeric category mapping is bundled for active prediction.
