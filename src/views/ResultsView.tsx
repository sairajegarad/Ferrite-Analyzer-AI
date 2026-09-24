import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  BarChart,
} from "recharts";
import { useApp } from "../state/AppState";
import { Button, Card, EmptyState, FormulaBlock, HelpTip, Label, StatusBadge } from "../ui/primitives";
import { computeASTMStatistics, computeRunningStatistics, detectOutlierFields, estimateFieldsForTargetRA } from "../core/astm/calculations";

export function ResultsView() {
  const { state, dispatch } = useApp();
  const analysis = state.currentAnalysis;
  const [showDerivation, setShowDerivation] = useState(false);

  if (!analysis) {
    return (
      <EmptyState
        title="No active analysis"
        description="Create a new analysis to see results."
        action={<Button onClick={() => dispatch({ type: "SET_VIEW", view: "new-analysis" })}>New Analysis</Button>}
      />
    );
  }

  const stats = computeASTMStatistics(analysis.fields);
  const running = computeRunningStatistics(analysis.fields);
  const outliers = detectOutlierFields(analysis.fields);

  if (!stats) {
    return (
      <EmptyState
        title="No completed field measurements"
        description="Save at least one field to view ASTM statistical results."
        action={<Button onClick={() => dispatch({ type: "SET_VIEW", view: "analyze" })}>Go to Analysis</Button>}
      />
    );
  }

  const precisionStatus = stats.relativeAccuracyPercent < 15 ? "GOOD" : stats.relativeAccuracyPercent < 30 ? "MODERATE" : "POOR";
  const reportingStatus = stats.formalCIReady ? "READY" : stats.n < 5 ? "REVIEW REQUIRED" : "MORE FIELDS REQUIRED";
  const fieldsFor2x = estimateFieldsForTargetRA(stats.n, stats.relativeAccuracyPercent, stats.relativeAccuracyPercent / 2);

  const histogram = useMemo(() => buildHistogram(stats.fieldStats.map((f) => f.PpPercent)), [stats]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card elevated className="relative overflow-hidden text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Ferrite Volume Fraction</div>
        <div className="mt-2 font-mono-num text-6xl font-extrabold text-app">{stats.mean.toFixed(2)}%</div>
        <div className="mt-1 font-mono-num text-lg text-app-secondary">± {stats.ci95.toFixed(2)}% (95% CI)</div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <StatusBadge status={reportingStatus} label={reportingStatus === "READY" ? "VALIDATED" : reportingStatus} />
          <StatusBadge status={precisionStatus} label={`Precision: ${precisionStatus}`} />
        </div>
        <p className="mx-auto mt-4 max-w-xl text-sm text-app-secondary">
          Estimated ferrite volume fraction is {stats.mean.toFixed(2)}% with a 95% confidence interval of ±{stats.ci95.toFixed(2)}{" "}
          percentage points, based on {stats.n} measured field{stats.n === 1 ? "" : "s"}. Percent relative accuracy (%RA) is{" "}
          {stats.relativeAccuracyPercent.toFixed(2)}% — do not confuse this with the ± percentage-point CI above.
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => setShowDerivation((s) => !s)}>
          {showDerivation ? "Hide" : "Why This Result?"}
        </Button>
      </Card>

      {showDerivation && <DerivationPanel stats={stats} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        <MiniStat label="Fields" value={stats.n} />
        <MiniStat label="Points" value={stats.totalPT} />
        <MiniStat label="Ferrite Pts" value={stats.totalPi.toFixed(1)} />
        <MiniStat label="Mean Pp" value={`${stats.mean.toFixed(2)}%`} />
        <MiniStat label="Std Dev" value={stats.sampleStdDev.toFixed(3)} />
        <MiniStat label="t mult." value={stats.tMultiplier} />
        <MiniStat label="95% CI" value={`±${stats.ci95.toFixed(2)}%`} />
        <MiniStat label="%RA" value={`${stats.relativeAccuracyPercent.toFixed(2)}%`} />
      </div>

      {!stats.formalCIReady && (
        <Card className="border-warning/40">
          <div className="flex items-start gap-3 text-sm">
            <span className="text-warning">⚠</span>
            <div>
              <div className="font-semibold text-app">
                Statistical CI computed — Formal ASTM 95% CI not yet satisfied (n = {stats.n})
              </div>
              <div className="mt-1 text-app-secondary">
                ASTM E562 Annex A1.1 recommends a minimum of 30 fields for a formal 95% confidence interval. The value
                above is mathematically computed from available data but should be reported as a preliminary estimate
                until 30 fields are measured.
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center gap-1 text-sm font-semibold text-app">
          Field Percentage by Field <HelpTip text="Each bar is Pp(i) for one measured field. The dashed line is the sample mean." />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={stats.fieldStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="fieldNumber" tick={{ fontSize: 11 }} label={{ value: "Field #", position: "insideBottom", offset: -2, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <RTooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", fontSize: 12 }} />
            <ReferenceLine y={stats.mean} stroke="var(--accent)" strokeDasharray="4 4" label={{ value: "Mean", fontSize: 10, fill: "var(--accent)" }} />
            <Bar dataKey="PpPercent" name="Pp(i) %" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-app">Cumulative Mean Stabilization</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={running}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="n" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <RTooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", fontSize: 12 }} />
              <Line type="monotone" dataKey="cumulativeMean" stroke="var(--success)" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="mb-3 text-sm font-semibold text-app">Running % Relative Accuracy</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={running}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="n" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <RTooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", fontSize: 12 }} />
              <Line type="monotone" dataKey="cumulativeRA" stroke="var(--warning)" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="mb-3 text-sm font-semibold text-app">Distribution of Field Percentages</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={histogram}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <RTooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", fontSize: 12 }} />
            <Bar dataKey="count" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold text-app">Precision Improvement Guideline</div>
        <p className="text-xs text-app-secondary">
          Reducing %RA by roughly 50% generally requires approximately 4× as many total fields (engineering guideline,
          not a guaranteed outcome).
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center font-mono-num">
          <MiniStat label="Current Fields" value={stats.n} />
          <MiniStat label="Current %RA" value={`${stats.relativeAccuracyPercent.toFixed(1)}%`} />
          <MiniStat label={`≈50% Lower %RA needs`} value={`≈${fieldsFor2x} fields`} />
        </div>
      </Card>

      {outliers.length > 0 && (
        <Card className="border-warning/40">
          <div className="mb-2 text-sm font-semibold text-warning">Review Recommended — Statistical Outlier Assistance</div>
          <p className="mb-2 text-xs text-app-secondary">
            Outliers are flagged for operator review only. They are never automatically removed from the ASTM
            calculation.
          </p>
          <ul className="space-y-1 text-xs text-app-secondary">
            {outliers.map((o) => (
              <li key={o.fieldId}>
                Field #{o.fieldNumber}: {o.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => dispatch({ type: "SET_VIEW", view: "reports" })}>
          Go to Reports & Export →
        </Button>
      </div>
    </div>
  );
}

function DerivationPanel({ stats: s }: { stats: ReturnType<typeof computeASTMStatistics> }) {
  if (!s) return null;
  return (
    <Card className="text-left">
      <Label>Show Exact Calculation</Label>
      <div className="mt-2 space-y-3">
        <FormulaBlock
          lines={[
            "Field percentages Pp(i):",
            s.fieldStats.map((f) => f.PpPercent.toFixed(4)).join(", "),
          ]}
        />
        <FormulaBlock
          lines={[
            "P̄p = (1/n) × Σ Pp(i)",
            `= (1/${s.n}) × ${s.fieldStats.reduce((a, f) => a + f.PpPercent, 0).toFixed(4)} = ${s.mean.toFixed(6)}%`,
          ]}
        />
        <FormulaBlock
          lines={[
            "s = √[ Σ(Pp(i) − P̄p)² / (n − 1) ]",
            `= ${s.sampleStdDev.toFixed(6)}`,
          ]}
        />
        <FormulaBlock
          lines={[
            `t multiplier (n=${s.n}, source: ${s.tSource}) = ${s.tMultiplier}`,
            "95% CI = t × s / √n",
            `= ${s.tMultiplier} × ${s.sampleStdDev.toFixed(4)} / √${s.n} = ${s.ci95.toFixed(6)}%`,
          ]}
        />
        <FormulaBlock
          lines={[
            "Vv = P̄p ± 95% CI",
            `= ${s.mean.toFixed(4)}% ± ${s.ci95.toFixed(4)}% → [${s.vvLow.toFixed(4)}%, ${s.vvHigh.toFixed(4)}%]`,
            "",
            "%RA = (95% CI / P̄p) × 100",
            `= (${s.ci95.toFixed(4)} / ${s.mean.toFixed(4)}) × 100 = ${s.relativeAccuracyPercent.toFixed(4)}%`,
          ]}
        />
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">{label}</div>
      <div className="mt-1 font-mono-num text-lg font-bold text-app">{value}</div>
    </div>
  );
}

function buildHistogram(values: number[]): { bucket: string; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const bins = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(values.length))));
  const width = (max - min || 1) / bins;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    bucket: `${(min + i * width).toFixed(1)}-${(min + (i + 1) * width).toFixed(1)}`,
    count: 0,
  }));
  values.forEach((v) => {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width));
    buckets[idx].count++;
  });
  return buckets;
}
