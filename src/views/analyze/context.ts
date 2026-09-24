import { createContext, useContext } from "react";
import type { Field, GridDensity } from "../../core/types";
import type { PipelineStage } from "../../image/preprocess";
import type { SegmentationCandidate } from "../../image/segmentation";

export interface PipelineData {
  width: number;
  height: number;
  workingCanvasDataUrl: string | null;
  grayOriginal: Float32Array | null;
  stages: PipelineStage[];
  processedGray: Float32Array | null;
  candidates: SegmentationCandidate[];
  chosenCandidateIndex: number;
  estimatedFerriteBand: "<2" | "2-5" | "5-10" | "10-20" | ">20" | null;
  desiredPrecision: 10 | 20 | 33 | null;
  overrideGridDensity: GridDensity | null;
}

export const emptyPipeline: PipelineData = {
  width: 0,
  height: 0,
  workingCanvasDataUrl: null,
  grayOriginal: null,
  stages: [],
  processedGray: null,
  candidates: [],
  chosenCandidateIndex: 0,
  estimatedFerriteBand: null,
  desiredPrecision: 20,
  overrideGridDensity: null,
};

export interface AnalyzeCtxValue {
  draft: Field;
  setDraft: (patch: Partial<Field> | ((f: Field) => Field)) => void;
  pipeline: PipelineData;
  setPipeline: (patch: Partial<PipelineData> | ((p: PipelineData) => PipelineData)) => void;
  step: number;
  goStep: (n: number) => void;
  qualityOverride: boolean;
  setQualityOverride: (v: boolean, reason?: string) => void;
}

export const AnalyzeContext = createContext<AnalyzeCtxValue | null>(null);

export function useAnalyze(): AnalyzeCtxValue {
  const ctx = useContext(AnalyzeContext);
  if (!ctx) throw new Error("useAnalyze must be used within AnalyzeContext.Provider");
  return ctx;
}
