import { useState } from "react";
import { useApp } from "../state/AppState";
import { Button, Card, EmptyState, StatusBadge, TextField } from "../ui/primitives";
import { computeASTMStatistics } from "../core/astm/calculations";

export function HistoryView() {
  const { state, dispatch, deleteFromHistory } = useApp();
  const [query, setQuery] = useState("");

  const filtered = state.history
    .filter((a) => a.sample.sampleId.toLowerCase().includes(query.toLowerCase()) || a.sample.material.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-app">History</h1>
        <TextField label="" value={query} onChange={setQuery} placeholder="Search by sample ID or material…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No saved projects" description="Completed analyses will appear here automatically." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const stats = computeASTMStatistics(a.fields);
            return (
              <Card key={a.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-app">{a.sample.sampleId || "Untitled"}</div>
                    <div className="text-xs text-app-muted">{a.sample.material || "—"}</div>
                  </div>
                  <StatusBadge status={stats?.formalCIReady ? "READY" : "WARNING"} label={a.status} />
                </div>
                <div className="font-mono-num text-2xl font-bold text-app">
                  {stats ? `${stats.mean.toFixed(2)}%` : "—"}
                  {stats && <span className="ml-1 text-sm text-app-muted">± {stats.ci95.toFixed(2)}%</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-app-secondary">
                  <div>Fields: <span className="text-app">{a.fields.filter((f) => f.savedAt).length}</span></div>
                  <div>%RA: <span className="text-app">{stats ? `${stats.relativeAccuracyPercent.toFixed(1)}%` : "—"}</span></div>
                  <div>v{a.softwareVersion}</div>
                </div>
                <div className="text-[11px] text-app-muted">Updated {new Date(a.updatedAt).toLocaleString()}</div>
                <div className="mt-auto flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => dispatch({ type: "LOAD_ANALYSIS", analysis: a })}>
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm("Delete this saved analysis? This cannot be undone.")) deleteFromHistory(a.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
