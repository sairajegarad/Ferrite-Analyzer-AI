// ============================================================================
// ASTM E562 STATISTICAL CALCULATION ENGINE
// Pure functions only. No UI. No rounding except at the presentation layer.
// ============================================================================
import type { ASTMFieldStat, ASTMStatistics, Field } from "../types";
import { lookupTMultiplier } from "./tTable";

/** Equation 1: Pp(i) = (Pi / PT) x 100 */
export function fieldPercentage(Pi: number, PT: number): number {
  if (PT <= 0) return NaN;
  return (Pi / PT) * 100;
}

/** Pi from raw point counts: ferrite = 1.0, boundary = 0.5, matrix = 0.0 */
export function computePiFromCounts(ferrite: number, boundary: number): number {
  return ferrite * 1.0 + boundary * 0.5;
}

/** Equation 2: mean of field percentages */
export function meanOf(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Equation 3: SAMPLE standard deviation (n-1 denominator) */
export function sampleStdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return NaN;
  const mean = meanOf(values);
  const sumSq = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return Math.sqrt(sumSq / (n - 1));
}

/** Full ASTM E562 statistics for a completed set of fields. */
export function computeASTMStatistics(fields: Field[]): ASTMStatistics | null {
  const savedFields = fields.filter((f) => f.savedAt !== null && f.PT > 0);
  if (savedFields.length === 0) return null;

  const fieldStats: ASTMFieldStat[] = savedFields.map((f) => ({
    fieldId: f.id,
    fieldNumber: f.fieldNumber,
    PT: f.PT,
    Pi: f.Pi,
    PpPercent: f.PpPercent,
  }));

  const n = fieldStats.length;
  const percentages = fieldStats.map((f) => f.PpPercent);
  const mean = meanOf(percentages);
  const s = n >= 2 ? sampleStdDev(percentages) : NaN;

  const tLookup = lookupTMultiplier(n);
  const t = tLookup.t;

  const ci95 = n >= 2 && Number.isFinite(s) ? (t * s) / Math.sqrt(n) : NaN;
  const vvLow = mean - ci95;
  const vvHigh = mean + ci95;
  const relativeAccuracyPercent = mean !== 0 ? (ci95 / mean) * 100 : NaN;

  const totalPT = fieldStats.reduce((a, f) => a + f.PT, 0);
  const totalPi = fieldStats.reduce((a, f) => a + f.Pi, 0);

  return {
    n,
    fieldStats,
    mean,
    sampleStdDev: s,
    tMultiplier: t,
    tSource: tLookup.source,
    degreesOfFreedom: tLookup.degreesOfFreedom,
    ci95,
    vvLow,
    vvHigh,
    relativeAccuracyPercent,
    formalCIReady: n >= 30,
    totalPT,
    totalPi,
  };
}

/** Running (cumulative) statistics for field k=1..n, used for stabilization charts. */
export function computeRunningStatistics(fields: Field[]): Array<{
  fieldNumber: number;
  n: number;
  cumulativeMean: number;
  cumulativeRA: number | null;
  PpPercent: number;
}> {
  const saved = fields.filter((f) => f.savedAt !== null && f.PT > 0);
  const out: Array<{
    fieldNumber: number;
    n: number;
    cumulativeMean: number;
    cumulativeRA: number | null;
    PpPercent: number;
  }> = [];
  const running: number[] = [];
  for (const f of saved) {
    running.push(f.PpPercent);
    const mean = meanOf(running);
    let ra: number | null = null;
    if (running.length >= 2) {
      const s = sampleStdDev(running);
      const { t } = lookupTMultiplier(running.length);
      const ci = (t * s) / Math.sqrt(running.length);
      ra = mean !== 0 ? (ci / mean) * 100 : null;
    }
    out.push({
      fieldNumber: f.fieldNumber,
      n: running.length,
      cumulativeMean: mean,
      cumulativeRA: ra,
      PpPercent: f.PpPercent,
    });
  }
  return out;
}

/** Precision-improvement guideline: n_required ~ n_current * (RA_current / RA_target)^2 */
export function estimateFieldsForTargetRA(
  currentFields: number,
  currentRA: number,
  targetRA: number,
): number {
  if (currentRA <= 0 || targetRA <= 0 || currentFields <= 0) return currentFields;
  return Math.ceil(currentFields * (currentRA / targetRA) ** 2);
}

export interface OutlierFlag {
  fieldId: string;
  fieldNumber: number;
  reason: string;
}

/** Statistical outlier assistance (flag only — never auto-remove). Uses 2*sigma rule. */
export function detectOutlierFields(fields: Field[]): OutlierFlag[] {
  const saved = fields.filter((f) => f.savedAt !== null && f.PT > 0);
  if (saved.length < 4) return [];
  const values = saved.map((f) => f.PpPercent);
  const mean = meanOf(values);
  const s = sampleStdDev(values);
  if (!Number.isFinite(s) || s === 0) return [];
  const flags: OutlierFlag[] = [];
  for (const f of saved) {
    const z = (f.PpPercent - mean) / s;
    if (Math.abs(z) > 2) {
      flags.push({
        fieldId: f.id,
        fieldNumber: f.fieldNumber,
        reason: `Field percentage (${f.PpPercent.toFixed(2)}%) deviates ${Math.abs(z).toFixed(
          2,
        )} standard deviations from the sample mean (${mean.toFixed(2)}%).`,
      });
    }
  }
  return flags;
}
