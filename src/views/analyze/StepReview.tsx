import { useState } from "react";
import { useAnalyze } from "./context";
import { Button, Card, Label, StatusBadge, TextArea } from "../../ui/primitives";
import { useApp } from "../../state/AppState";
import { nowIso, newId } from "../../core/id";
import { detectOutlierFields } from "../../core/astm/calculations";

const TABS = ["Original", "Preprocessed", "Segmentation Candidate", "Final Verified Grid"] as const;

export function StepReview({ onFieldSaved }: { onFieldSaved: () => void }) {
  const { draft, setDraft, pipeline, goStep } = useAnalyze();
  const { state, dispatch, addAudit } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Final Verified Grid");
  const analysis = state.currentAnalysis!;

  const qualityLabel = draft.quality?.overrideUsed ? "READY WITH WARNING" : draft.quality?.overall === "GOOD" ? "READY" : draft.quality?.overall ?? "UNKNOWN";

  function previewSrc(): string {
    if (tab === "Original") return draft.original.dataUrl;
    return pipeline.workingCanvasDataUrl ?? draft.original.dataUrl;
  }

  function save() {
    const now = nowIso();
    const savedField = { ...draft, savedAt: now };
    const audit = {
      id: newId("audit"),
      timestamp: now,
      type: "field_saved",
      description: `Field ${draft.fieldNumber} saved: PT=${draft.PT}, Pi=${draft.Pi.toFixed(1)}, Pp(i)=${draft.PpPercent.toFixed(2)}%, manual corrections=${draft.manualCorrections}.`,
      entityId: draft.id,
    };
    dispatch({ type: "UPSERT_FIELD", field: savedField, audit });

    // outlier assistance (flag only, never delete)
    const allFields = [...analysis.fields.filter((f) => f.id !== savedField.id), savedField];
    const outliers = detectOutlierFields(allFields);
    outliers.forEach((o) => {
      if (o.fieldId === savedField.id) {
        dispatch({
          type: "UPSERT_FIELD",
          field: { ...savedField, flags: { ...savedField.flags, outlierCandidate: true, outlierReason: o.reason } },
        });
      }
    });
    addAudit("field_saved", `Field ${draft.fieldNumber} committed to analysis dataset.`);
  }

  return (
    <Card className="animate-fade-in-up space-y-5">
      <div className="text-sm font-semibold text-app">Field Review — Field #{draft.fieldNumber}</div>

      <div className="flex gap-1 rounded-[10px] border border-app p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-[8px] py-1.5 text-xs font-semibold transition-colors ${tab === t ? "bg-accent/15 text-accent" : "text-app-secondary hover:text-app"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <img src={previewSrc()} className="max-h-[420px] w-full rounded-[12px] border border-app object-contain bg-black/20" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="PT" value={draft.PT} />
        <SummaryStat label="Pi" value={draft.Pi.toFixed(1)} />
        <SummaryStat label="Pp(i)" value={`${draft.PpPercent.toFixed(2)}%`} accent />
        <SummaryStat label="Manual Changes" value={draft.manualCorrections} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={qualityLabel.includes("WARNING") ? "WARNING" : qualityLabel} label={`Quality: ${qualityLabel}`} />
        {draft.flags.duplicateCandidate && <StatusBadge status="WARNING" label={`Possible Duplicate: ${draft.flags.duplicateReason}`} />}
        {draft.manualCorrections > 0 && <StatusBadge status="READY" label="Manually Verified / Corrected" />}
      </div>

      <TextArea label="Field Notes" value={draft.notes} onChange={(v) => setDraft({ notes: v })} placeholder="Optional notes about this field…" />

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="ghost" onClick={() => goStep(7)}>← Back to Counting</Button>
        <div className="flex gap-3">
          <Button variant="danger" onClick={() => goStep(1)}>
            Discard
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              save();
              onFieldSaved();
            }}
          >
            Save & Add Another Field
          </Button>
          <Button
            onClick={() => {
              save();
              dispatch({ type: "SET_VIEW", view: "results" });
            }}
          >
            Save Field & View Results
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-[10px] border border-app p-3 text-center">
      <Label>{label}</Label>
      <div className={`mt-1 font-mono-num text-xl font-bold ${accent ? "text-accent" : "text-app"}`}>{value}</div>
    </div>
  );
}
