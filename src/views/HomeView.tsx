import type { ReactNode } from "react";
import { useApp } from "../state/AppState";
import { Button, Card, Eyebrow, Label, StatusBadge, Tooltip } from "../ui/primitives";
import { computeASTMStatistics } from "../core/astm/calculations";

export function HomeView() {
  const { state, dispatch } = useApp();
  const analysis = state.currentAnalysis;
  const stats = analysis ? computeASTMStatistics(analysis.fields) : null;
  const savedFields = analysis ? analysis.fields.filter((f) => f.savedAt).length : 0;
  const lastHistory = [...state.history].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];

  // One obvious next move, always. This is the single most useful thing the
  // home screen can do: remove the "what now?" pause.
  const nextAction = !analysis
    ? { label: "Start an analysis", run: () => dispatch({ type: "NEW_BLANK" }) }
    : savedFields === 0
      ? { label: "Measure the first field", run: () => dispatch({ type: "SET_VIEW", view: "analyze" }) }
      : stats?.formalCIReady
        ? { label: "Review the result", run: () => dispatch({ type: "SET_VIEW", view: "results" }) }
        : { label: "Add another field", run: () => dispatch({ type: "SET_VIEW", view: "analyze" }) };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Hero */}
      <section className="panel sheen relative overflow-hidden px-7 py-12 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/[0.07] blur-[100px]"
          aria-hidden="true"
        />
        <div className="relative max-w-[42rem]">
          <Eyebrow>Quantitative metallography</Eyebrow>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-app sm:text-[54px]">
            Ferrite volume
            <br />
            fraction, defensibly.
          </h1>
          <p className="mt-4 max-w-[36rem] text-[14px] leading-relaxed text-app-secondary">
            A systematic manual point count to ASTM E562 — with the grid, the arithmetic and the confidence interval all
            shown to you, rather than hidden behind a single number.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Button size="lg" onClick={nextAction.run} cursorLabel="Continue">
              {nextAction.label}
            </Button>
            {lastHistory && (
              <Button size="lg" variant="secondary" onClick={() => dispatch({ type: "SET_VIEW", view: "history" })}>
                Open saved work
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={() => dispatch({ type: "SET_VIEW", view: "methodology" })}>
              How it works
            </Button>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3">
            <Fact>Runs entirely on this device</Fact>
            <Fact>Original images never altered</Fact>
            <Fact>Every number traceable to a formula</Fact>
          </div>
        </div>
      </section>

      {/* At-a-glance state */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rise rise-1">
          <Label>Current sample</Label>
          {analysis ? (
            <>
              <div className="mt-2.5 truncate text-[17px] font-semibold text-app">
                {analysis.sample.sampleId || "Untitled sample"}
              </div>
              <div className="mt-1 text-[12px] text-app-muted">
                {savedFields} field{savedFields === 1 ? "" : "s"} measured
              </div>
            </>
          ) : (
            <>
              <div className="mt-2.5 text-[17px] font-semibold text-app-muted">None open</div>
              <div className="mt-1 text-[12px] text-app-muted">Create an analysis to begin.</div>
            </>
          )}
        </Card>

        <Card className="rise rise-2">
          <Label>Volume fraction</Label>
          {stats && savedFields > 0 ? (
            <>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-mono-num text-[26px] font-semibold text-app">{stats.mean.toFixed(2)}</span>
                <span className="text-[14px] text-app-muted">%</span>
              </div>
              <div className="mt-1 font-mono-num text-[12px] text-app-muted">± {stats.ci95.toFixed(2)} at 95%</div>
            </>
          ) : (
            <>
              <div className="mt-2.5 font-mono-num text-[26px] font-semibold text-app-muted">—</div>
              <div className="mt-1 text-[12px] text-app-muted">Available after the first field.</div>
            </>
          )}
        </Card>

        <Card className="rise rise-3">
          <Label>Confidence</Label>
          {stats && savedFields > 0 ? (
            <>
              <div className="mt-3">
                <Tooltip
                  content={
                    stats.formalCIReady
                      ? "At least 30 fields — the confidence interval can be quoted formally."
                      : "Fewer than 30 fields. The interval is indicative, not formal."
                  }
                >
                  <span className="inline-flex">
                    <StatusBadge
                      status={stats.formalCIReady ? "VALID" : "MORE FIELDS REQUIRED"}
                      label={stats.formalCIReady ? "Formal 95% CI" : "More fields required"}
                      dot
                    />
                  </span>
                </Tooltip>
              </div>
              <div className="mt-2 font-mono-num text-[12px] text-app-muted">
                Relative accuracy {stats.relativeAccuracyPercent.toFixed(1)}%
              </div>
            </>
          ) : (
            <>
              <div className="mt-3">
                <StatusBadge status="NEUTRAL" label="Not started" dot />
              </div>
              <div className="mt-2 text-[12px] text-app-muted">30 fields is the usual target.</div>
            </>
          )}
        </Card>
      </div>

      {/* Resume */}
      {lastHistory && (
        <Card
          interactive
          as="button"
          data-cursor-label="Open"
          onClick={() => dispatch({ type: "LOAD_ANALYSIS", analysis: lastHistory })}
          className="group flex w-full items-center justify-between gap-4 text-left"
        >
          <div className="min-w-0">
            <Label>Pick up where you left off</Label>
            <div className="mt-1.5 truncate text-[15px] font-semibold text-app">
              {lastHistory.sample?.sampleId || "Untitled sample"}
            </div>
            <div className="mt-0.5 font-mono-num text-[11.5px] text-app-muted">
              Last edited {new Date(lastHistory.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <span className="shrink-0 text-app-muted transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-1 group-hover:text-app">
            <Arrow />
          </span>
        </Card>
      )}

      {/* Positioning */}
      <div className="panel-sunken px-6 py-7">
        <h2 className="text-[15px] font-semibold text-app">Computer vision assists. ASTM E562 measures.</h2>
        <p className="mt-2 max-w-[46rem] text-[12.5px] leading-relaxed text-app-secondary">
          Segmentation proposes a phase for every grid point, and low-confidence points are queued for you to judge. The
          number that leaves this app is still the standard&rsquo;s number:
        </p>
        <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 font-mono-num text-[12px] text-app-muted">
          <span>
            P<sub>T</sub> — points per field
          </span>
          <span>
            P<sub>i</sub> — points on ferrite
          </span>
          <span>
            P<sub>p(i)</sub> = (P<sub>i</sub> / P<sub>T</sub>) × 100
          </span>
        </div>
      </div>
    </div>
  );
}

function Fact({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[12px] text-app-muted">
      <span className="h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      {children}
    </span>
  );
}

function Arrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8h9M8.8 4.3L12.5 8l-3.7 3.7" />
    </svg>
  );
}
