// ============================================================================
// PREPROCESSING PIPELINE — assistance layer only. Never modifies the original.
// Every step is optional, logged, and produces a new working buffer.
// ============================================================================
import type { PreprocessSettings } from "../core/types";

export function grayscale(gray: Float32Array) {
  return gray.slice();
}

/** Simple separable box blur denoise (radius 1). */
export function denoise(gray: Float32Array, w: number, h: number) {
  const out = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            sum += gray[ny * w + nx];
            count++;
          }
        }
      }
      out[y * w + x] = sum / count;
    }
  }
  return out;
}

/** Illumination correction via large-kernel background estimate subtraction. */
export function correctIllumination(gray: Float32Array, w: number, h: number) {
  const blockSize = Math.max(16, Math.floor(Math.min(w, h) / 8));
  const bgW = Math.ceil(w / blockSize);
  const bgH = Math.ceil(h / blockSize);
  const bg = new Float32Array(bgW * bgH);
  for (let by = 0; by < bgH; by++) {
    for (let bx = 0; bx < bgW; bx++) {
      let sum = 0;
      let count = 0;
      for (let y = by * blockSize; y < Math.min((by + 1) * blockSize, h); y++) {
        for (let x = bx * blockSize; x < Math.min((bx + 1) * blockSize, w); x++) {
          sum += gray[y * w + x];
          count++;
        }
      }
      bg[by * bgW + bx] = count > 0 ? sum / count : 128;
    }
  }
  let globalMean = 0;
  for (let i = 0; i < bg.length; i++) globalMean += bg[i];
  globalMean /= bg.length;

  const out = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    const by = Math.min(bgH - 1, Math.floor(y / blockSize));
    for (let x = 0; x < w; x++) {
      const bx = Math.min(bgW - 1, Math.floor(x / blockSize));
      const local = bg[by * bgW + bx];
      out[y * w + x] = gray[y * w + x] - local + globalMean;
    }
  }
  return out;
}

/** Contrast normalization (min-max stretch to 0-255). */
export function normalizeContrast(gray: Float32Array) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < min) min = gray[i];
    if (gray[i] > max) max = gray[i];
  }
  const range = max - min || 1;
  const out = new Float32Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    out[i] = ((gray[i] - min) / range) * 255;
  }
  return out;
}

/** Simplified CLAHE approximation via tiled histogram equalization + blend. */
export function claheApprox(gray: Float32Array, w: number, h: number, tiles = 8) {
  const tileW = Math.ceil(w / tiles);
  const tileH = Math.ceil(h / tiles);
  const out = new Float32Array(gray.length);
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const x1 = Math.min(w, x0 + tileW);
      const y1 = Math.min(h, y0 + tileH);
      const hist = new Array(256).fill(0);
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[Math.round(Math.max(0, Math.min(255, gray[y * w + x])))]++;
          count++;
        }
      }
      const cdf = new Array(256).fill(0);
      let acc = 0;
      for (let i = 0; i < 256; i++) {
        acc += hist[i];
        cdf[i] = acc / count;
      }
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = Math.round(Math.max(0, Math.min(255, gray[y * w + x])));
          out[y * w + x] = cdf[v] * 255;
        }
      }
    }
  }
  // Blend 60% equalized / 40% original to avoid harsh artifacts
  for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.6 + gray[i] * 0.4;
  return out;
}

export function sharpen(gray: Float32Array, w: number, h: number) {
  const out = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        out[i] = gray[i];
        continue;
      }
      const v =
        5 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      out[i] = Math.max(0, Math.min(255, v));
    }
  }
  return out;
}

export const DEFAULT_PREPROCESS: PreprocessSettings = {
  grayscale: true,
  denoise: true,
  illuminationCorrection: false,
  contrastNormalization: true,
  clahe: false,
  sharpen: false,
};

export interface PipelineStage {
  name: string;
  data: Float32Array;
}

/** Runs the full ordered, logged pipeline and returns every intermediate stage. */
export function runPreprocessPipeline(
  baseGray: Float32Array,
  w: number,
  h: number,
  settings: PreprocessSettings,
): PipelineStage[] {
  const stages: PipelineStage[] = [{ name: "Original (grayscale)", data: baseGray.slice() }];
  let current = baseGray.slice();

  if (settings.denoise) {
    current = denoise(current, w, h);
    stages.push({ name: "Denoised", data: current.slice() });
  }
  if (settings.illuminationCorrection) {
    current = correctIllumination(current, w, h);
    stages.push({ name: "Illumination Corrected", data: current.slice() });
  }
  if (settings.clahe) {
    current = claheApprox(current, w, h);
    stages.push({ name: "CLAHE Enhanced", data: current.slice() });
  }
  if (settings.contrastNormalization) {
    current = normalizeContrast(current);
    stages.push({ name: "Contrast Normalized", data: current.slice() });
  }
  if (settings.sharpen) {
    current = sharpen(current, w, h);
    stages.push({ name: "Sharpened", data: current.slice() });
  }
  stages.push({ name: "Segmentation Candidate", data: current.slice() });
  return stages;
}
