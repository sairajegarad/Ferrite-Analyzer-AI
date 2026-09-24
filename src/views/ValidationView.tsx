import { useMemo, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../state/AppState";
import { Button, Card, Label, StatusBadge, TextField, Toggle } from "../ui/primitives";
import { computeASTMStatistics } from "../core/astm/calculations";
import { newId, nowIso } from "../core/id";
import type { StoredValidationRun } from "../project/storage";

export function ValidationView() {
  const { state, saveValidationRun } = useApp();
  const analysis = state.currentAnalysis;
  const stats = analysis ? computeASTMStatistics(analysis.fields) : null;

  const [label, setLabel] = useState("");
  const [reference, setReference] = useState("");
  const [measured, setMeasured] = useState(stats ? stats.mean.toFixed(2) : "");
  const [blind, setBlind] = useState(false);

  const runs = state.validationRuns;

  async function addRun() {
    const m = Number(measured);
    if (!Number.isFinite(m)) return;
    const run: StoredValidationRun = {
      id: newId("val"),
      analysisId: analysis?.id ?? "manual",
      sampleId: analysis?.sample.sampleId ?? "manual-entry",
      label: label || `Run ${runs.length + 1}`,
      referenceValue: blind ? null : reference ? Number(reference) : null,
      measuredValue: m,
      blind,
      revealedAt: null,
      createdAt: nowIso(),
    };
    await saveValidationRun(run);
    setLabel("");
    setReference("");
  }

  async function reveal(run: StoredValidationRun, refValue: number) {
    await saveValidationRun({ ...run, referenceValue: refValue, revealedAt: nowIso() });
  }

  const withRef = runs.filter((r) => r.referenceValue !== null) as (StoredValidationRun & { referenceValue: number })[];

  const errorStats = useMemo(() => {
    if (withRef.length === 0) return null;
    const errors = withRef.map((r) => r.measuredValue - r.referenceValue);
    const abs = errors.map(Math.abs);
    const pct = withRef.map((r) => (Math.abs(r.measuredValue - r.referenceValue) / Math.abs(r.referenceValue || 1)) * 100);
    const mae = abs.reduce((a, b) => a + b, 0) / abs.length;
    const mape = pct.reduce((a, b) => a + b, 0) / pct.length;
    const rmse = Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length);
    const bias = errors.reduce((a, b) => a + b, 0) / errors.length;
    const max = Math.max(...abs);
    const min = Math.min(...abs);
    const meanErr = bias;
    const sd = Math.sqrt(errors.reduce((a, b) => a + (b - meanErr) ** 2, 0) / Math.max(1, errors.length - 1));
    return { mae, mape, rmse, bias, max, min, sd, n: withRef.length };
  }, [withRef]);

  const scatterData = withRef.map((r) => ({ x: r.referenceValue, y: r.measuredValue, label: r.label }));
  const lineDomain = scatterData.length
    ? [Math.min(...scatterData.map((d) => d.x), ...scatterData.map((d) => d.y)), Math.max(...scatterData.map((d) => d.x), ...scatterData.map((d) => d.y))]
    : [0, 100];
  const identityLine = [{ x: lineDomain[0], y: lineDomain[0] }, { x: lineDomain[1], y: lineDomain[1] }];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-xl font-bold text-app">Validation Workspace</h1>
        <p className="text-sm text-app-secondary">
          Independent from the competition/sample analysis dataset. Used to validate software/operator accuracy — never
          to change the ASTM measurement result.
        </p>
      </div>

      <Card>
        <Label>Add Validation Run</Label>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <TextField label="Label" value={label} onChange={setLabel} placeholder="e.g. Reference Sample A" />
          <TextField label="Measured Value (%)" value={measured} onChange={setMeasured} type="number" />
          <TextField label="Reference Value (%)" value={reference} onChange={setReference} type="number" placeholder={blind ? "Hidden (blind mode)" : ""} />
          <div className="flex items-end pb-2.5">
            <Toggle checked={blind} onChange={setBlind} label="Blind mode" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={addRun}>Add Run</Button>
        </div>
      </Card>

      {errorStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <MiniStat label="n" value={errorStats.n} />
          <MiniStat label="MAE" value={errorStats.mae.toFixed(3)} />
          <MiniStat label="MAPE" value={`${errorStats.mape.toFixed(2)}%`} />
          <MiniStat label="RMSE" value={errorStats.rmse.toFixed(3)} />
          <MiniStat label="Bias" value={errorStats.bias.toFixed(3)} />
          <MiniStat label="Max |err|" value={errorStats.max.toFixed(3)} />
          <MiniStat label="σ error" value={errorStats.sd.toFixed(3)} />
        </div>
      )}

      {scatterData.length > 0 && (
        <Card>
          <div className="mb-3 text-sm font-semibold text-app">Reference vs. Measured (1:1 line)</div>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" dataKey="x" name="Reference" unit="%" tick={{ fontSize: 11 }} domain={lineDomain} />
              <YAxis type="number" dataKey="y" name="Measured" unit="%" tick={{ fontSize: 11 }} domain={lineDomain} />
              <RTooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", fontSize: 12 }} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatterData} fill="var(--accent)" />
              <Scatter data={identityLine} line={{ stroke: "var(--text-muted)", strokeDasharray: "4 4" }} shape={() => <g />} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-app bg-black/10 text-left text-[11px] uppercase tracking-wider text-app-muted">
            <tr>
              <th className="px-4 py-2.5">Label</th>
              <th className="px-4 py-2.5">Sample</th>
              <th className="px-4 py-2.5">Measured</th>
              <th className="px-4 py-2.5">Reference</th>
              <th className="px-4 py-2.5">Abs. Error</th>
              <th className="px-4 py-2.5">% Error</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const hidden = r.blind && r.referenceValue === null;
              const err = r.referenceValue !== null ? Math.abs(r.measuredValue - r.referenceValue) : null;
              const pctErr = r.referenceValue ? (Math.abs(r.measuredValue - r.referenceValue) / Math.abs(r.referenceValue)) * 100 : null;
              return (
                <tr key={r.id} className="border-t border-app/60 font-mono-num">
                  <td className="px-4 py-2.5 font-sans text-app">{r.label}</td>
                  <td className="px-4 py-2.5 font-sans text-app-secondary">{r.sampleId}</td>
                  <td className="px-4 py-2.5">{r.measuredValue.toFixed(2)}%</td>
                  <td className="px-4 py-2.5">
                    {hidden ? (
                      <button className="text-accent underline" onClick={() => {
                        const v = prompt("Enter reference value to reveal:");
                        if (v && Number.isFinite(Number(v))) reveal(r, Number(v));
                      }}>
                        Reveal
                      </button>
                    ) : r.referenceValue !== null ? (
                      `${r.referenceValue.toFixed(2)}%`
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5">{err !== null ? err.toFixed(3) : "—"}</td>
                  <td className="px-4 py-2.5">{pctErr !== null ? `${pctErr.toFixed(2)}%` : "—"}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={hidden ? "NEUTRAL" : "GOOD"} label={hidden ? "BLIND" : "REVEALED"} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
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
