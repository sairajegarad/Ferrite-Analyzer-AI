import { describe, it, expect } from "vitest";
import {
  fieldPercentage,
  computePiFromCounts,
  meanOf,
  sampleStdDev,
  computeASTMStatistics,
  computeRunningStatistics,
  estimateFieldsForTargetRA,
  detectOutlierFields,
} from "../calculations";
import { lookupTMultiplier } from "../tTable";
import { recommendGrid, zeroHitWarning } from "../gridAdvisor";
import { lookupTable3FieldCount, nearestVvBand } from "../fieldCountAdvisor";
import { buildGridConfig, buildCustomGridConfig, generateGridPoints } from "../../../grid/gridGenerator";
import { computePiFromCounts as piAlias } from "../calculations";
import { createDraftField } from "../../factory";
import type { Field } from "../../types";

function fieldFrom(PpPercent: number, PT = 100, fieldNumber = 1): Field {
  const f = createDraftField(fieldNumber);
  f.PT = PT;
  f.Pi = (PpPercent / 100) * PT;
  f.PpPercent = PpPercent;
  f.savedAt = new Date().toISOString();
  return f;
}

describe("Equation 1: Pp(i) = (Pi / PT) x 100", () => {
  it("computes basic percentage", () => {
    expect(fieldPercentage(23.5, 100)).toBeCloseTo(23.5, 10);
  });
  it("handles zero PT as NaN (never divide by zero silently)", () => {
    expect(Number.isNaN(fieldPercentage(5, 0))).toBe(true);
  });
  it("handles all-zero field", () => {
    expect(fieldPercentage(0, 100)).toBe(0);
  });
  it("handles all-ferrite field", () => {
    expect(fieldPercentage(100, 100)).toBe(100);
  });
});

describe("Pi from raw counts (ferrite=1.0, boundary=0.5, matrix=0.0)", () => {
  it("matches the documented example: 10 ferrite, 2 boundary, 13 matrix -> Pi=11, Pp=44%", () => {
    const Pi = computePiFromCounts(10, 2);
    expect(Pi).toBe(11);
    expect(fieldPercentage(Pi, 25)).toBeCloseTo(44, 10);
  });
  it("boundary contributes exactly half weight", () => {
    expect(piAlias(0, 2)).toBe(1);
  });
  it("pure matrix contributes zero", () => {
    expect(computePiFromCounts(0, 0)).toBe(0);
  });
});

describe("mean and sample standard deviation", () => {
  const golden = [10, 20, 15, 25, 30];
  it("mean of golden dataset", () => {
    expect(meanOf(golden)).toBeCloseTo(20, 10);
  });
  it("sample standard deviation (n-1) of golden dataset", () => {
    // manual calc: deviations -10,0,-5,5,10 -> squares 100,0,25,25,100 = 250 / (5-1) = 62.5 -> sqrt = 7.90569...
    expect(sampleStdDev(golden)).toBeCloseTo(7.905694150420949, 8);
  });
  it("returns NaN std dev for a single value (n<2)", () => {
    expect(Number.isNaN(sampleStdDev([5]))).toBe(true);
  });
  it("uses n-1, not n, denominator (never population variance)", () => {
    const values = [1, 2, 3, 4];
    const s = sampleStdDev(values);
    const populationVariance = values.reduce((a, b) => a + (b - 2.5) ** 2, 0) / values.length;
    expect(s ** 2).not.toBeCloseTo(populationVariance, 5);
    expect(s ** 2).toBeCloseTo(values.reduce((a, b) => a + (b - 2.5) ** 2, 0) / (values.length - 1), 8);
  });
});

describe("ASTM E562 t-multiplier table", () => {
  it("returns exact table values", () => {
    expect(lookupTMultiplier(5).t).toBe(2.776);
    expect(lookupTMultiplier(10).t).toBe(2.262);
    expect(lookupTMultiplier(30).t).toBe(2.045);
    expect(lookupTMultiplier(40).t).toBe(2.02);
    expect(lookupTMultiplier(60).t).toBe(2.0);
  });
  it("flags n<5 as insufficient but still returns a reference value", () => {
    const r = lookupTMultiplier(3);
    expect(r.source).toBe("insufficient");
    expect(r.t).toBe(2.776);
  });
  it("interpolates between published rows and labels it clearly", () => {
    const r = lookupTMultiplier(35);
    expect(r.source).toBe("interpolated");
    expect(r.t).toBeGreaterThan(2.02);
    expect(r.t).toBeLessThan(2.045);
  });
  it("uses z-approximation beyond n=60 and labels it", () => {
    const r = lookupTMultiplier(200);
    expect(r.source).toBe("z-approximation");
    expect(r.t).toBe(1.96);
  });
  it("computes degrees of freedom as n-1", () => {
    expect(lookupTMultiplier(30).degreesOfFreedom).toBe(29);
  });
});

describe("full ASTM statistics pipeline (golden dataset n=5)", () => {
  const fields = [10, 20, 15, 25, 30].map((v, i) => fieldFrom(v, 100, i + 1));
  const stats = computeASTMStatistics(fields)!;

  it("computes n", () => expect(stats.n).toBe(5));
  it("computes mean", () => expect(stats.mean).toBeCloseTo(20, 10));
  it("computes sample stddev", () => expect(stats.sampleStdDev).toBeCloseTo(7.905694150420949, 8));
  it("selects exact t for n=5", () => {
    expect(stats.tMultiplier).toBe(2.776);
    expect(stats.tSource).toBe("exact");
  });
  it("computes 95% CI = t * s / sqrt(n)", () => {
    const expected = (2.776 * 7.905694150420949) / Math.sqrt(5);
    expect(stats.ci95).toBeCloseTo(expected, 6);
  });
  it("computes Vv range", () => {
    expect(stats.vvLow).toBeCloseTo(stats.mean - stats.ci95, 10);
    expect(stats.vvHigh).toBeCloseTo(stats.mean + stats.ci95, 10);
  });
  it("computes %RA = (CI/mean)*100", () => {
    expect(stats.relativeAccuracyPercent).toBeCloseTo((stats.ci95 / stats.mean) * 100, 10);
  });
  it("formal CI not ready below 30 fields", () => {
    expect(stats.formalCIReady).toBe(false);
  });
});

describe("formal CI readiness threshold", () => {
  it("is ready at exactly n=30", () => {
    const fields = Array.from({ length: 30 }, (_, i) => fieldFrom(15 + (i % 3), 100, i + 1));
    const stats = computeASTMStatistics(fields)!;
    expect(stats.formalCIReady).toBe(true);
    expect(stats.n).toBe(30);
  });
  it("is not ready at n=29", () => {
    const fields = Array.from({ length: 29 }, (_, i) => fieldFrom(15, 100, i + 1));
    const stats = computeASTMStatistics(fields)!;
    expect(stats.formalCIReady).toBe(false);
  });
});

describe("edge cases", () => {
  it("returns null statistics for zero saved fields", () => {
    expect(computeASTMStatistics([])).toBeNull();
  });
  it("handles a single saved field (std dev undefined)", () => {
    const stats = computeASTMStatistics([fieldFrom(18, 100, 1)])!;
    expect(stats.n).toBe(1);
    expect(Number.isNaN(stats.sampleStdDev)).toBe(true);
    expect(Number.isNaN(stats.ci95)).toBe(true);
  });
  it("handles two fields", () => {
    const stats = computeASTMStatistics([fieldFrom(10, 100, 1), fieldFrom(20, 100, 2)])!;
    expect(stats.n).toBe(2);
    expect(stats.mean).toBeCloseTo(15, 10);
  });
  it("handles an all-zero-percentage dataset without throwing", () => {
    const fields = [fieldFrom(0, 100, 1), fieldFrom(0, 100, 2), fieldFrom(0, 100, 3)];
    const stats = computeASTMStatistics(fields)!;
    expect(stats.mean).toBe(0);
    expect(Number.isNaN(stats.relativeAccuracyPercent)).toBe(true); // division by zero mean is flagged, not silently 0
  });
  it("ignores unsaved (draft) fields entirely", () => {
    const saved = fieldFrom(20, 100, 1);
    const draft = fieldFrom(99, 100, 2);
    draft.savedAt = null;
    const stats = computeASTMStatistics([saved, draft])!;
    expect(stats.n).toBe(1);
  });
  it("supports mixed grid sizes across fields (PT differs per field, Pp(i) still normalized)", () => {
    const f1 = fieldFrom(20, 16, 1);
    const f2 = fieldFrom(20, 100, 2);
    const stats = computeASTMStatistics([f1, f2])!;
    expect(stats.totalPT).toBe(116);
    expect(stats.mean).toBeCloseTo(20, 10);
  });
});

describe("running statistics", () => {
  it("produces one entry per saved field with growing n", () => {
    const fields = [10, 12, 14, 16].map((v, i) => fieldFrom(v, 100, i + 1));
    const running = computeRunningStatistics(fields);
    expect(running.map((r) => r.n)).toEqual([1, 2, 3, 4]);
    expect(running[0].cumulativeRA).toBeNull();
    expect(running[3].cumulativeMean).toBeCloseTo(13, 10);
  });
});

describe("precision improvement guideline", () => {
  it("estimates ~4x fields for ~50% RA reduction", () => {
    const result = estimateFieldsForTargetRA(20, 18, 9);
    expect(result).toBe(80);
  });
  it("returns same field count if target already met", () => {
    expect(estimateFieldsForTargetRA(20, 10, 10)).toBe(20);
  });
});

describe("outlier detection (flag only, never removes)", () => {
  it("flags a field far from the mean", () => {
    const fields = [15, 15.2, 14.8, 15.1, 14.9, 45].map((v, i) => fieldFrom(v, 100, i + 1));
    const flags = detectOutlierFields(fields);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags[0].fieldNumber).toBe(6);
  });
  it("does not flag a tight, consistent dataset", () => {
    const fields = [15, 16, 14, 15, 15.5].map((v, i) => fieldFrom(v, 100, i + 1));
    expect(detectOutlierFields(fields)).toHaveLength(0);
  });
});

describe("ASTM Table 2 grid advisor", () => {
  it("recommends 100 points for 2-5% band", () => expect(recommendGrid("2-5").density).toBe(100));
  it("recommends 49 points for 5-10% band", () => expect(recommendGrid("5-10").density).toBe(49));
  it("recommends 25 points for 10-20% band", () => expect(recommendGrid("10-20").density).toBe(25));
  it("recommends 16 points for >20% band", () => expect(recommendGrid(">20").density).toBe(16));
  it("warns about zero-hit risk at very low fractions with sparse grids", () => {
    expect(zeroHitWarning(1, 16)).not.toBeNull();
    expect(zeroHitWarning(50, 16)).toBeNull();
  });
});

describe("ASTM Table 3 field-count advisor (planning only)", () => {
  it("matches published values for 20% RA / Vv 5% / grid 49", () => {
    expect(lookupTable3FieldCount(20, 5, 49)).toBe(40);
  });
  it("matches published values for 10% RA / Vv 2% / grid 16", () => {
    expect(lookupTable3FieldCount(10, 2, 16)).toBe(1250);
  });
  it("nearestVvBand rounds to the closest published band", () => {
    expect(nearestVvBand(3)).toBe(2);
    expect(nearestVvBand(7)).toBe(5);
    expect(nearestVvBand(12)).toBe(10);
  });
});

describe("grid generator", () => {
  it("builds standard grid configs with correct rows/cols", () => {
    expect(buildGridConfig(16)).toMatchObject({ rows: 4, cols: 4, density: 16, isCustom: false });
    expect(buildGridConfig(100)).toMatchObject({ rows: 10, cols: 10, density: 100 });
    expect(buildGridConfig(400)).toMatchObject({ rows: 20, cols: 20, density: 400 });
  });
  it("generates the exact number of points for each standard density", () => {
    for (const density of [16, 25, 49, 100, 400] as const) {
      const cfg = buildGridConfig(density);
      const points = generateGridPoints(cfg, 1000, 1000);
      expect(points).toHaveLength(density);
    }
  });
  it("generates equally spaced, non-duplicate points", () => {
    const cfg = buildGridConfig(25);
    const points = generateGridPoints(cfg, 500, 500);
    const xs = [...new Set(points.map((p) => p.x))];
    const ys = [...new Set(points.map((p) => p.y))];
    expect(xs).toHaveLength(5);
    expect(ys).toHaveLength(5);
    const ids = new Set(points.map((p) => p.id));
    expect(ids.size).toBe(points.length);
  });
  it("maps points inside image bounds (margin = half spacing convention)", () => {
    const cfg = buildGridConfig(16);
    const points = generateGridPoints(cfg, 800, 400);
    for (const p of points) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(800);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(400);
    }
  });
  it("supports custom user-defined grids flagged as such", () => {
    const cfg = buildCustomGridConfig(6, 9, "operator justification");
    expect(cfg.isCustom).toBe(true);
    expect(cfg.density).toBe(54);
    const points = generateGridPoints(cfg, 900, 600);
    expect(points).toHaveLength(54);
  });
  it("rescales correctly for different image dimensions (resizing/zoom-safety)", () => {
    const cfg = buildGridConfig(25);
    const small = generateGridPoints(cfg, 100, 100);
    const large = generateGridPoints(cfg, 1000, 1000);
    expect(large[0].x).toBeCloseTo(small[0].x * 10, 6);
    expect(large[0].y).toBeCloseTo(small[0].y * 10, 6);
  });
});
