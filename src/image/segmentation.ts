// ============================================================================
// SEGMENTATION ASSISTANCE ENGINE
// IMPORTANT: this module NEVER produces the ASTM result. It only produces
// candidate phase masks and per-point suggestions to accelerate operator
// verification. The verified point-count dataset is the ASTM measurement.
// ============================================================================
import type { PhasePolarity, SegmentationMethod } from "../core/types";

export interface OtsuResult {
  threshold: number;
  betweenClassVariance: number;
}

function histogramOf(gray: Float32Array): number[] {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) {
    hist[Math.max(0, Math.min(255, Math.round(gray[i])))]++;
  }
  return hist;
}

/** Classic global Otsu threshold selection. */
export function otsuThreshold(gray: Float32Array): OtsuResult {
  const hist = histogramOf(gray);
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return { threshold, betweenClassVariance: maxVar };
}

/** Adaptive local mean threshold (per-tile Otsu, tiled). */
export function adaptiveThresholdMap(
  gray: Float32Array,
  w: number,
  h: number,
  tiles = 6,
): Float32Array {
  const tileW = Math.ceil(w / tiles);
  const tileH = Math.ceil(h / tiles);
  const thresholdMap = new Float32Array(w * h);
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const x1 = Math.min(w, x0 + tileW);
      const y1 = Math.min(h, y0 + tileH);
      const tileData: number[] = [];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) tileData.push(gray[y * w + x]);
      const { threshold } = otsuThreshold(Float32Array.from(tileData));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) thresholdMap[y * w + x] = threshold;
    }
  }
  return thresholdMap;
}

export interface SegmentationCandidate {
  method: SegmentationMethod;
  globalThreshold: number;
  separability: number; // 0-1, higher = more confident split
  mask: Uint8Array; // 1 = "bright class", 0 = "dark class" (before polarity applied)
}

export function buildMask(gray: Float32Array, thresholdMap: Float32Array | number): Uint8Array {
  const mask = new Uint8Array(gray.length);
  const isScalar = typeof thresholdMap === "number";
  for (let i = 0; i < gray.length; i++) {
    const t = isScalar ? (thresholdMap as number) : (thresholdMap as Float32Array)[i];
    mask[i] = gray[i] >= t ? 1 : 0;
  }
  return mask;
}

/** Generates multiple candidate segmentations and scores them for comparison. */
export function generateSegmentationCandidates(
  gray: Float32Array,
  w: number,
  h: number,
): SegmentationCandidate[] {
  const candidates: SegmentationCandidate[] = [];

  const otsu = otsuThreshold(gray);
  const otsuMask = buildMask(gray, otsu.threshold);
  candidates.push({
    method: "otsu-global",
    globalThreshold: otsu.threshold,
    separability: normalizedSeparability(gray, otsuMask),
    mask: otsuMask,
  });

  const adaptiveMap = adaptiveThresholdMap(gray, w, h);
  const adaptiveMask = buildMask(gray, adaptiveMap);
  candidates.push({
    method: "adaptive-local",
    globalThreshold: otsu.threshold,
    separability: normalizedSeparability(gray, adaptiveMask),
    mask: adaptiveMask,
  });

  return candidates;
}

function normalizedSeparability(gray: Float32Array, mask: Uint8Array): number {
  let sum0 = 0;
  let sum1 = 0;
  let n0 = 0;
  let n1 = 0;
  for (let i = 0; i < gray.length; i++) {
    if (mask[i] === 1) {
      sum1 += gray[i];
      n1++;
    } else {
      sum0 += gray[i];
      n0++;
    }
  }
  if (n0 === 0 || n1 === 0) return 0;
  const m0 = sum0 / n0;
  const m1 = sum1 / n1;
  let var0 = 0;
  let var1 = 0;
  for (let i = 0; i < gray.length; i++) {
    if (mask[i] === 1) var1 += (gray[i] - m1) ** 2;
    else var0 += (gray[i] - m0) ** 2;
  }
  var0 /= n0;
  var1 /= n1;
  const between = n0 * n1 * (m0 - m1) ** 2;
  const within = n0 * var0 + n1 * var1;
  if (within === 0) return 1;
  return Math.max(0, Math.min(1, between / (between + within)));
}

/** Suggests which polarity (dark/bright) is more likely to represent the minority constituent. */
export function suggestPolarity(mask: Uint8Array): { polarity: PhasePolarity; confidence: number } {
  const brightCount = mask.reduce((a, b) => a + b, 0);
  const fraction = brightCount / mask.length;
  // Ferrite is typically the more compact, often minority phase in many etches.
  // Heuristic only: whichever class is the minority is suggested, confidence scales with imbalance.
  const minorityIsBright = fraction < 0.5;
  const imbalance = Math.abs(fraction - 0.5) * 2; // 0 (50/50) -> 1 (fully separated)
  return {
    polarity: minorityIsBright ? "bright" : "dark",
    confidence: Math.max(0.5, Math.min(0.97, 0.5 + imbalance * 0.5)),
  };
}

export interface PointSuggestion {
  classification: "ferrite" | "matrix";
  confidence: number;
  pixelIntensity: number;
  localHomogeneity: number;
}

/**
 * Suggests a classification for a single grid point.
 *
 * Per ASTM-alignment rule: the suggested class is based on the pixel value
 * AT the exact test-point location (never inferred purely from a mixed
 * neighborhood). The neighborhood is only used to estimate CONFIDENCE
 * (homogeneity) so ambiguous points are flagged for human review — the
 * operator, not the algorithm, makes the final boundary (0.5) determination.
 */
export function suggestPointClassification(
  gray: Float32Array,
  w: number,
  h: number,
  x: number,
  y: number,
  threshold: number,
  polarity: PhasePolarity,
  windowRadius = 4,
): PointSuggestion {
  const px = Math.max(0, Math.min(w - 1, Math.round(x)));
  const py = Math.max(0, Math.min(h - 1, Math.round(y)));
  const intensity = gray[py * w + px];
  const isBrightClass = intensity >= threshold;
  const isFerrite = polarity === "bright" ? isBrightClass : !isBrightClass;

  let sameClassCount = 0;
  let total = 0;
  for (let dy = -windowRadius; dy <= windowRadius; dy++) {
    for (let dx = -windowRadius; dx <= windowRadius; dx++) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const v = gray[ny * w + nx];
      const cls = v >= threshold;
      if (cls === isBrightClass) sameClassCount++;
      total++;
    }
  }
  const homogeneity = total > 0 ? sameClassCount / total : 1;
  // Confidence blends distance-from-threshold and neighborhood homogeneity.
  const distanceFromThreshold = Math.min(1, Math.abs(intensity - threshold) / 60);
  const confidence = Math.max(0.05, Math.min(0.99, homogeneity * 0.65 + distanceFromThreshold * 0.35));

  return {
    classification: isFerrite ? "ferrite" : "matrix",
    confidence,
    pixelIntensity: intensity,
    localHomogeneity: homogeneity,
  };
}
