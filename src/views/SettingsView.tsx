import { useApp } from "../state/AppState";
import { Card, Label, Toggle, StatusBadge, SectionHeading, Callout } from "../ui/primitives";
import { cn } from "../utils/cn";
import { SOFTWARE_VERSION, ALGORITHM_VERSION, ASTM_METHOD_VERSION, T_TABLE_VERSION } from "../core/types";

export function SettingsView() {
  const { state, dispatch } = useApp();
  const { prefs, currentAnalysis } = state;

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in-up">
      <SectionHeading
        eyebrow="Preferences"
        title="Settings"
        description="Appearance, workflow depth and measurement safeguards. Everything here is stored on this device only."
      />

      <Card>
        <Label>Appearance</Label>
        <div className="mt-4 space-y-4">
          <Toggle
            checked={prefs.theme === "light"}
            onChange={(v) => dispatch({ type: "SET_PREFS", prefs: { theme: v ? "light" : "dark" } })}
            label="Light theme"
            description="Dark is recommended when judging grayscale micrographs — it keeps your eye calibrated to the image."
          />
          <Toggle
            checked={prefs.customCursor}
            onChange={(v) => dispatch({ type: "SET_PREFS", prefs: { customCursor: v } })}
            label="Precision cursor"
            description="Replaces the system pointer with a trailing reticle that reacts to what it is over, and squares into crosshairs on measurement surfaces."
          />
          <Toggle
            checked={prefs.reduceMotion}
            onChange={(v) => dispatch({ type: "SET_PREFS", prefs: { reduceMotion: v } })}
            label="Reduce motion"
            description="Removes transitions and makes the cursor track your pointer exactly, with no easing."
          />
        </div>
      </Card>

      <Card>
        <Label>Workflow mode</Label>
        <p className="mt-2 text-[12.5px] leading-relaxed text-app-secondary">
          Controls how many decisions the app puts in front of you. The measurement itself is identical either way.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={prefs.mode === "simple"}
            title="Simple"
            body="Only the decisions that change the result. Sensible defaults everywhere else."
            onClick={() => dispatch({ type: "SET_PREFS", prefs: { mode: "simple" } })}
          />
          <ModeCard
            active={prefs.mode === "expert"}
            title="Expert"
            body="Full access to thresholds, diagnostics and advanced grid configuration."
            onClick={() => dispatch({ type: "SET_PREFS", prefs: { mode: "expert" } })}
          />
        </div>
      </Card>

      {currentAnalysis && (
        <Card>
          <Label>Measurement safeguards</Label>
          <div className="mt-4 space-y-4">
            <Toggle
              checked={currentAnalysis.competitionMode}
              onChange={(v) => dispatch({ type: "SET_ANALYSIS_FLAGS", patch: { competitionMode: v } })}
              label="Competition mode"
              description="Hides reference values so you cannot unconsciously tune toward an expected answer."
            />
            <Toggle
              checked={currentAnalysis.locked}
              onChange={(v) =>
                dispatch({
                  type: "SET_ANALYSIS_FLAGS",
                  patch: { locked: v, status: v ? "locked" : "in-progress" },
                })
              }
              label="Lock this measurement"
              description="Freezes the analysis. Nothing can be changed without starting a new version."
            />
          </div>
        </Card>
      )}

      <Card>
        <Label>Privacy</Label>
        <p className="mt-2 text-[12.5px] leading-relaxed text-app-secondary">
          Images are decoded, preprocessed and counted entirely in your browser. Nothing is uploaded, and project files
          stay under your control.
        </p>
        <div className="mt-3">
          <StatusBadge status="GOOD" label="Offline / local processing" dot />
        </div>
      </Card>

      <Card>
        <Label>Software information</Label>
        <dl className="mt-3">
          <VersionRow term="Software" value={SOFTWARE_VERSION} />
          <VersionRow term="Algorithm" value={ALGORITHM_VERSION} />
          <VersionRow term="ASTM method" value={ASTM_METHOD_VERSION} />
          <VersionRow term="t-table" value={T_TABLE_VERSION} />
        </dl>
      </Card>

      <Callout tone="accent" title="Why versions are recorded">
        Every exported report embeds these versions. If the method or the t-table changes later, an old result can still
        be reproduced exactly as it was measured.
      </Callout>
    </div>
  );
}

function ModeCard({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "sheen relative overflow-hidden rounded-[10px] border p-4 text-left transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-ring",
        active
          ? "border-app-strong bg-surface-elevated shadow-[var(--shadow-sm)]"
          : "border-app bg-sunken hover:-translate-y-px hover:border-app-strong",
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-[2px] bg-[var(--ink)]" aria-hidden="true" />}
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[13.5px] font-semibold", active ? "text-app" : "text-app-secondary")}>{title}</span>
        {active && <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-app-muted">Active</span>}
      </div>
      <div className="mt-1.5 text-[11.5px] leading-relaxed text-app-muted">{body}</div>
    </button>
  );
}

function VersionRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-app py-2 last:border-0">
      <dt className="text-[12px] text-app-muted">{term}</dt>
      <dd className="font-mono-num text-[11.5px] text-app-secondary">{value}</dd>
    </div>
  );
}
