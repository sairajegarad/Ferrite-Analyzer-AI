// ============================================================================
// ASTM E562 TABLE 3 — APPROXIMATE FIELD-COUNT PLANNING GUIDANCE
// For PLANNING only. Actual %RA must always be calculated from measured data.
// ============================================================================
import type { GridDensity } from "../types";

export type RATarget = 33 | 20 | 10;
export type VvBand = 2 | 5 | 10 | 20;

type Table = Record<RATarget, Record<VvBand, Record<GridDensity extends never ? never : 16 | 25 | 49 | 100, number>>>;

const TABLE_3: Table = {
  33: {
    2: { 16: 110, 25: 75, 49: 35, 100: 20 },
    5: { 16: 50, 25: 30, 49: 15, 100: 8 },
    10: { 16: 25, 25: 15, 49: 10, 100: 4 },
    20: { 16: 15, 25: 10, 49: 5, 100: 4 },
  },
  20: {
    2: { 16: 310, 25: 200, 49: 105, 100: 50 },
    5: { 16: 125, 25: 80, 49: 40, 100: 20 },
    10: { 16: 65, 25: 40, 49: 20, 100: 10 },
    20: { 16: 30, 25: 20, 49: 10, 100: 5 },
  },
  10: {
    2: { 16: 1250, 25: 800, 49: 410, 100: 200 },
    5: { 16: 500, 25: 320, 49: 165, 100: 80 },
    10: { 16: 250, 25: 160, 49: 85, 100: 40 },
    20: { 16: 125, 25: 80, 49: 40, 100: 20 },
  },
};

export function lookupTable3FieldCount(
  ra: RATarget,
  vv: VvBand,
  grid: 16 | 25 | 49 | 100,
): number {
  return TABLE_3[ra][vv][grid];
}

export function nearestVvBand(estimatedPercent: number): VvBand {
  const bands: VvBand[] = [2, 5, 10, 20];
  return bands.reduce((prev, curr) =>
    Math.abs(curr - estimatedPercent) < Math.abs(prev - estimatedPercent) ? curr : prev,
  );
}

export const TABLE_3_RAW = TABLE_3;
