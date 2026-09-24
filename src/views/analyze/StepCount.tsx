import { useEffect, useMemo, useRef, useState } from "react";
import { useAnalyze } from "./context";
import { Button, Card, Label, StatusBadge, FormulaBlock } from "../../ui/primitives";
import { generateGridPoints } from "../../grid/gridGenerator";
import { suggestPointClassification } from "../../image/segmentation";
import { computePiFromCounts, fieldPercentage } from "../../core/astm/calculations";
import { nowIso } from "../../core/id";
import type { PointClass, PointClassificationRecord } from "../../core/types";
import { useApp } from "../../state/AppState";
import { cn } from "../../utils/cn";

const CLASS_COLOR: Record<PointClass, string> = {
  ferrite: "var(--accent)",
  matrix: "var(--text-muted)",
  boundary: "var(--warning)",
  unclassified: "var(--border-strong)",
};

export function StepCount() {
  const { draft, setDraft, pipeline, goStep } = useAnalyze();
  const { addAudit } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [reviewQueue, setReviewQueue] = useState<string[] | null>(null);
  const [reviewIdx, setReviewIdx] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (draft.points.length === 0 && pipeline.processedGray) {
      const gridPoints = generateGridPoints(draft.grid, pipeline.width, pipeline.height);
      const points: PointClassificationRecord[] = gridPoints.map((gp) => {
        const s = suggestPointClassification(
          pipeline.processedGray!,
          pipeline.width,
          pipeline.height,
          gp.x,
          gp.y,
          draft.segmentation.threshold,
          draft.segmentation.polarity,
        );
        return {
          pointId: gp.id,
          x: gp.x,
          y: gp.y,
          classification: s.classification,
          source: "ai",
          aiSuggestion: s.classification,
          aiConfidence: s.confidence,
          pixelIntensity: s.pixelIntensity,
          localHomogeneity: s.localHomogeneity,
          history: [],
        };
      });
      setDraft({ points });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline.processedGray, draft.grid]);

  const metrics = useMemo(() => {
    const ferrite = draft.points.filter((p) => p.classification === "ferrite").length;
    const boundary = draft.points.filter((p) => p.classification === "boundary").length;
    const matrix = draft.points.filter((p) => p.classification === "matrix").length;
    const PT = draft.points.length;
    const Pi = computePiFromCounts(ferrite, boundary);
    const Pp = fieldPercentage(Pi, PT);
    const manual = draft.points.filter((p) => p.source === "manual").length;
    const uncertain = draft.points.filter((p) => p.source === "ai" && (p.aiConfidence ?? 1) < 0.7).length;
    return { ferrite, boundary, matrix, PT, Pi, Pp, manual, uncertain };
  }, [draft.points]);

  useEffect(() => {
    setDraft({
      PT: metrics.PT,
      Pi: metrics.Pi,
      PpPercent: metrics.Pp,
      manualCorrections: metrics.manual,
      aiUncertainCount: metrics.uncertain,
      boundaryCount: metrics.boundary,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.PT, metrics.Pi, metrics.manual, metrics.uncertain, metrics.boundary]);

  function classify(pointId: string, cls: PointClass, reason?: string) {
    setDraft((f) => ({
      ...f,
      points: f.points.map((p) => {
        if (p.pointId !== pointId) return p;
        if (p.classification === cls && p.source === "manual") return p;
        return {
          ...p,
          classification: cls,
          source: "manual",
          history: [
            ...p.history,
            { timestamp: nowIso(), oldClassification: p.classification, newClassification: cls, actor: "operator" as const, reason },
          ],
        };
      }),
    }));
    addAudit("point_classified", `Point ${pointId} set to ${cls.toUpperCase()} by operator.`, { entityId: pointId });
  }

  const selectedPoint = draft.points.find((p) => p.pointId === selected) ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedPoint) return;
      if (e.key === "1") classify(selectedPoint.pointId, "ferrite");
      if (e.key === "2") classify(selectedPoint.pointId, "boundary");
      if (e.key === "3") classify(selectedPoint.pointId, "matrix");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoint]);

  function startReview() {
    const ids = draft.points.filter((p) => p.source === "ai" && (p.aiConfidence ?? 1) < 0.7).map((p) => p.pointId);
    if (ids.length === 0) return;
    setReviewQueue(ids);
    setReviewIdx(0);
    setSelected(ids[0]);
  }

  function reviewNext() {
    if (!reviewQueue) return;
    if (reviewIdx + 1 >= reviewQueue.length) {
      setReviewQueue(null);
      setSelected(null);
      return;
    }
    const next = reviewIdx + 1;
    setReviewIdx(next);
    setSelected(reviewQueue[next]);
  }

  if (!pipeline.workingCanvasDataUrl) {
    return (
      <Card>
        <div className="text-sm text-app-secondary">Complete image upload and segmentation first.</div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px] animate-fade-in-up">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-app">
            Systematic Point Grid — {draft.grid.rows}×{draft.grid.cols} ({draft.grid.density} pts)
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setScale((s) => Math.max(1, s - 0.4))}>−</Button>
            <Button size="sm" variant="secondary" onClick={() => setScale(1)}>Reset</Button>
            <Button size="sm" variant="secondary" onClick={() => setScale((s) => Math.min(5, s + 0.4))}>+</Button>
          </div>
        </div>

        <div data-cursor="precision" className="overflow-hidden rounded-[12px] border border-app bg-black/30" style={{ aspectRatio: `${pipeline.width}/${pipeline.height}` }}>
          <div className="relative h-full w-full origin-center transition-transform duration-150" style={{ transform: `scale(${scale})` }}>
            <img ref={imgRef} src={pipeline.workingCanvasDataUrl} className="absolute inset-0 h-full w-full" draggable={false} />
            {draft.points.map((p) => {
              const isUncertain = p.source === "ai" && (p.aiConfidence ?? 1) < 0.7;
              const isSel = selected === p.pointId;
              return (
                <button
                  key={p.pointId}
                  onClick={() => setSelected(p.pointId)}
                  style={{
                    left: `${(p.x / pipeline.width) * 100}%`,
                    top: `${(p.y / pipeline.height) * 100}%`,
                    borderColor: CLASS_COLOR[p.classification],
                  }}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 focus-ring",
                    isSel ? "h-4 w-4 ring-2 ring-[var(--text)] z-20" : "h-2.5 w-2.5 z-10",
                    isUncertain && "pulse-uncertain",
                    p.source === "manual" && "border-dashed",
                  )}
                  title={`Point ${p.pointId.slice(-4)}: ${p.classification}`}
                >
                  <span className="block h-full w-full rounded-full" style={{ backgroundColor: CLASS_COLOR[p.classification], opacity: 0.85 }} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-app-secondary">
          <LegendDot color={CLASS_COLOR.ferrite} label="Ferrite" />
          <LegendDot color={CLASS_COLOR.matrix} label="Matrix" />
          <LegendDot color={CLASS_COLOR.boundary} label="Boundary (½)" />
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-warning pulse-uncertain" /> AI Uncertain</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-app-strong" /> Manually Verified</span>
        </div>

        {reviewQueue ? (
          <div className="flex items-center justify-between rounded-[10px] border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
            <span>Reviewing uncertain point {reviewIdx + 1} of {reviewQueue.length}</span>
            <Button size="sm" variant="secondary" onClick={reviewNext}>Skip / Next</Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={startReview} disabled={metrics.uncertain === 0}>
            Review {metrics.uncertain} Uncertain Point{metrics.uncertain === 1 ? "" : "s"}
          </Button>
        )}
      </Card>

      <div className="space-y-4">
        <Card>
          <Label>Live Field Metrics</Label>
          <div className="mt-2 grid grid-cols-2 gap-3 font-mono-num text-sm">
            <Metric label="PT" value={metrics.PT} />
            <Metric label="Pi" value={metrics.Pi.toFixed(1)} />
            <Metric label="Pp(i)" value={`${metrics.Pp.toFixed(2)}%`} accent />
            <Metric label="Manual Corr." value={metrics.manual} />
            <Metric label="AI Uncertain" value={metrics.uncertain} />
            <Metric label="Boundary Pts" value={metrics.boundary} />
          </div>
          <div className="mt-3">
            <FormulaBlock lines={["Pp(i) = (Pi / PT) × 100", `= (${metrics.Pi.toFixed(1)} / ${metrics.PT}) × 100 = ${metrics.Pp.toFixed(2)}%`]} />
          </div>
        </Card>

        <Card>
          <Label>Point Inspector</Label>
          {!selectedPoint && <div className="mt-2 text-xs text-app-muted">Click a grid point to inspect and classify it.</div>}
          {selectedPoint && (
            <div className="mt-2 space-y-3">
              <Magnifier src={pipeline.workingCanvasDataUrl} x={selectedPoint.x} y={selectedPoint.y} />
              <div className="grid grid-cols-2 gap-2 font-mono-num text-xs text-app-secondary">
                <div>X: <span className="text-app">{selectedPoint.x.toFixed(1)}</span></div>
                <div>Y: <span className="text-app">{selectedPoint.y.toFixed(1)}</span></div>
                <div>Intensity: <span className="text-app">{selectedPoint.pixelIntensity?.toFixed(1)}</span></div>
                <div>Homogeneity: <span className="text-app">{((selectedPoint.localHomogeneity ?? 0) * 100).toFixed(0)}%</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-app-secondary">AI Suggestion</span>
                <StatusBadge status="NEUTRAL" label={`${selectedPoint.aiSuggestion ?? "-"} · ${((selectedPoint.aiConfidence ?? 0) * 100).toFixed(0)}%`} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-app-secondary">Current</span>
                <StatusBadge status={selectedPoint.source === "manual" ? "READY" : "WARNING"} label={selectedPoint.source === "manual" ? "Manually Verified" : "AI Suggested"} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => classify(selectedPoint.pointId, "ferrite")} className="rounded-[8px] border-2 border-danger/60 bg-danger/10 py-2 text-xs font-bold text-danger hover:bg-danger/20">
                  1 FERRITE
                </button>
                <button onClick={() => classify(selectedPoint.pointId, "boundary")} className="rounded-[8px] border-2 border-warning/60 bg-warning/10 py-2 text-xs font-bold text-warning hover:bg-warning/20">
                  2 BOUNDARY ½
                </button>
                <button onClick={() => classify(selectedPoint.pointId, "matrix")} className="rounded-[8px] border-2 border-accent/60 bg-accent/10 py-2 text-xs font-bold text-accent hover:bg-accent/20">
                  3 MATRIX
                </button>
              </div>
              {reviewQueue && (
                <Button size="sm" onClick={reviewNext} className="w-full">
                  Confirm & Next Uncertain Point →
                </Button>
              )}
              {selectedPoint.history.length > 0 && (
                <div className="max-h-24 overflow-y-auto rounded-[8px] border border-app p-2 text-[10px] text-app-muted">
                  {selectedPoint.history.map((h, i) => (
                    <div key={i}>
                      {new Date(h.timestamp).toLocaleTimeString()}: {h.oldClassification} → {h.newClassification} ({h.actor})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        <Button className="w-full" onClick={() => goStep(8)} disabled={metrics.PT === 0}>
          Continue to Field Review →
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-[8px] border border-app px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-app-muted">{label}</div>
      <div className={cn("font-bold", accent ? "text-accent text-base" : "text-app text-sm")}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> {label}
    </span>
  );
}

function Magnifier({ src, x, y }: { src: string; x: number; y: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const crop = 40;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x - crop / 2, y - crop / 2, crop, crop, 0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#79c7d4";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    img.src = src;
  }, [src, x, y]);
  return <canvas ref={canvasRef} width={160} height={160} className="w-full rounded-[8px] border border-app bg-black" />;
}
