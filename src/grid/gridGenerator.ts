// ============================================================================
// ASTM E562 SYSTEMATIC POINT-GRID GENERATOR
// Points are mathematically generated as an equally-spaced systematic array.
// No arbitrary cosmetic margins — the margin equals half the point spacing,
// which is the systematic-grid convention (each point represents an equal
// area of the field).
// ============================================================================
import type { GridConfig, GridDensity, GridPoint } from "../core/types";
import { GRID_DENSITY_LAYOUT, STANDARD_GRID_DENSITIES } from "../core/astm/gridAdvisor";
import { newId } from "../core/id";

export function buildGridConfig(density: GridDensity, overrideReason?: string): GridConfig {
  const layout = GRID_DENSITY_LAYOUT[density];
  return {
    density,
    rows: layout.rows,
    cols: layout.cols,
    isCustom: false,
    overrideReason,
  };
}

export function buildCustomGridConfig(rows: number, cols: number, reason: string): GridConfig {
  return {
    density: rows * cols,
    rows,
    cols,
    isCustom: true,
    overrideReason: reason,
  };
}

export function isStandardDensity(n: number): n is GridDensity {
  return (STANDARD_GRID_DENSITIES as number[]).includes(n);
}

export function generateGridPoints(config: GridConfig, width: number, height: number): GridPoint[] {
  const { rows, cols } = config;
  const spacingX = width / cols;
  const spacingY = height / rows;
  const points: GridPoint[] = [];
  let index = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col + 0.5) * spacingX;
      const y = (row + 0.5) * spacingY;
      points.push({
        id: newId("pt"),
        index: index++,
        row,
        col,
        x,
        y,
      });
    }
  }
  return points;
}
