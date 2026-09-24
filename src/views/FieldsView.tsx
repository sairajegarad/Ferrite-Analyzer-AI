import { useState } from "react";
import { useApp } from "../state/AppState";
import { Button, Card, EmptyState, Label, StatusBadge } from "../ui/primitives";
import type { Field } from "../core/types";

type SortKey = "fieldNumber" | "PpPercent" | "manualCorrections";

export function FieldsView() {
  const { state, dispatch } = useApp();
  const analysis = state.currentAnalysis;
  const [sortKey, setSortKey] = useState<SortKey>("fieldNumber");
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!analysis) {
    return (
      <EmptyState
        title="No active analysis"
        description="Create a new analysis to begin adding fields."
        action={<Button onClick={() => dispatch({ type: "SET_VIEW", view: "new-analysis" })}>New Analysis</Button>}
      />
    );
  }

  const saved = analysis.fields.filter((f) => f.savedAt);
  const sorted = [...saved].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app">Fields</h1>
          <p className="text-sm text-app-secondary">{saved.length} field(s) measured for {analysis.sample.sampleId}</p>
        </div>
        <Button onClick={() => dispatch({ type: "SET_VIEW", view: "analyze" })}>+ Add Field</Button>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          title="No field measurements yet"
          description="Start by uploading your first metallographic field."
          action={<Button onClick={() => dispatch({ type: "SET_VIEW", view: "analyze" })}>Start Analysis</Button>}
        />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-app bg-black/10 text-left text-[11px] uppercase tracking-wider text-app-muted">
              <tr>
                {["Field", "PT", "Pi", "Pp(i)", "Manual Corr.", "Quality", "Location"].map((h) => (
                  <th
                    key={h}
                    className="cursor-pointer select-none px-4 py-2.5"
                    onClick={() => {
                      if (h === "Field") setSortKey("fieldNumber");
                      if (h === "Pp(i)") setSortKey("PpPercent");
                      if (h === "Manual Corr.") setSortKey("manualCorrections");
                    }}
                  >
                    {h}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((f) => (
                <FieldRow key={f.id} f={f} expanded={expanded === f.id} onToggle={() => setExpanded(expanded === f.id ? null : f.id)} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function FieldRow({ f, expanded, onToggle }: { f: Field; expanded: boolean; onToggle: () => void }) {
  const { dispatch } = useApp();
  return (
    <>
      <tr className="border-b border-app/60 font-mono-num hover:bg-white/[0.03] cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-2.5 font-sans font-semibold text-app">#{f.fieldNumber}</td>
        <td className="px-4 py-2.5">{f.PT}</td>
        <td className="px-4 py-2.5">{f.Pi.toFixed(1)}</td>
        <td className="px-4 py-2.5 font-semibold text-accent">{f.PpPercent.toFixed(2)}%</td>
        <td className="px-4 py-2.5">{f.manualCorrections}</td>
        <td className="px-4 py-2.5"><StatusBadge status={f.quality?.overall ?? "NEUTRAL"} /></td>
        <td className="px-4 py-2.5 font-sans text-app-secondary">{f.locationLabel || "—"}</td>
        <td className="px-4 py-2.5 text-right">
          <button
            className="text-danger text-xs hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete field #${f.fieldNumber}? This is recorded in the audit trail.`)) {
                dispatch({ type: "DELETE_FIELD", fieldId: f.id });
              }
            }}
          >
            Delete
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-app/60 bg-black/10">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>Original Image</Label>
                <img src={f.original.dataUrl} className="mt-1 w-full rounded-[8px] border border-app" />
              </div>
              <div className="space-y-1 text-xs text-app-secondary">
                <div>Grid: <span className="text-app">{f.grid.rows}×{f.grid.cols} ({f.grid.density} pts){f.grid.isCustom && " CUSTOM"}</span></div>
                <div>Segmentation: <span className="text-app">{f.segmentation.method}, threshold {f.segmentation.threshold}</span></div>
                <div>Polarity: <span className="text-app">{f.segmentation.polarity}</span></div>
                <div>AI Uncertain (at save): <span className="text-app">{f.aiUncertainCount}</span></div>
                <div>Boundary Points: <span className="text-app">{f.boundaryCount}</span></div>
                <div className="break-all">Checksum: <span className="text-accent">{f.original.checksumSha256}</span></div>
                {f.flags.outlierCandidate && <div className="text-warning">⚠ {f.flags.outlierReason}</div>}
                {f.flags.duplicateCandidate && <div className="text-warning">⚠ {f.flags.duplicateReason}</div>}
              </div>
              <div className="text-xs text-app-secondary">
                <Label>Notes</Label>
                <p className="mt-1">{f.notes || "—"}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
