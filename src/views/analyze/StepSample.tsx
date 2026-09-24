import { useApp } from "../../state/AppState";
import { Button, Card, TextField } from "../../ui/primitives";
import { useAnalyze } from "./context";

export function StepSample() {
  const { state, dispatch } = useApp();
  const { goStep } = useAnalyze();
  const analysis = state.currentAnalysis!;
  const locked = analysis.locked || analysis.fields.some((f) => f.savedAt);

  const set = (patch: Partial<typeof analysis.sample>) => dispatch({ type: "UPDATE_SAMPLE", sample: patch });

  return (
    <Card className="animate-fade-in-up">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-app">Sample Identification</div>
          <div className="text-xs text-app-muted">
            {locked
              ? "Sample ID is locked because one or more fields have already been measured (competition safety)."
              : "Confirm sample metadata before proceeding. This propagates to every field and export."}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Sample ID" value={analysis.sample.sampleId} onChange={(v) => set({ sampleId: v })} required />
        <TextField label="Material" value={analysis.sample.material} onChange={(v) => set({ material: v })} />
        <TextField label="Operator" value={analysis.sample.operator} onChange={(v) => set({ operator: v })} />
        <TextField label="Magnification" value={analysis.sample.magnification} onChange={(v) => set({ magnification: v })} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => goStep(2)} disabled={!analysis.sample.sampleId.trim()}>
          Continue to Image Upload →
        </Button>
      </div>
    </Card>
  );
}
