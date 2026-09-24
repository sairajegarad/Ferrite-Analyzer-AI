import { Card, Label } from "../ui/primitives";

export function JuryView() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
      <div className="panel-elevated p-8 text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Explain Our Technology</div>
        <h1 className="mt-2 text-2xl font-bold text-app">"Our computer vision does not replace ASTM E562;</h1>
        <h1 className="text-2xl font-bold text-app">it makes ASTM E562 faster, more repeatable, and easier to verify."</h1>
      </div>

      <Card>
        <Label>Problem</Label>
        <p className="mt-2 text-sm text-app-secondary">Manual ferrite measurement by systematic point counting is accurate but time-consuming and can fatigue an operator over many fields.</p>
      </Card>
      <Card>
        <Label>Our Solution</Label>
        <p className="mt-2 text-sm text-app-secondary">We combine microscope imaging, computer vision assistance, and systematic point counting, wrapped in a guided, traceable workflow.</p>
      </Card>
      <Card>
        <Label>What Makes It Reliable?</Label>
        <p className="mt-2 text-sm text-app-secondary">The final numerical measurement is always generated from a documented, auditable point-count dataset — never from a black-box pixel percentage.</p>
      </Card>
      <Card>
        <Label>What Does AI Do?</Label>
        <p className="mt-2 text-sm text-app-secondary">AI/image-processing assists in proposing likely phase classifications for each grid point and flags low-confidence ("uncertain") points for human review.</p>
      </Card>
      <Card>
        <Label>What Does the Human Do?</Label>
        <p className="mt-2 text-sm text-app-secondary">The operator reviews and confirms every point, with priority given to uncertain and boundary candidates. Every manual change is recorded in the audit trail.</p>
      </Card>
      <Card>
        <Label>What Does ASTM E562 Provide?</Label>
        <p className="mt-2 text-sm text-app-secondary">The statistical framework — mean, sample standard deviation, t-multiplier, 95% confidence interval, and % relative accuracy — for reporting the volume fraction and its precision.</p>
      </Card>
      <Card>
        <Label>Why Not Simply Count Pixels?</Label>
        <p className="mt-2 text-sm text-app-secondary">
          Pixel segmentation (ASTM E1245's domain) and ASTM E562 systematic point counting are different measurement
          concepts with different statistical treatments. This application keeps them explicitly separate: segmentation
          assists, verified points measure.
        </p>
      </Card>
    </div>
  );
}
