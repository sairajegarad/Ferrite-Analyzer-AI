// ============================================================================
// PROJECT FILE SERIALIZATION — .ferriteproject export/import + CSV export
// ============================================================================
import type { Analysis } from "../core/types";
import { computeASTMStatistics } from "../core/astm/calculations";
import { SOFTWARE_VERSION, ALGORITHM_VERSION, ASTM_METHOD_VERSION } from "../core/types";
import { T_TABLE_VERSION } from "../core/types";

export const PROJECT_FILE_EXTENSION = ".ferriteproject";

interface ProjectFileV1 {
  schema: "ferrite-analyzer-pro/v1";
  exportedAt: string;
  softwareVersion: string;
  algorithmVersion: string;
  astmMethodVersion: string;
  tTableVersion: string;
  analysis: Analysis;
}

export function serializeProject(analysis: Analysis): string {
  const file: ProjectFileV1 = {
    schema: "ferrite-analyzer-pro/v1",
    exportedAt: new Date().toISOString(),
    softwareVersion: SOFTWARE_VERSION,
    algorithmVersion: ALGORITHM_VERSION,
    astmMethodVersion: ASTM_METHOD_VERSION,
    tTableVersion: T_TABLE_VERSION,
    analysis,
  };
  return JSON.stringify(file, null, 2);
}

export class ProjectValidationError extends Error {}

export function deserializeProject(json: string): Analysis {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ProjectValidationError("The file is not valid JSON and cannot be opened as a project.");
  }
  const file = parsed as Partial<ProjectFileV1>;
  if (!file || file.schema !== "ferrite-analyzer-pro/v1") {
    throw new ProjectValidationError(
      "This file does not match the expected Ferrite Analyzer Pro project schema (ferrite-analyzer-pro/v1).",
    );
  }
  const analysis = file.analysis as Analysis | undefined;
  if (!analysis || !analysis.sample || !analysis.sample.sampleId || !Array.isArray(analysis.fields)) {
    throw new ProjectValidationError("The project file is missing required sample or field data.");
  }
  return analysis;
}

export function downloadTextFile(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportFieldsCsv(analysis: Analysis): string {
  const headers = [
    "Sample ID",
    "Field",
    "Location",
    "PT",
    "Pi",
    "Boundary Points",
    "Pp(i) %",
    "Grid Type",
    "Grid Size",
    "Manual Corrections",
    "Quality Score",
    "Segmentation Method",
    "Threshold",
    "Operator",
    "Timestamp",
  ];
  const rows = analysis.fields
    .filter((f) => f.savedAt)
    .map((f) =>
      [
        analysis.sample.sampleId,
        f.fieldNumber,
        f.locationLabel,
        f.PT,
        f.Pi,
        f.boundaryCount,
        f.PpPercent.toFixed(6),
        f.grid.isCustom ? "CUSTOM" : "STANDARD",
        f.grid.density,
        f.manualCorrections,
        f.quality?.score ?? "",
        f.segmentation.method,
        f.segmentation.threshold,
        analysis.sample.operator,
        f.savedAt,
      ]
        .map(csvEscape)
        .join(","),
    );

  const stats = computeASTMStatistics(analysis.fields);
  const summaryLines = stats
    ? [
        "",
        "SUMMARY",
        `n,${stats.n}`,
        `Mean Pp(i) %,${stats.mean.toFixed(6)}`,
        `Sample StdDev s,${stats.sampleStdDev.toFixed(6)}`,
        `t multiplier,${stats.tMultiplier}`,
        `t source,${stats.tSource}`,
        `95% CI,${stats.ci95.toFixed(6)}`,
        `Vv Low,${stats.vvLow.toFixed(6)}`,
        `Vv High,${stats.vvHigh.toFixed(6)}`,
        `%RA,${stats.relativeAccuracyPercent.toFixed(6)}`,
        `Formal 95% CI (n>=30),${stats.formalCIReady ? "READY" : "NOT READY"}`,
      ]
    : [];

  return [headers.join(","), ...rows, ...summaryLines].join("\n");
}
