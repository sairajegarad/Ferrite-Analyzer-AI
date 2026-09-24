import { useState } from "react";
import { useAnalyze } from "./context";
import { Button, Card, HelpTip, Label, Select, TextField } from "../../ui/primitives";
import { recommendGrid, zeroHitWarning, type FerriteEstimateBand } from "../../core/astm/gridAdvisor";
import { lookupTable3FieldCount, nearestVvBand, type RATarget } from "../../core/astm/fieldCountAdvisor";
import { buildCustomGridConfig, buildGridConfig } from "../../grid/gridGenerator";
import type { GridDensity } from "../../core/types";
import { useApp } from "../../state/AppState";

const BANDS: { value: FerriteEstimateBand; label: string }[] = [
  { value: "<2", label: "< 2%" },
  { value: "2-5", label: "2% – 5%" },
  { value: "5-10", label: "5% – 10%" },
  { value: "10-20", label: "10% – 20%" },
  { value: ">20", label: "> 20%" },
];

export function StepGrid() {
  const { draft, setDraft, goStep } = useAnalyze();
  const { state, dispatch, addAudit } = useApp();
  const [band, setBand] = useState<FerriteEstimateBand>("5-10");
  const [precision, setPrecision] = useState<RATarget>(20);
  const [customRows, setCustomRows] = useState("10");
  const [customCols, setCustomCols] = useState("10");
  const [customReason, setCustomReason] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const recommendation = recommendGrid(band);
  const vvBand = nearestVvBand(band === "<2" ? 2 : band === "2-5" ? 3.5 : band === "5-10" ? 7.5 : band === "10-20" ? 15 : 25);
  const gridForTable3 = recommendation.density === 400 ? 100 : (recommendation.density as 16 | 25 | 49 | 100);
  const recommendedFieldCount = lookupTable3FieldCount(precision, vvBand, gridForTable3);
  const warning = zeroHitWarning(band === "<2" ? 1 : band === "2-5" ? 3.5 : band === "5-10" ? 7.5 : band === "10-20" ? 15 : 25, recommendation.density);

  function applyGrid(density: GridDensity) {
    setDraft({ grid: buildGridConfig(density) });
  }

  function applyCustomGrid() {
    const rows = parseInt(customRows, 10);
    const cols = parseInt(customCols, 10);
    if (!rows || !cols || rows < 1 || cols < 1) return;
    setDraft({ grid: buildCustomGridConfig(rows, cols, customReason || "Operator-defined custom grid") });
    addAudit("grid_changed", `Custom grid ${rows}x${cols} selected for field ${draft.fieldNumber}: ${customReason}`);
  }

  function confirmAndPlan() {
    dispatch({
      type: "SET_PLANNING",
      planning: {
        estimatedFerritePercent: vvBand,
        desiredPrecisionRA: precision,
        recommendedGridDensity: recommendation.density,
        recommendedFieldCount,
      },
    });
    addAudit("grid_changed", `Grid ${draft.grid.rows}x${draft.grid.cols} (${draft.grid.density} pts) confirmed for field ${draft.fieldNumber}.`);
    goStep(5);
  }

  return (
    <Card className="animate-fade-in-up space-y-6">
      <div>
        <div className="text-sm font-semibold text-app">ASTM E562 Table 2 — Grid Selection Assistant</div>
        <p className="mt-1 text-xs text-app-muted">
          Automatic segmentation may propose an estimate, but the operator confirms the estimated constituent fraction
          band used for grid planning.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Estimated Ferrite Fraction"
          value={band}
          onChange={(v) => setBand(v as FerriteEstimateBand)}
          options={BANDS}
          help="A rough visual estimate is enough — this only guides grid density planning, not the final result."
        />
        <Select
          label="Desired Relative Accuracy"
          value={String(precision)}
          onChange={(v) => setPrecision(Number(v) as RATarget)}
          options={[
            { value: "33", label: "33% RA (fast survey)" },
            { value: "20", label: "20% RA (typical)" },
            { value: "10", label: "10% RA (high precision)" },
          ]}
          help="ASTM E562 Table 3 planning target for percent relative accuracy."
        />
      </div>

      <div className="rounded-[14px] border border-accent/30 bg-accent/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Recommended Grid</Label>
            <div className="mt-1 text-2xl font-bold text-app">{recommendation.density} points</div>
          </div>
          <div className="text-right">
            <Label>Approx. Field Count Needed</Label>
            <div className="mt-1 font-mono-num text-2xl font-bold text-accent">~{recommendedFieldCount}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-app-secondary">{recommendation.reason}</p>
        {warning && <p className="mt-2 text-xs text-warning">⚠ {warning}</p>}
        <p className="mt-2 text-[11px] text-app-muted">
          Table 3 values are a PLANNING ESTIMATE only. Actual %RA is always calculated from measured field data, never
          taken directly from this table.
        </p>
        <div className="mt-3 flex gap-3">
          <Button size="sm" onClick={() => applyGrid(recommendation.density)}>
            Use {recommendation.density}-point grid
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyGrid(100)}>
            Use 100-point grid anyway
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[16, 25, 49, 100, 400].map((d) => (
          <button
            key={d}
            onClick={() => applyGrid(d as GridDensity)}
            className={`rounded-[10px] border p-3 text-center transition-colors focus-ring ${
              draft.grid.density === d && !draft.grid.isCustom ? "border-accent bg-accent/10 text-accent" : "border-app text-app-secondary hover:border-app-strong"
            }`}
          >
            <div className="font-mono-num text-lg font-bold">{d}</div>
            <div className="text-[10px] uppercase tracking-wider">
              {Math.sqrt(d)}×{Math.sqrt(d)}
            </div>
          </button>
        ))}
      </div>

      <div>
        <button className="text-xs font-semibold text-app-muted hover:text-accent" onClick={() => setShowCustom((s) => !s)}>
          {showCustom ? "− Hide" : "+ Show"} custom / user-defined grid
        </button>
        {showCustom && (
          <div className="mt-3 space-y-3 rounded-[10px] border border-warning/30 bg-warning/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-warning">Custom / User-Defined</div>
            <p className="text-xs text-app-secondary">
              Custom grids are not automatically ASTM-compliant. The operator must verify applicability and document a
              reason.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Rows" value={customRows} onChange={setCustomRows} type="number" />
              <TextField label="Cols" value={customCols} onChange={setCustomCols} type="number" />
            </div>
            <TextField label="Override Reason" value={customReason} onChange={setCustomReason} placeholder="Why is a custom grid needed?" />
            <Button size="sm" variant="secondary" onClick={applyCustomGrid}>
              Apply Custom Grid
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-[10px] border border-app p-4 text-xs text-app-secondary">
        <div className="mb-2 flex items-center gap-1 font-semibold text-app">
          Magnification Assistant <HelpTip text="Select magnification high enough to resolve the microstructure without causing adjacent grid points to fall on the same feature." />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-[8px] border border-danger/30 bg-danger/5 p-2">
            <div className="mb-1 text-lg">⬤ ⬤</div>
            Feature too large — grid points may miss phase boundaries
          </div>
          <div className="rounded-[8px] border border-success/30 bg-success/5 p-2">
            <div className="mb-1 text-base">• • •<br />• • •</div>
            Feature appropriate — several features per field
          </div>
          <div className="rounded-[8px] border border-danger/30 bg-danger/5 p-2">
            <div className="mb-1 text-[8px] leading-tight">••••••••••<br />••••••••••</div>
            Feature too small — noise may dominate classification
          </div>
        </div>
        <div className="mt-3">
          <TextField
            label="Recorded Magnification"
            value={draft.notes.includes("mag:") ? "" : state.currentAnalysis!.sample.magnification}
            onChange={() => {}}
            placeholder="Set in Sample step"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="font-mono-num text-xs text-app-muted">
          Selected: {draft.grid.rows}×{draft.grid.cols} = PT {draft.grid.rows * draft.grid.cols}
          {draft.grid.isCustom && " (CUSTOM)"}
        </div>
        <Button onClick={confirmAndPlan}>Confirm Grid & Continue →</Button>
      </div>
    </Card>
  );
}
