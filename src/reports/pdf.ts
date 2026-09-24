// ============================================================================
// PDF REPORT GENERATOR — transparent, formula-first engineering report.
// ============================================================================
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Analysis } from "../core/types";
import { computeASTMStatistics } from "../core/astm/calculations";
import { SOFTWARE_VERSION, ALGORITHM_VERSION, ASTM_METHOD_VERSION, T_TABLE_VERSION } from "../core/types";

const ACCENT: [number, number, number] = [15, 99, 120];
const MUTED: [number, number, number] = [110, 120, 130];

function header(doc: jsPDF, title: string) {
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, 210, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("FERRITE ANALYZER PRO", 12, 11);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(title, 198, 11, { align: "right" });
  doc.setTextColor(20, 20, 20);
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT);
  doc.text(text, 12, y);
  doc.setDrawColor(...ACCENT);
  doc.line(12, y + 1.5, 198, y + 1.5);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

export function generatePdfReport(analysis: Analysis): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const stats = computeASTMStatistics(analysis.fields);

  // ---- COVER ----
  header(doc, "ASTM E562 ANALYSIS REPORT");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Ferrite Volume Fraction Report", 12, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Quantitative Metallography — ASTM E562-based systematic manual point-count workflow", 12, 48);
  doc.setTextColor(20, 20, 20);

  autoTable(doc, {
    startY: 56,
    theme: "grid",
    styles: { fontSize: 9 },
    head: [["Sample Metadata", ""]],
    headStyles: { fillColor: ACCENT },
    body: [
      ["Sample ID", analysis.sample.sampleId],
      ["Material", analysis.sample.material || "-"],
      ["Heat / Batch ID", analysis.sample.heatId || "-"],
      ["Specimen ID", analysis.sample.specimenId || "-"],
      ["Operator", analysis.sample.operator || "-"],
      ["Date / Time", analysis.sample.dateTime || "-"],
      ["Microscope", analysis.sample.microscope || "-"],
      ["Camera", analysis.sample.camera || "-"],
      ["Magnification", analysis.sample.magnification || "-"],
      ["Objective", analysis.sample.objective || "-"],
      ["Etchant", analysis.sample.etchant || "-"],
      ["Preparation Condition", analysis.sample.preparationCondition || "-"],
      ["Section Orientation", analysis.sample.orientation || "-"],
      ["Location on Specimen", analysis.sample.location || "-"],
      ["Notes", analysis.sample.notes || "-"],
    ],
  });

  if (stats) {
    let y = (doc as any).lastAutoTable.finalY + 10;
    y = sectionTitle(doc, "FINAL RESULT", y);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ACCENT);
    doc.text(`Vv = ${stats.mean.toFixed(2)} ± ${stats.ci95.toFixed(2)} %`, 12, y + 10);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`95% confidence interval  |  Relative Accuracy: ${stats.relativeAccuracyPercent.toFixed(2)}%`, 12, y + 18);
    doc.text(
      stats.formalCIReady
        ? "ASTM reporting status: READY FOR FORMAL REPORTING (n >= 30 fields)"
        : `ASTM reporting status: 30-field recommendation NOT yet satisfied (n = ${stats.n}). CI shown is a statistical estimate.`,
      12,
      y + 25,
    );
  }

  // ---- SAMPLE / QUALITY / GRID / FIELD DETAILS ----
  doc.addPage();
  header(doc, "IMAGE QUALITY & PROCESSING");
  let y = sectionTitle(doc, "IMAGE QUALITY ASSESSMENT (SOFTWARE QUALITY GATE)", 26);

  const qualityRows = analysis.fields
    .filter((f) => f.savedAt)
    .flatMap((f) =>
      (f.quality?.metrics ?? []).map((m) => [`Field ${f.fieldNumber}`, m.label, m.status, String(m.value), m.message]),
    );
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: ACCENT },
    head: [["Field", "Metric", "Status", "Value", "Notes"]],
    body: qualityRows.length ? qualityRows : [["-", "-", "-", "-", "No fields saved yet"]],
  });

  doc.addPage();
  header(doc, "FIELD-BY-FIELD MEASUREMENTS");
  y = sectionTitle(doc, "FIELD MEASUREMENTS (ASTM E562 POINT COUNT)", 26);
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: ACCENT },
    head: [["Field", "Grid", "PT", "Pi", "Pp(i) %", "Manual Corr.", "Quality", "Verified"]],
    body: analysis.fields
      .filter((f) => f.savedAt)
      .map((f) => [
        f.fieldNumber,
        `${f.grid.isCustom ? "CUSTOM " : ""}${f.grid.rows}x${f.grid.cols} (${f.grid.density})`,
        f.PT,
        f.Pi.toFixed(1),
        f.PpPercent.toFixed(2),
        f.manualCorrections,
        f.quality?.overall ?? "-",
        f.manualCorrections > 0 ? "MANUALLY VERIFIED / CORRECTED" : "AI-assisted, operator confirmed",
      ]),
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 250) {
    doc.addPage();
    header(doc, "STATISTICAL CALCULATION");
    y = 26;
  }
  y = sectionTitle(doc, "ASTM E562 STATISTICAL CALCULATION", y);
  doc.setFontSize(9);
  doc.setFont("courier", "normal");
  const lines = stats
    ? [
        "Pp(i) = (Pi / PT) x 100",
        "P_bar_p = (1/n) x Sum[Pp(i)]",
        "s = sqrt( Sum[(Pp(i) - P_bar_p)^2] / (n - 1) )",
        "95% CI = t x s / sqrt(n)",
        "Vv = P_bar_p +/- 95% CI",
        "%RA = (95% CI / P_bar_p) x 100",
        "",
        `n (fields) = ${stats.n}`,
        `Mean P_bar_p = ${stats.mean.toFixed(6)} %`,
        `Sample StdDev s = ${stats.sampleStdDev.toFixed(6)}`,
        `t multiplier = ${stats.tMultiplier} (source: ${stats.tSource}, df = ${stats.degreesOfFreedom})`,
        `95% CI = ${stats.ci95.toFixed(6)} %`,
        `Vv = ${stats.mean.toFixed(4)} % , range [${stats.vvLow.toFixed(4)}, ${stats.vvHigh.toFixed(4)}] %`,
        `%RA = ${stats.relativeAccuracyPercent.toFixed(4)} %`,
      ]
    : ["No completed field measurements yet."];
  lines.forEach((l, i) => doc.text(l, 12, y + i * 5));
  doc.setFont("helvetica", "normal");

  // ---- WARNINGS / LIMITATIONS ----
  doc.addPage();
  header(doc, "WARNINGS, VALIDATION & VERSIONING");
  y = sectionTitle(doc, "WARNINGS", 26);
  doc.setFontSize(9);
  const warnings: string[] = [];
  if (stats && !stats.formalCIReady) {
    warnings.push(
      `Only ${stats.n} field(s) measured. ASTM E562 Annex A1.1 recommends a minimum of 30 fields for a formal 95% CI.`,
    );
  }
  if (!stats) warnings.push("No fields have been saved for this analysis.");
  analysis.fields
    .filter((f) => f.flags.outlierCandidate)
    .forEach((f) => warnings.push(`Field ${f.fieldNumber}: ${f.flags.outlierReason ?? "flagged for review"}`));
  if (warnings.length === 0) warnings.push("No outstanding warnings.");
  warnings.forEach((w, i) => doc.text(`- ${w}`, 12, y + i * 6, { maxWidth: 186 }));

  y += warnings.length * 6 + 10;
  y = sectionTitle(doc, "SCIENTIFIC LIMITATION STATEMENT", y);
  doc.setFontSize(8.5);
  const limitation =
    "This software assists ASTM E562 point counting using digital image processing. Automatic image segmentation is not itself the ASTM E562 measurement. Results depend on specimen preparation, image quality, magnification, grid selection, representative field selection, phase identification, and operator verification. The software does not claim certification unless separately validated/certified. This application implements the ASTM E562 systematic manual point-count calculation workflow; it is not itself an ASTM-certified product.";
  const wrapped = doc.splitTextToSize(limitation, 186);
  doc.text(wrapped, 12, y);
  y += wrapped.length * 4.5 + 8;

  y = sectionTitle(doc, "VERSIONING & TRACEABILITY", y);
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: ACCENT },
    head: [["Field", "Software Version", "Algorithm Version", "t-table Version", "Segmentation Method", "Image Checksum (SHA-256)"]],
    body: analysis.fields
      .filter((f) => f.savedAt)
      .map((f) => [
        f.fieldNumber,
        SOFTWARE_VERSION,
        ALGORITHM_VERSION,
        T_TABLE_VERSION,
        f.segmentation.method,
        f.original.checksumSha256.slice(0, 24) + "...",
      ]),
  });

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated ${new Date().toISOString()} | ${ASTM_METHOD_VERSION} | Software v${SOFTWARE_VERSION} | Algorithm ${ALGORITHM_VERSION}`,
    12,
    290,
  );

  return doc;
}
