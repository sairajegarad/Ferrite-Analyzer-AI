import { Card, FormulaBlock, Label } from "../ui/primitives";

const SECTIONS: { q: string; a: string }[] = [
  { q: "What is ferrite volume fraction?", a: "The proportion of a metallographic specimen's cross-sectional area occupied by the ferrite phase, used as an estimate of its 3D volume fraction under the Delesse principle (area fraction ≈ volume fraction for a random section)." },
  { q: "What is ASTM E562?", a: "A standard test method for determining the volume fraction of a constituent by manual systematic point counting on a polished/etched section, together with the statistical framework (mean, standard deviation, t-multiplier, 95% CI, %RA) for reporting precision." },
  { q: "Why point counting?", a: "Point counting (Chalkley/Glagolev principle) gives an unbiased estimate of area/volume fraction: the fraction of systematic grid points landing on a phase converges to that phase's area fraction, without requiring precise boundary tracing." },
  { q: "Why systematic sampling?", a: "A systematic, evenly-spaced grid avoids operator selection bias and ensures each unit area of the field has an equal chance of being sampled." },
  { q: "Why is boundary = ½?", a: "When a test point falls exactly on a phase boundary, assigning full weight to either phase would bias the result. ASTM E562 assigns a half-point (0.5) to boundary hits, which is the unbiased treatment for a point exactly on an edge." },
  { q: "Why multiple fields?", a: "A single field is a small, noisy sample. Measuring many fields (ideally ≥30) allows a valid sample standard deviation and a statistically meaningful 95% confidence interval to be calculated." },
  { q: "What is PT?", a: "PT is the total number of systematic test points examined in a field (e.g. 100 for a 10×10 grid)." },
  { q: "What is Pi?", a: "Pi is the constituent point count for a field: each ferrite point = 1.0, each boundary point = 0.5, each matrix point = 0.0." },
  { q: "What is Pp(i)?", a: "Pp(i) = (Pi / PT) × 100 — the percentage of test points (weighted) landing on the constituent for field i." },
  { q: "What is the 95% CI?", a: "A range, in percentage points, expected to contain the true mean field percentage with 95% confidence, computed as t × s / √n." },
  { q: "What is %RA?", a: "Percent Relative Accuracy = (95% CI / mean) × 100 — expresses the confidence interval as a fraction of the measured mean. It is NOT the same as the ± percentage-point CI." },
  { q: "Why image processing?", a: "Digital image processing (grayscale conversion, denoising, contrast normalization, thresholding) helps the operator see phase boundaries more clearly and pre-classify points, dramatically speeding up verification." },
  { q: "Why is segmentation only an assistant?", a: "Pixel-based segmentation percentage is a different measurement concept than systematic point counting. Segmentation can misclassify texture, noise, or etching artifacts as phase; the ASTM statistical framework is defined over point counts, not pixel areas. This software therefore always computes the final Vv from the verified point dataset." },
  { q: "What is ASTM E1245?", a: "ASTM E1245 is the standard practice for determining volume fraction by automated image analysis. It is a distinct method from E562's manual point counting, though both are used for the same underlying quantity." },
  { q: "What are this application's limitations?", a: "Results depend on specimen preparation, etching quality, image quality, magnification selection, grid/field selection, and operator judgment during verification. The software does not eliminate the need for a competent operator." },
  { q: "What is validation?", a: "Comparing measured results against known reference values to assess software/operator accuracy — kept in a separate workspace so it never influences the primary measurement." },
];

export function MethodologyView() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-app">Methodology</h1>
        <p className="mt-1 text-sm text-app-secondary">A transparent explanation of the science behind every number this application reports.</p>
      </div>

      <Card>
        <Label>Core ASTM E562 Equations</Label>
        <div className="mt-3 space-y-3">
          <FormulaBlock lines={["Pp(i) = (Pi / PT) × 100"]} />
          <FormulaBlock lines={["P̄p = (1/n) × Σ Pp(i)"]} />
          <FormulaBlock lines={["s = √[ Σ(Pp(i) − P̄p)² / (n − 1) ]   (sample standard deviation)"]} />
          <FormulaBlock lines={["95% CI = t × s / √n"]} />
          <FormulaBlock lines={["Vv = P̄p ± 95% CI"]} />
          <FormulaBlock lines={["%RA = (95% CI / P̄p) × 100"]} />
        </div>
      </Card>

      <Card>
        <Label>Pipeline</Label>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-app-secondary">
          {["Microscope Image", "Quality Assurance", "Processing", "Segmentation Assistance", "Smart Grid", "AI/CV Suggestions", "Human Verification", "Verified PT/Pi/Pp(i)", "ASTM Statistics", "Traceable Result"].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-full border border-app px-2.5 py-1">{s}</span>
              {i < arr.length - 1 && <span className="text-app-muted">→</span>}
            </span>
          ))}
        </div>
      </Card>

      {SECTIONS.map((s) => (
        <Card key={s.q}>
          <div className="text-sm font-semibold text-app">{s.q}</div>
          <p className="mt-1.5 text-sm leading-relaxed text-app-secondary">{s.a}</p>
        </Card>
      ))}

      <Card className="border-warning/40">
        <Label>Scientific Limitation Statement</Label>
        <p className="mt-2 text-sm leading-relaxed text-app-secondary">
          This software assists ASTM E562 point counting using digital image processing. Automatic image segmentation
          is not itself the ASTM E562 measurement. Results depend on specimen preparation, image quality,
          magnification, grid selection, representative field selection, phase identification, and operator
          verification. The software does not claim certification unless separately validated/certified. This
          application implements the ASTM E562 systematic manual point-count calculation workflow — it is described as
          "ASTM E562-based," not "ASTM-certified."
        </p>
      </Card>
    </div>
  );
}
