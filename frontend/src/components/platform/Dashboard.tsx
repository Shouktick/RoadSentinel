"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { metricsSchema, scopeNote, performanceNote } from "@/lib/contracts";
import Speedometer from "./Speedometer";
import {
  Empty,
  Failure,
  Limitation,
  Loading,
  PageTitle,
  Panel,
  Stat,
  Status,
  useHealth,
} from "./ui";
const activitySchema = z.object({
  prediction_count: z.number(),
  saved_count: z.number(),
  average_latency_ms: z.number().nullable(),
  class_distribution: z.array(
    z.object({
      model_version: z.string(),
      label: z.string(),
      count: z.number(),
    }),
  ),
});
export default function Dashboard() {
  const health = useHealth(),
    activity = useQuery({
      queryKey: ["activity"],
      queryFn: () => api("activity", activitySchema),
    }),
    metrics = useQuery({
      queryKey: ["model-metrics"],
      queryFn: () => api("metrics", metricsSchema),
    });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="WORKSPACE / OVERVIEW"
        title="Your road intelligence, in focus."
        description="Explore injury severity patterns in Great Britain's recorded crashes."
      >
        <Link className="button primary" href="/predict">
          New prediction ↗
        </Link>
      </PageTitle>
      {health.error && (
        <Failure error={health.error} retry={() => void health.refetch()} />
      )}
      <div className="stats-grid">
        <Stat
          label="Predictions run"
          value={activity.data ? String(activity.data.prediction_count) : "—"}
          note="This browser's actual activity"
        />
        <Stat
          label="Test macro F1"
          value={metrics.data ? metrics.data.macro_f1.toFixed(3) : "—"}
          note="Held-out 2023 · see minority-class limitations"
        />
        <Stat
          label="Saved scenarios"
          value={activity.data ? String(activity.data.saved_count) : "—"}
          note="Temporary browser-scoped server history"
        />
        <Stat
          label="Average response"
          value={
            activity.data?.average_latency_ms != null
              ? `${Math.round(activity.data.average_latency_ms)} ms`
              : "—"
          }
          note="Measured inference and explanation time"
        />
      </div>
      <div className="hero-grid">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">RECORDED CRASH SEVERITY</p>
            <h2>
              Understand the estimate.
              <br />
              Know its limits.
            </h2>
            <p>
              Set road conditions, explore probabilities, and see how each input
              influences the model.
            </p>
            <Link href="/predict" className="button primary">
              Build a scenario →
            </Link>
            <div className="hero-footnote">
              Documented data · Reproducible model
            </div>
          </div>
          <div className="hero-gauge">
            <Status>EXAMPLE POSTED LIMIT</Status>
            <Speedometer value={30} unit="mph" />
            <span className="gauge-caption">
              Posted limit, not actual vehicle speed
            </span>
          </div>
        </section>
        <Panel
          title="Service readiness"
          subtitle="Availability is separate from predictive performance"
        >
          {health.isPending ? (
            <Loading />
          ) : (
            <>
              <div className="readiness-row">
                <span>Inference</span>
                <Status tone={health.data?.ready ? "good" : "warn"}>
                  {health.data?.ready ? "Ready" : "Waking up or unavailable"}
                </Status>
              </div>
              <div className="readiness-row">
                <span>Explanations</span>
                <Status tone={health.data?.shap_available ? "good" : "warn"}>
                  {health.data?.shap_available ? "Available" : "Unavailable"}
                </Status>
              </div>
              <div className="readiness-row">
                <span>History</span>
                <strong>Temporary</strong>
              </div>
              <p className="chart-annotation">
                History can disappear when the free backend sleeps, restarts or
                redeploys. Export records you need.
              </p>
              <div className="model-version">
                <small>MODEL VERSION</small>
                <code>{health.data?.model_version ?? "Connecting"}</code>
              </div>
              <Link className="text-link" href="/model-card">
                Read evaluation and model card ↗
              </Link>
            </>
          )}
        </Panel>
      </div>
      <Limitation>{scopeNote}</Limitation>
      <Limitation>{performanceNote}</Limitation>
      <div className="two-columns">
        <Panel
          title="Your estimated outcomes"
          subtitle="Application activity, grouped by the original label and model version"
        >
          {activity.isPending ? (
            <Loading />
          ) : activity.error ? (
            <Failure
              error={activity.error}
              retry={() => void activity.refetch()}
            />
          ) : activity.data?.class_distribution.length ? (
            <div className="distribution">
              {activity.data.class_distribution.map((p) => (
                <div key={`${p.model_version}:${p.label}`}>
                  <div className="bar-label">
                    <span>
                      {p.label}
                      <small style={{ display: "block" }}>
                        {p.model_version}
                      </small>
                    </span>
                    <strong>{p.count}</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(p.count / activity.data!.prediction_count) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Your activity starts here"
              href="/predict"
              action="Run a prediction"
            >
              No predictions have been recorded for this browser.
            </Empty>
          )}
        </Panel>
        <Panel title="Explore RoadSentinel">
          <div className="tool-links">
            {[
              [
                "/what-if",
                "Compare scenarios",
                "Explore probability changes and posted speed limits.",
              ],
              [
                "/batch",
                "Process a CSV",
                "Validate rows and export versioned results.",
              ],
              [
                "/map",
                "Great Britain map",
                "See aggregated source coordinates.",
              ],
              [
                "/history",
                "Saved predictions",
                "Revisit original model outputs.",
              ],
            ].map(([href, title, text]) => (
              <Link key={href} href={href}>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
                <span>↗</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
