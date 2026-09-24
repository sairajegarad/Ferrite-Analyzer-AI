import { useEffect, useState } from "react";
import { useAnalyze } from "./context";
import { Button, Card, Label, StatusBadge, TextArea } from "../../ui/primitives";
import { computeImageQuality } from "../../image/quality";
import { grayscaleToImageData } from "../../image/canvasUtils";
import { useApp } from "../../state/AppState";

export function StepQuality() {
  const { draft, setDraft, pipeline, goStep } = useAnalyze();
  const { addAudit } = useApp();
  const [running, setRunning] = useState(false);
  const [reason, setReason] = useState("");
  const quality = draft.quality;

  useEffect(() => {
    if (!quality && pipeline.grayOriginal && pipeline.width && !running) {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline.grayOriginal]);

  async function run() {
    if (!pipeline.grayOriginal) return;
    setRunning(true);
    const imageData = grayscaleToImageData(pipeline.grayOriginal, pipeline.width, pipeline.height);
    const report = await computeImageQuality(imageData, draft.original.fileSizeBytes);
    setDraft({ quality: report });
    addAudit("quality_check", `Quality check executed for field ${draft.fieldNumber}: score ${report.score}/100 (${report.overall}).`);
    setRunning(false);
  }

  const canProceed = quality && (quality.overall !== "FAIL" || quality.overrideUsed);

  return (
    <Card className="animate-fade-in-up">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold text-app">Image Quality Engine</div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">Software Quality Gate</span>
      </div>
      <p className="mb-4 text-xs text-app-muted">
        These thresholds are software-defined quality gates, not universal ASTM requirements. They help ensure the
        image is suitable for reliable point classification.
      </p>

      {running && <div className="text-sm text-app-secondary">Analyzing image — evaluating focus, contrast, exposure, illumination…</div>}

      {quality && (
        <div className="space-y-5">
          <div className="flex items-center gap-6 rounded-[14px] border border-app bg-black/10 p-5">
            <div>
              <div className="font-mono-num text-4xl font-extrabold text-app">{quality.score}<span className="text-lg text-app-muted">/100</span></div>
              <StatusBadge status={quality.overall} />
            </div>
            <div className="text-xs text-app-secondary">
              {quality.overall === "GOOD" && "Ready for analysis."}
              {quality.overall === "WARNING" && "Usable, but review flagged metrics below before proceeding."}
              {quality.overall === "FAIL" && "One or more critical checks failed. Operator override required to continue."}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quality.metrics.map((m) => (
              <div key={m.key} className="rounded-[10px] border border-app p-3">
                <div className="flex items-center justify-between">
                  <Label>{m.label}</Label>
                  <StatusBadge status={m.status} />
                </div>
                <div className="mt-1 font-mono-num text-sm text-app">
                  {m.value}
                  {m.unit ? ` ${m.unit}` : ""}
                </div>
                <div className="mt-1 text-xs text-app-muted">{m.message}</div>
              </div>
            ))}
          </div>

          {quality.overall === "FAIL" && !quality.overrideUsed && (
            <div className="space-y-2 rounded-[10px] border border-danger/40 bg-danger/10 p-4">
              <div className="text-sm font-semibold text-danger">Quality gate failed</div>
              <div className="text-xs text-app-secondary">You may override and continue, but the reason will be permanently recorded in the audit trail and report.</div>
              <TextArea label="Override Reason" value={reason} onChange={setReason} placeholder="e.g. Reference sample with known limitations; proceeding for demonstration." />
              <Button
                variant="danger"
                size="sm"
                disabled={!reason.trim()}
                onClick={() => {
                  setDraft({ quality: { ...quality, overrideUsed: true, overrideReason: reason } });
                  addAudit("quality_override", `Quality gate override for field ${draft.fieldNumber}: ${reason}`);
                }}
              >
                Acknowledge & Override
              </Button>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={run}>
              Re-run Quality Check
            </Button>
            <Button onClick={() => goStep(4)} disabled={!canProceed}>
              Continue to Grid Setup →
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
