import Link from "next/link";
import { ArrowRight, ExternalLink, Github } from "lucide-react";
import { PageTitle, Panel } from "./ui";

export default function About() {
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="RESOURCES / DOCUMENTATION"
        title="Engineering you can inspect."
        description="RoadSentinel turns an existing accident severity model into a transparent exploration workspace."
      >
        <a
          className="button"
          href="https://github.com/Shouktick/RoadSentinel"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={15} />
          Repository <ExternalLink size={13} />
        </a>
      </PageTitle>
      <Panel
        title="How RoadSentinel works"
        subtitle="A real model path with explicit evidence boundaries"
      >
        <div className="architecture">
          <span>Validated scenario</span>
          <ArrowRight size={16} />
          <span>FastAPI model service</span>
          <ArrowRight size={16} />
          <span>Class probabilities + Tree SHAP</span>
        </div>
        <div className="doc-content">
          <p>
            The platform explores the outputs of the original Random Forest
            artifact. Seven scenario fields are validated and ordered before
            actual inference. Explanations come from Tree SHAP for the predicted
            numeric class. Scenario comparison and speed-limit sweeps reuse this
            same inference service.
          </p>
          <p>
            RoadSentinel estimates model classes conditional on incident data;
            it does not estimate an individual&apos;s chance of crashing. The
            original dataset and training codebook are unavailable. Severity
            meanings, speed units, held-out evaluation, India coverage, and
            dataset aggregates cannot currently be verified.
          </p>
        </div>
      </Panel>
      <div className="two-columns">
        <Panel title="What you can do">
          <div className="tool-links">
            {[
              [
                "/predict",
                "Run an actual model prediction",
                "Inspect normalized probabilities and signed local contributions.",
              ],
              [
                "/what-if",
                "Compare hypothetical scenarios",
                "Observe probability differences and speed-limit sweeps.",
              ],
              [
                "/batch",
                "Process and export a CSV",
                "Preserve rows, inspect validation errors, and download results.",
              ],
              [
                "/history",
                "Revisit saved scenarios",
                "Search server-side records scoped to your browser session.",
              ],
            ].map(([href, title, description]) => (
              <Link key={href} href={href}>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ExternalLink size={15} />
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="Architecture & technology">
          <div className="doc-content">
            <p>
              Frontend: Next.js App Router, strict TypeScript, Tailwind, an SVG
              HUD design system, TanStack Query, Zod, React Hook Form, and
              Framer Motion. Maps load Leaflet only when verified geographic
              observations exist.
            </p>
            <p>
              Backend: FastAPI, Pydantic, scikit-learn, pandas, Tree SHAP,
              SQLAlchemy, and SQLite/PostgreSQL support. Model initialization
              checks pinned artifact hashes and library compatibility.
            </p>
            <p>
              A same-origin API gateway centralizes backend configuration.
              Backend request limits, safe errors, session-scoped history, and
              provenance checks keep product behavior explicit.
            </p>
          </div>
        </Panel>
      </div>
      <Panel
        title="API & local development"
        subtitle="Detailed setup and contracts are maintained in the repository"
      >
        <div className="doc-content">
          <p>
            Interactive backend API documentation is available at your
            configured backend&apos;s <code>/docs</code> route. The repository
            contains <code>docs/API.md</code>, <code>docs/ARCHITECTURE.md</code>
            , <code>docs/DESIGN.md</code>, <code>docs/MODEL_CARD.md</code>, and
            the original audit.
          </p>
          <pre className="code-block">{`# Backend (Python 3.12)\npython -m venv .venv\n# Activate the environment for your shell, then:\npip install -r backend/requirements-dev.txt\ncd backend\nuvicorn main:app --reload\n\n# Frontend (another terminal)\ncd frontend\nnpm ci\n# Set NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local\nnpm run dev`}</pre>
          <p>
            Saved history depends on the backend database. Local SQLite persists
            across process restarts; hosted durability requires a persistent
            volume or managed PostgreSQL. Clearing browser storage removes your
            session access token. Export any results you need to retain.
          </p>
          <p>
            There is no offline prediction support. The web manifest provides
            installation metadata only.
          </p>
        </div>
      </Panel>
    </div>
  );
}
