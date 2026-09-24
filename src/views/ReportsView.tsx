import { useRef } from "react";
import { useApp } from "../state/AppState";
import { Button, Card, EmptyState, Label } from "../ui/primitives";
import { generatePdfReport } from "../reports/pdf";
import { downloadTextFile, exportFieldsCsv, serializeProject, deserializeProject, PROJECT_FILE_EXTENSION, ProjectValidationError } from "../project/serialization";
import { computeASTMStatistics } from "../core/astm/calculations";

export function ReportsView() {
  const { state, dispatch, addAudit } = useApp();
  const analysis = state.currentAnalysis;
  const fileInput = useRef<HTMLInputElement>(null);

  if (!analysis) {
    return (
      <EmptyState
        title="No active analysis"
        description="Create a new analysis to generate reports and exports."
        action={<Button onClick={() => dispatch({ type: "SET_VIEW", view: "new-analysis" })}>New Analysis</Button>}
      />
    );
  }

  const stats = computeASTMStatistics(analysis.fields);

  function exportPdf() {
    const doc = generatePdfReport(analysis!);
    doc.save(`${analysis!.sample.sampleId || "analysis"}_ASTM-E562-report.pdf`);
    addAudit("report_generated", "PDF report generated.");
  }

  function exportCsv() {
    const csv = exportFieldsCsv(analysis!);
    downloadTextFile(`${analysis!.sample.sampleId || "analysis"}_fields.csv`, csv, "text/csv");
    addAudit("project_exported", "CSV export generated.");
  }

  function exportProject() {
    const json = serializeProject(analysis!);
    downloadTextFile(`${analysis!.sample.sampleId || "analysis"}${PROJECT_FILE_EXTENSION}`, json);
    addAudit("project_exported", "Project file (.ferriteproject) exported.");
  }

  function exportJsonDataset() {
    downloadTextFile(`${analysis!.sample.sampleId || "analysis"}_dataset.json`, JSON.stringify({ sample: analysis!.sample, fields: analysis!.fields, statistics: stats }, null, 2));
  }

  async function importProject(file: File) {
    try {
      const text = await file.text();
      const imported = deserializeProject(text);
      dispatch({ type: "LOAD_ANALYSIS", analysis: imported });
      addAudit("project_exported", `Project imported from ${file.name}.`);
    } catch (e) {
      alert(e instanceof ProjectValidationError ? e.message : "Failed to import project file.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-xl font-bold text-app">Reports & Export</h1>
        <p className="text-sm text-app-secondary">Every export is fully traceable: sample ID, checksums, versions, and audit history are always included.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <Label>Primary Export</Label>
          <div className="mt-3 space-y-3">
            <Button className="w-full" onClick={exportPdf} disabled={!stats}>
              Download PDF Report
            </Button>
            <p className="text-xs text-app-muted">
              Includes sample details, image quality, grid selection, field-by-field data, statistical derivation,
              warnings, versioning and checksums.
            </p>
          </div>
        </Card>
        <Card>
          <Label>Data Exports</Label>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={exportCsv} disabled={!stats}>Export CSV</Button>
            <Button variant="secondary" onClick={exportProject}>Save Project</Button>
            <Button variant="secondary" onClick={exportJsonDataset} disabled={!stats}>Export JSON Dataset</Button>
            <Button
              variant="secondary"
              onClick={() => {
                const a = document.createElement("a");
                a.href = analysis.fields.find((f) => f.savedAt)?.original.dataUrl ?? "";
                a.download = `${analysis.sample.sampleId}_field1_original.png`;
                if (a.href) a.click();
              }}
              disabled={!analysis.fields.some((f) => f.savedAt)}
            >
              Export Images
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <Label>Import Project</Label>
        <p className="mt-1 text-xs text-app-muted">Reopen a previously saved .ferriteproject file. The schema is validated before loading.</p>
        <div className="mt-3">
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            Choose Project File
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".ferriteproject,application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importProject(e.target.files[0])}
          />
        </div>
      </Card>

      <Card>
        <Label>Audit Trail</Label>
        <div className="mt-3 max-h-80 overflow-y-auto rounded-[10px] border border-app">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-elevated text-left uppercase tracking-wider text-app-muted">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {[...analysis.auditLog].reverse().map((e) => (
                <tr key={e.id} className="border-t border-app/60">
                  <td className="whitespace-nowrap px-3 py-2 font-mono-num text-app-muted">{new Date(e.timestamp).toLocaleTimeString()}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-app">{e.type}</td>
                  <td className="px-3 py-2 text-app-secondary">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
