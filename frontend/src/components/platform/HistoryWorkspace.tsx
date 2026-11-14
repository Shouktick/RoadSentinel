"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, ExternalLink, Trash2 } from "lucide-react";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import { predictionSchema, inputLabel } from "@/lib/contracts";
import PredictionResult from "./PredictionResult";
import {
  Empty,
  Failure,
  labels,
  Limitation,
  Loading,
  PageTitle,
  Panel,
  useHealth,
  useMetadata,
} from "./ui";

const historySchema = z.object({
  items: z.array(predictionSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export default function HistoryWorkspace() {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [order, setOrder] = useState("newest"),
    [page, setPage] = useState(1);
  const router = useRouter(),
    params = useSearchParams(),
    selected = params.get("id"),
    cache = useQueryClient(),
    health = useHealth(),
    metadata = useMetadata();
  const history = useQuery({
    queryKey: ["history", search, filter, order, page],
    queryFn: () =>
      api(
        `predictions?${new URLSearchParams({ search, label: filter, order, page: String(page), limit: "10" })}`,
        historySchema,
      ),
  });
  const detail = useQuery({
    queryKey: ["prediction", selected],
    queryFn: () => api(`predictions/${selected}`, predictionSchema),
    enabled: Boolean(selected),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`predictions/${id}`, z.null(), { method: "DELETE" }),
    onSuccess: (_, id) => {
      void cache.invalidateQueries({ queryKey: ["history"] });
      void cache.invalidateQueries({ queryKey: ["activity"] });
      if (selected === id) router.replace("/history");
    },
  });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INTELLIGENCE / HISTORY"
        title="A record of your model explorations."
        description="Saved on the backend and scoped to this browser's unguessable session token. Clearing browser storage loses access to this session."
      />
      {!health.data?.history_durable && (
        <Limitation>
          History is temporary on this free backend. Records may be lost when
          the service sleeps, restarts or redeploys. Export results you need to
          retain.
        </Limitation>
      )}
      <Panel
        title="Saved predictions"
        subtitle="Original scenarios and actual model responses"
        action={
          <button
            className="button small"
            disabled={!history.data?.items.length}
            onClick={() =>
              downloadText(
                "roadsentinel-history-page.json",
                JSON.stringify(history.data, null, 2),
                "application/json",
              )
            }
          >
            <Download size={14} /> Export this page
          </button>
        }
      >
        <div className="filters" style={{ marginBottom: 24 }}>
          <div className="field">
            <label htmlFor="history-search">Search ID or model label</label>
            <input
              id="history-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search saved records…"
            />
          </div>
          <div className="field">
            <label htmlFor="history-class">Injury outcome</label>
            <select
              id="history-class"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All injury outcomes</option>
              {metadata.data?.classes.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="history-sort">Sort</label>
            <select
              id="history-sort"
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="confidence">
                Estimated probability descending
              </option>
            </select>
          </div>
        </div>
        {history.isPending ? (
          <Loading />
        ) : history.error ? (
          <Failure error={history.error} retry={() => void history.refetch()} />
        ) : history.data?.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Prediction ID</th>
                    <th>Created</th>
                    <th>Output</th>
                    <th>Estimated probability</th>
                    <th>Model version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((row) => (
                    <tr key={row.id}>
                      <td className="mono">{row.id.slice(0, 8)}</td>
                      <td>{new Date(row.created_at).toLocaleString()}</td>
                      <td>{row.severity}</td>
                      <td>{(row.confidence * 100).toFixed(1)}%</td>
                      <td>{row.model_version}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="button small"
                            onClick={() =>
                              router.replace(`/history?id=${row.id}`)
                            }
                          >
                            <ExternalLink size={13} /> Open
                          </button>
                          <button
                            className="button small danger"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Delete this saved prediction from the server? This cannot be undone.",
                                )
                              )
                                remove.mutate(row.id);
                            }}
                            aria-label={`Delete prediction ${row.id.slice(0, 8)}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                {history.data.total} records · page {page}
              </span>
              <div className="actions">
                <button
                  className="button small"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="button small"
                  disabled={page * 10 >= history.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title={
              search || filter
                ? "No matching records"
                : "No saved predictions yet"
            }
            href="/predict"
            action="Build a scenario"
          >
            Save a prediction to revisit its inputs, probabilities, and genuine
            local explanation.
          </Empty>
        )}
        {remove.error && <Failure error={remove.error} />}
      </Panel>
      {selected && (
        <>
          <div className="actions">
            <button
              className="button small"
              onClick={() => router.replace("/history")}
            >
              Close prediction details
            </button>
          </div>
          {detail.isPending ? (
            <Loading />
          ) : detail.error ? (
            <Failure error={detail.error} retry={() => void detail.refetch()} />
          ) : (
            detail.data && (
              <div className="two-columns">
                <Panel
                  title="Saved input scenario"
                  subtitle={`Created ${new Date(detail.data.created_at).toLocaleString()}`}
                >
                  <table className="feature-table">
                    <tbody>
                      {Object.entries(detail.data.scenario).map(
                        ([key, value]) => (
                          <tr key={key}>
                            <td>
                              {detail.data.schema_version === 2
                                ? labels[key]
                                : key}
                            </td>
                            <td className="mono">
                              {detail.data.schema_version === 2
                                ? inputLabel(key, value)
                                : value}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </Panel>
                <PredictionResult prediction={detail.data} />
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
