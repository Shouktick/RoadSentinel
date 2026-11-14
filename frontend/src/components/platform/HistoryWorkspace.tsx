"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import { predictionSchema } from "@/lib/contracts";
import PredictionResult from "./PredictionResult";
import { Empty, Failure, Limitation, Loading, PageTitle, Panel } from "./ui";
const schema = z.object({
  items: z.array(predictionSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export default function HistoryWorkspace() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const cache = useQueryClient();
  const history = useQuery({
    queryKey: ["history", page, search],
    queryFn: () =>
      api(
        `predictions?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
        schema,
      ),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`predictions/${id}`, z.null(), { method: "DELETE" }),
    onSuccess: () => {
      setSelected(null);
      void cache.invalidateQueries({ queryKey: ["history"] });
    },
  });
  const record = history.data?.items.find((r) => r.id === selected);
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="ARCHIVE / ORIGINAL RESULTS"
        title="Historical records, original context."
        description="Old records retain their source country, model version, labels and units. New Karnataka research results keep their own country and model version."
      />
      <Limitation>
        History is temporary on the existing free backend and may disappear on
        restart or deployment. Records are isolated to this browser session. No
        historical result is relabelled as Indian.
      </Limitation>
      <Panel
        title="Saved historical predictions"
        action={
          <button
            className="button small"
            disabled={!history.data?.items.length}
            onClick={() =>
              downloadText(
                "roadsentinel-historical-records.json",
                JSON.stringify(history.data, null, 2),
                "application/json",
              )
            }
          >
            Export this page
          </button>
        }
      >
        <div className="field">
          <label htmlFor="history-search">
            Search ID or original output label
          </label>
          <input
            id="history-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setSelected(null);
            }}
          />
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
                    <th>Source country</th>
                    <th>Original model</th>
                    <th>Original output</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.source_country}</td>
                      <td>{r.model_version}</td>
                      <td>{r.severity}</td>
                      <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="button small"
                            onClick={() => setSelected(r.id)}
                          >
                            Open record
                          </button>
                          <button
                            className="button small danger"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (confirm("Delete this historical record?"))
                                remove.mutate(r.id);
                            }}
                          >
                            Delete record
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button
                className="button small"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                  setSelected(null);
                }}
              >
                Previous
              </button>
              <span>
                Page {page} | {history.data.total} records
              </span>
              <button
                className="button small"
                disabled={page * 10 >= history.data.total}
                onClick={() => {
                  setPage(page + 1);
                  setSelected(null);
                }}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <Empty title="No historical records available">
            Run a scenario and choose Save this result. Existing temporary
            records may have expired with a deployment.
          </Empty>
        )}
        {remove.error && <Failure error={remove.error} />}
      </Panel>
      {record && <PredictionResult prediction={record} />}
    </div>
  );
}
