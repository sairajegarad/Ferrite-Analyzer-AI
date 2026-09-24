import { useState } from "react";
import { useApp } from "../state/AppState";
import { Button, Card, TextArea, TextField } from "../ui/primitives";
import { emptySample, createAnalysis } from "../core/factory";
import type { SampleMetadata } from "../core/types";

export function NewAnalysisView() {
  const { dispatch } = useApp();
  const [sample, setSample] = useState<SampleMetadata>(emptySample());
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<SampleMetadata>) => setSample((s) => ({ ...s, ...patch }));

  const start = () => {
    if (!sample.sampleId.trim()) {
      setError("Sample ID is mandatory and cannot be empty.");
      return;
    }
    const analysis = createAnalysis(sample);
    dispatch({ type: "START_ANALYSIS", analysis });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-app">New Analysis</h1>
        <p className="mt-1 text-sm text-app-secondary">
          Sample identification propagates automatically to every field, image, measurement, report and export. It is
          never silently removed or replaced.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Sample ID" value={sample.sampleId} onChange={(v) => set({ sampleId: v })} required placeholder="e.g. TEST-001" />
          <TextField label="Material" value={sample.material} onChange={(v) => set({ material: v })} placeholder="e.g. CF8M Duplex Stainless Steel" />
          <TextField label="Heat / Batch ID" value={sample.heatId} onChange={(v) => set({ heatId: v })} />
          <TextField label="Specimen ID" value={sample.specimenId} onChange={(v) => set({ specimenId: v })} />
          <TextField label="Operator" value={sample.operator} onChange={(v) => set({ operator: v })} />
          <TextField label="Date / Time" type="datetime-local" value={sample.dateTime} onChange={(v) => set({ dateTime: v })} />
          <TextField label="Microscope" value={sample.microscope} onChange={(v) => set({ microscope: v })} />
          <TextField label="Camera" value={sample.camera} onChange={(v) => set({ camera: v })} />
          <TextField label="Magnification" value={sample.magnification} onChange={(v) => set({ magnification: v })} placeholder="e.g. 100x" />
          <TextField label="Objective" value={sample.objective} onChange={(v) => set({ objective: v })} />
          <TextField label="Etchant" value={sample.etchant} onChange={(v) => set({ etchant: v })} placeholder="e.g. Beraha's / Murakami" />
          <TextField label="Preparation Condition" value={sample.preparationCondition} onChange={(v) => set({ preparationCondition: v })} />
          <TextField label="Section Orientation" value={sample.orientation} onChange={(v) => set({ orientation: v })} />
          <TextField label="Location on Specimen" value={sample.location} onChange={(v) => set({ location: v })} />
        </div>
        <div className="mt-4">
          <TextArea label="Notes" value={sample.notes} onChange={(v) => set({ notes: v })} placeholder="Any additional context for this analysis…" />
        </div>
        {error && <div className="mt-4 rounded-[10px] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="mt-6 flex justify-end">
          <Button size="lg" onClick={start}>
            Continue to Image Upload →
          </Button>
        </div>
      </Card>
    </div>
  );
}
