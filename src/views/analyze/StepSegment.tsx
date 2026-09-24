import { useEffect, useState } from "react";
import { useAnalyze } from "./context";
import { Button, Card, Label, StatusBadge } from "../../ui/primitives";
import { generateSegmentationCandidates, suggestPolarity, buildMask } from "../../image/segmentation";
import { grayscaleToImageData } from "../../image/canvasUtils";
import { useApp } from "../../state/AppState";
import type { PhasePolarity, SegmentationMethod } from "../../core/types";

export function StepSegment() {
  const { draft, setDraft, pipeline, setPipeline, goStep } = useAnalyze();
  const { addAudit } = useApp();
  const [opacity, setOpacity] = useState(0.55);
  const [threshold, setThreshold] = useState(draft.segmentation.threshold);

  useEffect(() => {
    if (pipeline.processedGray && pipeline.candidates.length === 0) {
      const candidates = generateSegmentationCandidates(pipeline.processedGray, pipeline.width, pipeline.height);
      setPipeline({ candidates });
      const best = candidates.reduce((a, b) => (b.separability > a.separability ? b : a), candidates[0]);
      const suggestion = suggestPolarity(best.mask);
      setThreshold(best.globalThreshold);
      setDraft({
        segmentation: {
          method: best.method,
          threshold: best.globalThreshold,
          polarity: suggestion.polarity,
          autoDetectedPolarity: suggestion.polarity,
          polarityConfidence: suggestion.confidence,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline.processedGray]);

  if (!pipeline.processedGray) {
    return (
      <Card>
        <div className="text-sm text-app-secondary">Complete preprocessing first.</div>
      </Card>
    );
  }

  const activeCandidate = pipeline.candidates.find((c) => c.method === draft.segmentation.method) ?? pipeline.candidates[0];

  function overlayDataUrl(): string {
    if (!pipeline.processedGray || !activeCandidate) return "";
    const w = pipeline.width;
    const h = pipeline.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(grayscaleToImageData(pipeline.processedGray, w, h), 0, 0);
    const mask = buildMask(pipeline.processedGray, threshold);
    const overlay = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < mask.length; i++) {
      const isPhase = draft.segmentation.polarity === "bright" ? mask[i] === 1 : mask[i] === 0;
      if (isPhase) {
        const p = i * 4;
        overlay.data[p] = overlay.data[p] * (1 - opacity) + 242 * opacity;
        overlay.data[p + 1] = overlay.data[p + 1] * (1 - opacity) + 95 * opacity;
        overlay.data[p + 2] = overlay.data[p + 2] * (1 - opacity) + 115 * opacity;
      }
    }
    ctx.putImageData(overlay, 0, 0);
    return canvas.toDataURL();
  }

  function setMethod(method: SegmentationMethod) {
    const c = pipeline.candidates.find((cc) => cc.method === method);
    if (!c) return;
    setThreshold(c.globalThreshold);
    setDraft({ segmentation: { ...draft.segmentation, method, threshold: c.globalThreshold } });
  }

  function setPolarity(p: PhasePolarity) {
    setDraft({ segmentation: { ...draft.segmentation, polarity: p } });
  }

  const ferritePixelFraction = (() => {
    if (!activeCandidate) return 0;
    const bright = activeCandidate.mask.reduce((a, b) => a + b, 0) / activeCandidate.mask.length;
    return draft.segmentation.polarity === "bright" ? bright : 1 - bright;
  })();

  return (
    <Card className="animate-fade-in-up space-y-5">
      <div>
        <div className="text-sm font-semibold text-app">Segmentation Assistance</div>
        <p className="mt-1 text-xs text-app-muted">
          This candidate mask assists point-classification suggestions only. It is NOT the ASTM result — the verified
          point-count grid in the next step produces the measurement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <Label>Ferrite Overlay Preview</Label>
          <img src={overlayDataUrl()} className="mt-2 w-full rounded-[12px] border border-app" />
        </div>
        <div className="space-y-4">
          <div>
            <Label>Candidate Segmentation Method</Label>
            <div className="mt-2 space-y-2">
              {pipeline.candidates.map((c) => (
                <button
                  key={c.method}
                  onClick={() => setMethod(c.method)}
                  className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left text-xs transition-colors ${
                    draft.segmentation.method === c.method ? "border-accent bg-accent/10 text-accent" : "border-app text-app-secondary hover:border-app-strong"
                  }`}
                >
                  <span className="font-semibold">{labelForMethod(c.method)}</span>
                  <span className="font-mono-num">sep. {(c.separability * 100).toFixed(0)}%</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Phase Polarity</Label>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setPolarity("dark")}
                className={`flex-1 rounded-[10px] border px-3 py-2 text-xs font-semibold ${draft.segmentation.polarity === "dark" ? "border-accent bg-accent/10 text-accent" : "border-app text-app-secondary"}`}
              >
                ● Dark = Ferrite
              </button>
              <button
                onClick={() => setPolarity("bright")}
                className={`flex-1 rounded-[10px] border px-3 py-2 text-xs font-semibold ${draft.segmentation.polarity === "bright" ? "border-accent bg-accent/10 text-accent" : "border-app text-app-secondary"}`}
              >
                ○ Bright = Ferrite
              </button>
            </div>
            {draft.segmentation.autoDetectedPolarity && (
              <div className="mt-2 text-[11px] text-app-muted">
                AI suggestion: <span className="font-semibold text-app">{draft.segmentation.autoDetectedPolarity}</span> (
                {(draft.segmentation.polarityConfidence * 100).toFixed(0)}% confidence) — operator confirmation required.
              </div>
            )}
          </div>

          <div>
            <Label>Threshold ({threshold.toFixed(0)})</Label>
            <input
              type="range"
              min={0}
              max={255}
              value={threshold}
              onChange={(e) => {
                const t = Number(e.target.value);
                setThreshold(t);
                setDraft({ segmentation: { ...draft.segmentation, threshold: t } });
              }}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </div>

          <div>
            <Label>Overlay Opacity ({Math.round(opacity * 100)}%)</Label>
            <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-2 w-full accent-[var(--accent)]" />
          </div>

          <div className="rounded-[10px] border border-app p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-app-secondary">Segmented ferrite pixel fraction</span>
              <StatusBadge status="NEUTRAL" label={`${(ferritePixelFraction * 100).toFixed(1)}%`} />
            </div>
            <div className="mt-1 text-[11px] text-app-muted">
              For reference / assistance only — not used as the ASTM measurement.
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            addAudit(
              "segmentation_changed",
              `Segmentation set for field ${draft.fieldNumber}: method=${draft.segmentation.method}, threshold=${threshold}, polarity=${draft.segmentation.polarity}.`,
            );
            goStep(7);
          }}
        >
          Continue to Point Counting →
        </Button>
      </div>
    </Card>
  );
}

function labelForMethod(m: SegmentationMethod): string {
  switch (m) {
    case "otsu-global":
      return "Otsu Global Threshold";
    case "adaptive-local":
      return "Adaptive Local Threshold";
    case "clahe-threshold":
      return "CLAHE + Threshold";
    case "illumination-corrected":
      return "Illumination-Corrected Threshold";
  }
}
