# RoadSentinel frontend

See the repository [README](../README.md) for setup and [deployment guide](../docs/DEPLOYMENT.md) for the existing Vercel target.

The app calls `/api/service/*`, whose server route uses `NEXT_PUBLIC_API_URL`. Production and preview point to the RoadSentinel Render API. Do not commit environment files. `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run build`, and `npm run test:e2e` are the quality gates. Set `BASE_URL` for public deployed browser verification.

The model contract is the documented STATS19 replacement, not the old numeric-class model. Model/version, injury definitions and mph units are retained in results. Read the prominently displayed severe-injury performance limitation. History is temporary; maps display coarse source-coordinate aggregates for Great Britain.
