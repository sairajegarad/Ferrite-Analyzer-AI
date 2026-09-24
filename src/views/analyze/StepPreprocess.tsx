import { useEffect } from "react";
import { useAnalyze } from "./context";
import { Button, Card, Label, Toggle } from "../../ui/primitives";
import { runPreprocessPipeline } from "../../image/preprocess";
import { grayscaleToImageData } from "../../image/canvasUtils";
import { useApp } from "../../state/AppState";
import type { PreprocessSettings } from "../../core/types";

export function StepPreprocess() {
  const { draft, setDraft, pipeline, setPipeline, goStep } = useAnalyze();
  const { addAudit } = useApp();

  useEffect(() => {
    recompute(draft.preprocessing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.preprocessing]);

  function recompute(settings: PreprocessSettings) {
    if (!pipeline.grayOriginal) return;
    const stages = runPreprocessPipeline(pipeline.grayOriginal, pipeline.width, pipeline.height, settings);
    setPipeline({ stages, processedGray: stages[stages.length - 1].data });
  }

  function toggle(key: keyof PreprocessSettings, value: boolean) {
    setDraft({ preprocessing: { ...draft.preprocessing, [key]: value } });
  }

  function toDataUrl(data: Float32Array) {
    const canvas = document.createElement("canvas");
    canvas.width = pipeline.width;
    canvas.height = pipeline.height;
    canvas.getContext("2d")!.putImageData(grayscaleToImageData(data, pipeline.width, pipeline.height), 0, 0);
    return canvas.toDataURL();
  }

  return (
    <Card className="animate-fade-in-up space-y-5">
      <div>
        <div className="text-sm font-semibold text-app">Preprocessing Pipeline</div>
        <p className="mt-1 text-xs text-app-muted">
          Every operation is optional, logged, and purely measurement-related. The original image is never altered.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Toggle checked={draft.preprocessing.denoise} onChange={(v) => toggle("denoise", v)} label="Denoise" />
        <Toggle checked={draft.preprocessing.illuminationCorrection} onChange={(v) => toggle("illuminationCorrection", v)} label="Illumination Correction" />
        <Toggle checked={draft.preprocessing.clahe} onChange={(v) => toggle("clahe", v)} label="CLAHE Enhancement" />
        <Toggle checked={draft.preprocessing.contrastNormalization} onChange={(v) => toggle("contrastNormalization", v)} label="Contrast Normalization" />
        <Toggle checked={draft.preprocessing.sharpen} onChange={(v) => toggle("sharpen", v)} label="Mild Sharpen" />
      </div>

      <div>
        <Label>Pipeline Stages</Label>
        <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
          {pipeline.stages.map((s, i) => (
            <div key={i} className="w-36 shrink-0 text-center">
              <img src={toDataUrl(s.data)} className="aspect-square w-full rounded-[8px] border border-app object-cover" />
              <div className="mt-1 text-[10px] text-app-muted">{s.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            addAudit("preprocessing_changed", `Preprocessing pipeline applied for field ${draft.fieldNumber}: ${Object.entries(draft.preprocessing).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}.`);
            goStep(6);
          }}
        >
          Continue to Segmentation →
        </Button>
      </div>
    </Card>
  );
}
