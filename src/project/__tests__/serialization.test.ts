import { describe, it, expect } from "vitest";
import { serializeProject, deserializeProject, ProjectValidationError, exportFieldsCsv } from "../serialization";
import { createAnalysis, createDraftField, emptySample } from "../../core/factory";

function buildSampleAnalysis() {
  const sample = { ...emptySample(), sampleId: "TEST-001", material: "Duplex SS" };
  const analysis = createAnalysis(sample);
  const field = createDraftField(1);
  field.savedAt = new Date().toISOString();
  field.PT = 100;
  field.Pi = 18.5;
  field.PpPercent = 18.5;
  analysis.fields.push(field);
  return analysis;
}

describe("project file round trip", () => {
  it("serializes and deserializes without losing data", () => {
    const analysis = buildSampleAnalysis();
    const json = serializeProject(analysis);
    const restored = deserializeProject(json);
    expect(restored.sample.sampleId).toBe("TEST-001");
    expect(restored.fields).toHaveLength(1);
    expect(restored.fields[0].PpPercent).toBe(18.5);
    expect(restored.id).toBe(analysis.id);
  });

  it("rejects invalid JSON", () => {
    expect(() => deserializeProject("{not json")).toThrow(ProjectValidationError);
  });

  it("rejects a file missing the expected schema", () => {
    expect(() => deserializeProject(JSON.stringify({ foo: "bar" }))).toThrow(ProjectValidationError);
  });

  it("rejects a project missing a sample ID", () => {
    const analysis = buildSampleAnalysis();
    analysis.sample.sampleId = "";
    const json = serializeProject(analysis);
    expect(() => deserializeProject(json)).toThrow(ProjectValidationError);
  });
});

describe("CSV export", () => {
  it("includes sample id and summary statistics", () => {
    const analysis = buildSampleAnalysis();
    const csv = exportFieldsCsv(analysis);
    expect(csv).toContain("TEST-001");
    expect(csv).toContain("SUMMARY");
    expect(csv).toContain("Mean Pp(i) %");
  });
});
