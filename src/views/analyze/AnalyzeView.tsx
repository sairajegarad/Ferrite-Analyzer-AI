import { useMemo, useState } from "react";
import { useApp } from "../../state/AppState";
import { createDraftField } from "../../core/factory";
import { AnalyzeContext, emptyPipeline, type PipelineData } from "./context";
import type { Field } from "../../core/types";
import { cn } from "../../utils/cn";
import { StepSample } from "./StepSample";
import { StepImage } from "./StepImage";
import { StepQuality } from "./StepQuality";
import { StepGrid } from "./StepGrid";
import { StepPreprocess } from "./StepPreprocess";
import { StepSegment } from "./StepSegment";
import { StepCount } from "./StepCount";
import { StepReview } from "./StepReview";
import { EmptyState, Button, Tooltip } from "../../ui/primitives";

const STEPS = [
  { n: 1, label: "Sample", hint: "Identify what you are measuring" },
  { n: 2, label: "Image", hint: "Load a micrograph for this field" },
  { n: 3, label: "Quality", hint: "Check focus, lighting and contrast" },
  { n: 4, label: "Grid", hint: "Choose the systematic point grid" },
  { n: 5, label: "Preprocess", hint: "Even out illumination and noise" },
  { n: 6, label: "Segment", hint: "Propose which phase each pixel is" },
  { n: 7, label: "Count", hint: "Confirm what each grid point sits on" },
  { n: 8, label: "Review", hint: "Verify, then save the field" },
];

export function AnalyzeView() {
  const { state, dispatch } = useApp();
  const analysis = state.currentAnalysis;
  const [draft, setDraftState] = useState<Field | null>(null);
  const [pipeline, setPipelineState] = useState<PipelineData>(emptyPipeline);
  const [qualityOverride, setQualityOverrideState] = useState(false);
  const step = state.wizardStep || 1;

  const nextFieldNumber = useMemo(
    () => (analysis ? analysis.fields.filter((f) => f.savedAt).length + 1 : 1),
    [analysis],
  );

  if (!analysis) {
    return (
      <EmptyState
        title="No analysis open"
        description="An analysis holds the sample details and every field you measure. Create one to start counting points."
        action={
          <Button onClick={() => dispatch({ type: "SET_VIEW", view: "new-analysis" })} cursorLabel="Create">
            New analysis
          </Button>
        }
      />
    );
  }

  const activeDraft = draft ?? createDraftField(nextFieldNumber);
  if (!draft) setDraftState(activeDraft);

  const setDraft = (patch: Partial<Field> | ((f: Field) => Field)) => {
    setDraftState((prev) => {
      const base = prev ?? activeDraft;
      return typeof patch === "function" ? patch(base) : { ...base, ...patch };
    });
  };
  const setPipeline = (patch: Partial<PipelineData> | ((p: PipelineData) => PipelineData)) => {
    setPipelineState((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  };
  const goStep = (n: number) => dispatch({ type: "SET_WIZARD_STEP", step: n });

  const resetForNextField = () => {
    setDraftState(null);
    setPipelineState(emptyPipeline);
    setQualityOverrideState(false);
    goStep(2);
  };

  const setQualityOverride = (v: boolean) => setQualityOverrideState(v);

  const savedCount = analysis.fields.filter((f) => f.savedAt).length;
  const current = STEPS.find((s) => s.n === step) ?? STEPS[0];

  return (
    <AnalyzeContext.Provider
      value={{ draft: activeDraft, setDraft, pipeline, setPipeline, step, goStep, qualityOverride, setQualityOverride }}
    >
      <div className="space-y-6 animate-fade-in-up">
        {/* Always say which field, which step, and what the step is for. */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-app-muted">
              Field {activeDraft.fieldNumber} · Step {step} of {STEPS.length}
            </div>
            <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-app">
              {current.label}
            </h1>
            <p className="mt-1 text-[12.5px] text-app-secondary">{current.hint}</p>
          </div>
          <div className="font-mono-num text-[11.5px] text-app-muted">
            {savedCount} field{savedCount === 1 ? "" : "s"} saved
          </div>
        </div>

        <Stepper step={step} onGo={goStep} />

        <div>
          {step === 1 && <StepSample />}
          {step === 2 && <StepImage />}
          {step === 3 && <StepQuality />}
          {step === 4 && <StepGrid />}
          {step === 5 && <StepPreprocess />}
          {step === 6 && <StepSegment />}
          {step === 7 && <StepCount />}
          {step === 8 && <StepReview onFieldSaved={resetForNextField} />}
        </div>
      </div>
    </AnalyzeContext.Provider>
  );
}

/**
 * Progress rail. Completed steps stay clickable so a decision can always be
 * re-checked; steps ahead are visibly out of reach rather than silently inert.
 */
function Stepper({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  const pct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="panel overflow-hidden">
      <div className="relative h-[2px] w-full bg-sunken">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--ink)] transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-0.5 overflow-x-auto p-1.5">
        {STEPS.map((s) => {
          const status = s.n < step ? "done" : s.n === step ? "current" : "pending";
          const reachable = s.n <= step;

          const button = (
            <button
              onClick={() => reachable && onGo(s.n)}
              disabled={!reachable}
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "flex min-w-0 shrink-0 items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12px] font-medium transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-ring",
                status === "current" && "bg-surface-elevated text-app shadow-[var(--shadow-sm)]",
                status === "done" && "text-app-secondary hover:bg-hoverfill hover:text-app",
                status === "pending" && "cursor-not-allowed text-app-muted opacity-45",
              )}
            >
              <span
                className={cn(
                  "flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border font-mono-num text-[9.5px] transition-colors duration-300",
                  status === "current" && "border-transparent bg-[var(--ink)] text-[var(--ink-contrast)]",
                  status === "done" && "border-success/50 bg-success/10 text-success",
                  status === "pending" && "border-app-strong text-app-muted",
                )}
              >
                {status === "done" ? (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1.5 5.2l2.2 2.2L8.5 2.6" />
                  </svg>
                ) : (
                  String(s.n).padStart(2, "0")
                )}
              </span>
              <span className="hidden truncate sm:inline">{s.label}</span>
            </button>
          );

          return (
            <div key={s.n} className="shrink-0">
              {reachable ? (
                <Tooltip content={s.hint} side="bottom">
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
