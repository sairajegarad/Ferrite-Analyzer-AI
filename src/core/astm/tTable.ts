// ============================================================================
// ASTM E562 FIELD-COUNT t-MULTIPLIER TABLE
// Exact values as published for the 95% confidence level, indexed by number
// of fields counted (n), not by a generic Student-t degrees-of-freedom table.
// ============================================================================

export interface TLookupResult {
  t: number;
  source: "exact" | "interpolated" | "z-approximation" | "insufficient";
  degreesOfFreedom: number;
  fieldCount: number;
  note: string;
}

// n (field count) -> t multiplier, 95% confidence
const T_TABLE: Array<[number, number]> = [
  [5, 2.776],
  [6, 2.571],
  [7, 2.447],
  [8, 2.365],
  [9, 2.306],
  [10, 2.262],
  [11, 2.228],
  [12, 2.201],
  [13, 2.179],
  [14, 2.16],
  [15, 2.145],
  [16, 2.131],
  [17, 2.12],
  [18, 2.11],
  [19, 2.101],
  [20, 2.093],
  [21, 2.086],
  [22, 2.08],
  [23, 2.074],
  [24, 2.069],
  [25, 2.064],
  [26, 2.06],
  [27, 2.056],
  [28, 2.052],
  [29, 2.048],
  [30, 2.045],
  [40, 2.02],
  [60, 2.0],
];

const Z_APPROXIMATION = 1.96;

/**
 * Looks up the ASTM E562 t-multiplier for a given number of measured fields.
 *
 * Rules:
 *  - n < 5: statistically unreliable per the standard's minimum practice;
 *    the table's smallest entry (n=5) is used only as a rough guide and the
 *    result is flagged "insufficient".
 *  - n present exactly in the table: exact lookup.
 *  - n between two published table rows (e.g. 31-39, 41-59): linearly
 *    interpolated. This is NOT an explicit ASTM table entry and is labeled
 *    "interpolated" so the operator is never silently given an invented,
 *    unlabeled value.
 *  - n > 60: the standard's table converges to the normal-distribution
 *    z-value (1.960) for infinite degrees of freedom; used and labeled
 *    "z-approximation".
 */
export function lookupTMultiplier(n: number): TLookupResult {
  const df = Math.max(n - 1, 0);

  if (!Number.isFinite(n) || n <= 1) {
    return {
      t: NaN,
      source: "insufficient",
      degreesOfFreedom: df,
      fieldCount: n,
      note: "At least 2 fields are required to compute a standard deviation and confidence interval.",
    };
  }

  if (n < 5) {
    return {
      t: T_TABLE[0][1],
      source: "insufficient",
      degreesOfFreedom: df,
      fieldCount: n,
      note: `Field count (${n}) is below the ASTM E562 table minimum (5). The n=5 t-value (${T_TABLE[0][1]}) is shown for reference only — this estimate should not be treated as a valid 95% CI.`,
    };
  }

  const exact = T_TABLE.find(([fc]) => fc === n);
  if (exact) {
    return {
      t: exact[1],
      source: "exact",
      degreesOfFreedom: df,
      fieldCount: n,
      note: `Exact ASTM E562 table value for n=${n} fields.`,
    };
  }

  if (n > 60) {
    return {
      t: Z_APPROXIMATION,
      source: "z-approximation",
      degreesOfFreedom: df,
      fieldCount: n,
      note: `n=${n} exceeds the largest tabulated field count (60). The standard's table converges to the normal-distribution value (z = 1.960) for large n.`,
    };
  }

  // Find bracketing rows and interpolate linearly.
  let lower = T_TABLE[0];
  let upper = T_TABLE[T_TABLE.length - 1];
  for (let i = 0; i < T_TABLE.length - 1; i++) {
    if (T_TABLE[i][0] <= n && T_TABLE[i + 1][0] >= n) {
      lower = T_TABLE[i];
      upper = T_TABLE[i + 1];
      break;
    }
  }
  const [n1, t1] = lower;
  const [n2, t2] = upper;
  const t = n2 === n1 ? t1 : t1 + ((t2 - t1) * (n - n1)) / (n2 - n1);

  return {
    t: Math.round(t * 1000) / 1000,
    source: "interpolated",
    degreesOfFreedom: df,
    fieldCount: n,
    note: `n=${n} is not an explicit ASTM E562 table entry. Linearly interpolated between n=${n1} (t=${t1}) and n=${n2} (t=${t2}). This is a software estimate, not a published table value.`,
  };
}

export const T_TABLE_RAW = T_TABLE;
