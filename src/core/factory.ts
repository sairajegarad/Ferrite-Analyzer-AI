import type {
  Analysis,
  Field,
  SampleMetadata,
} from "./types";
import { ASTM_METHOD_VERSION, ALGORITHM_VERSION, SOFTWARE_VERSION } from "./types";
import { newId, nowIso } from "./id";
import { DEFAULT_PREPROCESS } from "../image/preprocess";
import { buildGridConfig } from "../grid/gridGenerator";

export function emptySample(): SampleMetadata {
  return {
    sampleId: "",
    material: "",
    heatId: "",
    specimenId: "",
    operator: "",
    dateTime: new Date().toISOString().slice(0, 16),
    microscope: "",
    camera: "",
    magnification: "",
    objective: "",
    etchant: "",
    preparationCondition: "",
    orientation: "",
    location: "",
    notes: "",
  };
}

export function createAnalysis(sample: SampleMetadata): Analysis {
  const now = nowIso();
  return {
    id: newId("analysis"),
    version: 1,
    parentId: null,
    sample,
    fields: [],
    status: "draft",
    competitionMode: false,
    locked: false,
    createdAt: now,
    updatedAt: now,
    auditLog: [
      {
        id: newId("audit"),
        timestamp: now,
        type: "analysis_created",
        description: `Analysis created for sample "${sample.sampleId}".`,
      },
    ],
    softwareVersion: SOFTWARE_VERSION,
    algorithmVersion: ALGORITHM_VERSION,
    astmMethodVersion: ASTM_METHOD_VERSION,
    planning: {
      estimatedFerritePercent: null,
      desiredPrecisionRA: null,
      recommendedGridDensity: null,
      recommendedFieldCount: null,
    },
  };
}

export function createDraftField(fieldNumber: number): Field {
  return {
    id: newId("field"),
    fieldNumber,
    locationLabel: "",
    createdAt: nowIso(),
    savedAt: null,
    original: {
      dataUrl: "",
      filename: "",
      mimeType: "",
      width: 0,
      height: 0,
      fileSizeBytes: 0,
      acquiredAt: "",
      checksumSha256: "",
    },
    quality: null,
    preprocessing: { ...DEFAULT_PREPROCESS },
    segmentation: {
      method: "otsu-global",
      threshold: 128,
      polarity: "dark",
      autoDetectedPolarity: null,
      polarityConfidence: 0,
    },
    grid: buildGridConfig(100),
    points: [],
    PT: 0,
    Pi: 0,
    PpPercent: 0,
    manualCorrections: 0,
    aiUncertainCount: 0,
    boundaryCount: 0,
    notes: "",
    flags: {
      outlierCandidate: false,
      duplicateCandidate: false,
    },
  };
}
