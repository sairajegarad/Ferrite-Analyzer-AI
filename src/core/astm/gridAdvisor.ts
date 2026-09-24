// ============================================================================
// ASTM E562 TABLE 2 — GRID SELECTION GUIDANCE (visual area fraction -> grid)
// ============================================================================
import type { GridDensity } from "../types";

export interface GridRecommendation {
  density: GridDensity;
  rangeLabel: string;
  reason: string;
}

export type FerriteEstimateBand = "<2" | "2-5" | "5-10" | "10-20" | ">20";

const BAND_TABLE: Record<FerriteEstimateBand, GridRecommendation> = {
  "<2": {
    density: 100,
    rangeLabel: "< 2%",
    reason:
      "Very low constituent fraction. ASTM E562 Table 2 does not extend below 2%; the densest standard grid (100 points) is recommended, and a 400-point advanced grid may be considered to avoid excessive fields with zero hits.",
  },
  "2-5": {
    density: 100,
    rangeLabel: "2% – 5%",
    reason:
      "Per ASTM E562 Table 2, low constituent fractions require a higher point density (100 points) to keep the number of required fields practical while maintaining precision.",
  },
  "5-10": {
    density: 49,
    rangeLabel: "5% – 10%",
    reason: "Per ASTM E562 Table 2, this fraction range is efficiently sampled with a 49-point (7x7) grid.",
  },
  "10-20": {
    density: 25,
    rangeLabel: "10% – 20%",
    reason: "Per ASTM E562 Table 2, this fraction range is efficiently sampled with a 25-point (5x5) grid.",
  },
  ">20": {
    density: 16,
    rangeLabel: "> 20%",
    reason:
      "Per ASTM E562 Table 2, higher constituent fractions are efficiently sampled with a 16-point (4x4) grid.",
  },
};

export function recommendGrid(band: FerriteEstimateBand): GridRecommendation {
  return BAND_TABLE[band];
}

export const GRID_DENSITY_LAYOUT: Record<GridDensity, { rows: number; cols: number }> = {
  16: { rows: 4, cols: 4 },
  25: { rows: 5, cols: 5 },
  49: { rows: 7, cols: 7 },
  100: { rows: 10, cols: 10 },
  400: { rows: 20, cols: 20 },
};

export const STANDARD_GRID_DENSITIES: GridDensity[] = [16, 25, 49, 100, 400];

export function zeroHitWarning(estimatedFractionPercent: number, density: GridDensity): string | null {
  const expectedHits = (estimatedFractionPercent / 100) * density;
  if (expectedHits < 1) {
    return `At an estimated ${estimatedFractionPercent}% fraction, a ${density}-point grid is expected to register only ~${expectedHits.toFixed(
      2,
    )} constituent point(s) per field. ASTM E562 cautions against grids that produce many fields with zero constituent points — consider a denser grid or more fields.`;
  }
  return null;
}
