// ============================================================================
// FERRITE ANALYZER PRO — CORE DOMAIN TYPES
// Scientific data model. Kept independent from UI and image-processing code.
// ============================================================================

export const SOFTWARE_VERSION = "1.0.0";
export const ALGORITHM_VERSION = "algo-2026.1";
export const ASTM_METHOD_VERSION = "ASTM E562-19e1 (workflow reference)";
export const T_TABLE_VERSION = "E562-19e1 Table 1 (field-count t-multipliers)";

export type PhasePolarity = "dark" | "bright";

export type PointClass = "ferrite" | "matrix" | "boundary" | "unclassified";

export type ClassificationSource = "ai" | "manual" | "unclassified";

export interface SampleMetadata {
  sampleId: string;
  material: string;
  heatId: string;
  specimenId: string;
  operator: string;
  dateTime: string; // ISO
  microscope: string;
  camera: string;
  magnification: string;
  objective: string;
  etchant: string;
  preparationCondition: string;
  orientation: string;
  location: string;
  notes: string;
}

export interface OriginalImageRecord {
  dataUrl: string; // immutable original, base64
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  acquiredAt: string;
  checksumSha256: string;
}

export interface QualityMetric {
  key: string;
  label: string;
  status: "GOOD" | "WARNING" | "FAIL";
  value: number;
  unit?: string;
  message: string;
}

export interface QualityReport {
  score: number; // 0-100 software quality gate score
  overall: "GOOD" | "WARNING" | "FAIL";
  metrics: QualityMetric[];
  overrideUsed: boolean;
  overrideReason?: string;
  computedAt: string;
}

export interface PreprocessSettings {
  grayscale: boolean;
  denoise: boolean;
  illuminationCorrection: boolean;
  contrastNormalization: boolean;
  clahe: boolean;
  sharpen: boolean;
}

export type SegmentationMethod =
  | "otsu-global"
  | "adaptive-local"
  | "clahe-threshold"
  | "illumination-corrected";

export interface SegmentationSettings {
  method: SegmentationMethod;
  threshold: number; // 0-255, effective global threshold used
  polarity: PhasePolarity;
  autoDetectedPolarity: PhasePolarity | null;
  polarityConfidence: number; // 0-1
}

export type GridDensity = 16 | 25 | 49 | 100 | 400;

export interface GridConfig {
  density: GridDensity | number;
  rows: number;
  cols: number;
  isCustom: boolean;
  overrideReason?: string;
}

export interface GridPoint {
  id: string;
  index: number;
  row: number;
  col: number;
  x: number; // pixel coords in working image space
  y: number;
}

export interface PointCorrectionEvent {
  timestamp: string;
  oldClassification: PointClass;
  newClassification: PointClass;
  actor: "ai" | "operator";
  reason?: string;
}

export interface PointClassificationRecord {
  pointId: string;
  x: number;
  y: number;
  classification: PointClass;
  source: ClassificationSource;
  aiSuggestion: PointClass | null;
  aiConfidence: number | null; // 0-1
  pixelIntensity: number | null;
  localHomogeneity: number | null; // 0-1, 1 = fully homogeneous neighborhood
  history: PointCorrectionEvent[];
}

export interface FieldQualityFlags {
  outlierCandidate: boolean;
  outlierReason?: string;
  duplicateCandidate: boolean;
  duplicateReason?: string;
}

export interface Field {
  id: string;
  fieldNumber: number;
  locationLabel: string;
  createdAt: string;
  savedAt: string | null;
  original: OriginalImageRecord;
  quality: QualityReport | null;
  preprocessing: PreprocessSettings;
  segmentation: SegmentationSettings;
  grid: GridConfig;
  points: PointClassificationRecord[];
  PT: number;
  Pi: number;
  PpPercent: number;
  manualCorrections: number;
  aiUncertainCount: number;
  boundaryCount: number;
  notes: string;
  flags: FieldQualityFlags;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
}

export interface ValidationEntry {
  id: string;
  analysisId: string;
  label: string;
  referenceValue: number | null;
  measuredValue: number;
  blind: boolean;
  revealedAt: string | null;
  createdAt: string;
}

export type AnalysisStatus = "draft" | "in-progress" | "complete" | "locked";

export interface Analysis {
  id: string;
  version: number;
  parentId: string | null;
  sample: SampleMetadata;
  fields: Field[];
  status: AnalysisStatus;
  competitionMode: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  auditLog: AuditEvent[];
  softwareVersion: string;
  algorithmVersion: string;
  astmMethodVersion: string;
  planning: {
    estimatedFerritePercent: number | null;
    desiredPrecisionRA: 10 | 20 | 33 | null;
    recommendedGridDensity: GridDensity | null;
    recommendedFieldCount: number | null;
  };
}

export interface ASTMFieldStat {
  fieldId: string;
  fieldNumber: number;
  PT: number;
  Pi: number;
  PpPercent: number;
}

export interface ASTMStatistics {
  n: number;
  fieldStats: ASTMFieldStat[];
  mean: number;
  sampleStdDev: number;
  tMultiplier: number;
  tSource: "exact" | "interpolated" | "z-approximation" | "insufficient";
  degreesOfFreedom: number;
  ci95: number;
  vvLow: number;
  vvHigh: number;
  relativeAccuracyPercent: number;
  formalCIReady: boolean; // n >= 30
  totalPT: number;
  totalPi: number;
}
