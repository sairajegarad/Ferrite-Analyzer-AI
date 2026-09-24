// ============================================================================
// IMAGE QUALITY ENGINE (software quality gate — assistance layer, not ASTM)
// ============================================================================
import type { QualityMetric, QualityReport } from "../core/types";
import { toGrayscaleFloat } from "./canvasUtils";
import { nowIso } from "../core/id";

function laplacianVariance(gray: Float32Array, w: number, h: number): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function stdDev(values: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  const mean = sum / values.length;
  let sq = 0;
  for (let i = 0; i < values.length; i++) sq += (values[i] - mean) ** 2;
  return Math.sqrt(sq / values.length);
}

function histogram256(gray: Float32Array): number[] {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) {
    hist[Math.max(0, Math.min(255, Math.round(gray[i])))]++;
  }
  return hist;
}

function illuminationUniformity(gray: Float32Array, w: number, h: number): number {
  // Split into a 3x3 grid of regions and compare mean brightness deviation.
  const regions: number[] = [];
  const rw = Math.floor(w / 3);
  const rh = Math.floor(h / 3);
  for (let ry = 0; ry < 3; ry++) {
    for (let rx = 0; rx < 3; rx++) {
      let sum = 0;
      let count = 0;
      for (let y = ry * rh; y < Math.min((ry + 1) * rh, h); y++) {
        for (let x = rx * rw; x < Math.min((rx + 1) * rw, w); x++) {
          sum += gray[y * w + x];
          count++;
        }
      }
      regions.push(count > 0 ? sum / count : 0);
    }
  }
  const mean = regions.reduce((a, b) => a + b, 0) / regions.length;
  const spread = Math.sqrt(regions.reduce((a, b) => a + (b - mean) ** 2, 0) / regions.length);
  // Normalize: spread relative to mean brightness
  return mean > 0 ? spread / mean : 1;
}

function bimodalitySeparation(hist: number[]): number {
  // Estimate separability: variance ratio between the two halves split at the valley.
  const total = hist.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let minValley = Infinity;
  let valleyIdx = 128;
  // search for a local minimum between smoothed peaks, ignoring extremes
  const smoothed = hist.map((_, i) => {
    const lo = Math.max(0, i - 3);
    const hi = Math.min(255, i + 3);
    let s = 0;
    for (let k = lo; k <= hi; k++) s += hist[k];
    return s / (hi - lo + 1);
  });
  for (let i = 40; i < 216; i++) {
    if (smoothed[i] < minValley) {
      minValley = smoothed[i];
      valleyIdx = i;
    }
  }
  let leftSum = 0;
  let rightSum = 0;
  for (let i = 0; i < 256; i++) {
    if (i < valleyIdx) leftSum += hist[i];
    else rightSum += hist[i];
  }
  const leftFrac = leftSum / total;
  const rightFrac = rightSum / total;
  const peakiness = 1 - minValley / (Math.max(...smoothed) || 1);
  // Reward when both populations are meaningfully present and there's a clear valley
  const balance = 1 - Math.abs(leftFrac - rightFrac) * 0.5;
  return Math.max(0, Math.min(1, peakiness * 0.7 + balance * 0.3));
}

export async function computeImageQuality(
  imageData: ImageData,
  fileSizeBytes: number,
): Promise<QualityReport> {
  const { width, height } = imageData;
  const gray = toGrayscaleFloat(imageData);
  const metrics: QualityMetric[] = [];

  // --- Resolution ---
  const shortestSide = Math.min(width, height);
  metrics.push({
    key: "resolution",
    label: "Resolution",
    status: shortestSide >= 800 ? "GOOD" : shortestSide >= 400 ? "WARNING" : "FAIL",
    value: shortestSide,
    unit: "px (shortest side)",
    message:
      shortestSide >= 800
        ? `Working resolution ${width}x${height} is sufficient for point-count analysis.`
        : shortestSide >= 400
        ? `Working resolution ${width}x${height} is modest; fine microstructural detail may be harder to resolve.`
        : `Working resolution ${width}x${height} is low. Consider a higher-resolution capture.`,
  });

  // --- Focus (Laplacian variance) ---
  const lapVar = laplacianVariance(gray, width, height);
  metrics.push({
    key: "focus",
    label: "Focus",
    status: lapVar > 150 ? "GOOD" : lapVar > 50 ? "WARNING" : "FAIL",
    value: Math.round(lapVar * 100) / 100,
    unit: "Laplacian variance",
    message:
      lapVar > 150
        ? "Sharp microstructure detected."
        : lapVar > 50
        ? "Moderate sharpness. Fine boundaries may be difficult to classify."
        : "Image appears blurred. Boundary points may be unreliable.",
  });

  // --- Contrast ---
  const sd = stdDev(gray);
  metrics.push({
    key: "contrast",
    label: "Contrast",
    status: sd > 40 ? "GOOD" : sd > 20 ? "WARNING" : "FAIL",
    value: Math.round(sd * 100) / 100,
    unit: "gray std. dev.",
    message:
      sd > 40
        ? "Good global contrast between phases."
        : sd > 20
        ? "Phase separation may be difficult."
        : "Very low contrast. Segmentation assistance may be unreliable.",
  });

  // --- Exposure / clipping ---
  const hist = histogram256(gray);
  const total = gray.length;
  const nearBlack = hist.slice(0, 6).reduce((a, b) => a + b, 0) / total;
  const nearWhite = hist.slice(250, 256).reduce((a, b) => a + b, 0) / total;
  const clipped = nearBlack + nearWhite;
  metrics.push({
    key: "exposure",
    label: "Exposure",
    status: clipped < 0.02 ? "GOOD" : clipped < 0.08 ? "WARNING" : "FAIL",
    value: Math.round(clipped * 10000) / 100,
    unit: "% clipped",
    message:
      clipped < 0.02
        ? "No significant over/under-exposure detected."
        : clipped < 0.08
        ? "Some pixels are near-black or near-white; check illumination."
        : "Significant clipping detected — image is over/under-exposed.",
  });

  // --- Saturation (near black / near white) ---
  metrics.push({
    key: "saturation",
    label: "Saturation",
    status: nearBlack < 0.05 && nearWhite < 0.05 ? "GOOD" : nearBlack < 0.15 && nearWhite < 0.15 ? "WARNING" : "FAIL",
    value: Math.round((nearBlack + nearWhite) * 10000) / 100,
    unit: "% near-extreme pixels",
    message: `${(nearBlack * 100).toFixed(1)}% near-black, ${(nearWhite * 100).toFixed(1)}% near-white pixels.`,
  });

  // --- Illumination uniformity ---
  const illumSpread = illuminationUniformity(gray, width, height);
  metrics.push({
    key: "illumination",
    label: "Illumination Uniformity",
    status: illumSpread < 0.08 ? "GOOD" : illumSpread < 0.18 ? "WARNING" : "FAIL",
    value: Math.round(illumSpread * 1000) / 1000,
    unit: "relative spread",
    message:
      illumSpread < 0.08
        ? "Illumination is uniform across the field."
        : illumSpread < 0.18
        ? "Brightening/darkening gradient detected across the field."
        : "Strong illumination gradient or vignetting detected.",
  });

  // --- Noise estimate (difference between raw and 3x3-smoothed) ---
  let noiseSum = 0;
  let noiseCount = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = y * width + x;
      const avg =
        (gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] + gray[i]) / 5;
      noiseSum += Math.abs(gray[i] - avg);
      noiseCount++;
    }
  }
  const noise = noiseCount > 0 ? noiseSum / noiseCount : 0;
  metrics.push({
    key: "noise",
    label: "Noise",
    status: noise < 4 ? "GOOD" : noise < 9 ? "WARNING" : "FAIL",
    value: Math.round(noise * 100) / 100,
    unit: "mean high-freq deviation",
    message:
      noise < 4
        ? "Low noise level."
        : noise < 9
        ? "Moderate noise. Mild denoising is recommended before segmentation."
        : "High noise level detected. Denoising strongly recommended.",
  });

  // --- Phase separability (histogram bimodality) ---
  const separability = bimodalitySeparation(hist);
  metrics.push({
    key: "separability",
    label: "Phase Separability",
    status: separability > 0.55 ? "GOOD" : separability > 0.3 ? "WARNING" : "FAIL",
    value: Math.round(separability * 100) / 100,
    unit: "0-1 index",
    message:
      separability > 0.55
        ? "Histogram shows two reasonably distinguishable populations."
        : separability > 0.3
        ? "Populations partially overlap; segmentation assistance confidence will be reduced."
        : "Histogram does not show clearly separable populations. Manual point classification will rely primarily on visual judgment.",
  });

  // --- File size sanity (texture/detail proxy) ---
  const bytesPerPixel = fileSizeBytes / (width * height);
  metrics.push({
    key: "detail",
    label: "Texture / Detail",
    status: bytesPerPixel > 0.3 ? "GOOD" : bytesPerPixel > 0.1 ? "WARNING" : "WARNING",
    value: Math.round(bytesPerPixel * 1000) / 1000,
    unit: "bytes/px (compression proxy)",
    message:
      bytesPerPixel > 0.3
        ? "File detail/compression level is consistent with a detailed capture."
        : "High compression detected relative to pixel count; fine detail may be reduced.",
  });

  const failCount = metrics.filter((m) => m.status === "FAIL").length;
  const warnCount = metrics.filter((m) => m.status === "WARNING").length;
  const score = Math.max(
    0,
    Math.round(100 - failCount * 18 - warnCount * 7),
  );
  const overall: QualityReport["overall"] = failCount > 0 ? "FAIL" : warnCount > 2 ? "WARNING" : warnCount > 0 ? "WARNING" : "GOOD";

  return {
    score,
    overall,
    metrics,
    overrideUsed: false,
    computedAt: nowIso(),
  };
}
