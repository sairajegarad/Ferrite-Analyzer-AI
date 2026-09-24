import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./state/AppState";
import { Shell } from "./ui/layout/Shell";
import { Cursor } from "./ui/Cursor";
import { CommandPalette } from "./ui/CommandPalette";
import { Shortcuts } from "./ui/Shortcuts";
import { ToastProvider } from "./ui/Toast";
import { HomeView } from "./views/HomeView";
import { NewAnalysisView } from "./views/NewAnalysisView";
import { AnalyzeView } from "./views/analyze/AnalyzeView";
import { FieldsView } from "./views/FieldsView";
import { ResultsView } from "./views/ResultsView";
import { ReportsView } from "./views/ReportsView";
import { ValidationView } from "./views/ValidationView";
import { HistoryView } from "./views/HistoryView";
import { MethodologyView } from "./views/MethodologyView";
import { JuryView } from "./views/JuryView";
import { SettingsView } from "./views/SettingsView";
import { Button, KeyCap } from "./ui/primitives";

function Router() {
  const { state } = useApp();
  switch (state.view) {
    case "home":
      return <HomeView />;
    case "new-analysis":
      return <NewAnalysisView />;
    case "analyze":
      return <AnalyzeView />;
    case "fields":
      return <FieldsView />;
    case "results":
      return <ResultsView />;
    case "reports":
      return <ReportsView />;
    case "validation":
      return <ValidationView />;
    case "history":
      return <HistoryView />;
    case "methodology":
      return <MethodologyView />;
    case "jury":
      return <JuryView />;
    case "settings":
      return <SettingsView />;
    default:
      return <HomeView />;
  }
}

/* ------------------------------- Onboarding ------------------------------- */

const STEPS = [
  {
    step: "01",
    title: "Describe the sample",
    body: "Material, heat, operator, magnification. Everything a report needs to be traceable.",
  },
  {
    step: "02",
    title: "Add a field image",
    body: "Your original file is never altered. The app works on a copy and checksums the source.",
  },
  {
    step: "03",
    title: "Confirm the grid points",
    body: "The software proposes a classification for each point. You stay the final judge.",
  },
  {
    step: "04",
    title: "Read the result",
    body: "Volume fraction with a 95% confidence interval, every number traceable to its formula.",
  },
];

function FirstRun() {
  const { state, dispatch } = useApp();
  const [dismissed, setDismissed] = useState(false);
  if (!state.loaded || state.prefs.introSeen || dismissed) return null;

  const finish = (startNow: boolean) => {
    dispatch({ type: "SET_PREFS", prefs: { introSeen: true } });
    setDismissed(true);
    if (startNow) dispatch({ type: "NEW_BLANK" });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/65 p-5 backdrop-blur-[3px]">
      <div className="panel-elevated w-full max-w-[560px] overflow-hidden shadow-[var(--shadow-lg)] animate-scale-in">
        <div className="border-b border-app px-8 pb-7 pt-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-app-muted">
            Quantitative metallography
          </div>
          <h2 className="mt-2.5 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-app">
            Ferrite Analyzer Pro
          </h2>
          <p className="mt-2.5 max-w-md text-[13.5px] leading-relaxed text-app-secondary">
            A systematic manual point count per ASTM E562 — assisted by software, decided by you, and fully offline.
          </p>
        </div>

        <ol className="divide-y divide-[var(--border)]">
          {STEPS.map((s) => (
            <li key={s.step} className="flex gap-4 px-8 py-4 transition-colors duration-200 hover:bg-hoverfill">
              <span className="mt-[3px] font-mono-num text-[11px] font-medium text-app-muted">{s.step}</span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-app">{s.title}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-app-secondary">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app bg-sunken px-8 py-5">
          <span className="flex items-center gap-1.5 text-[11px] text-app-muted">
            Press <KeyCap>?</KeyCap> anytime for shortcuts
          </span>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => finish(false)}>
              Look around first
            </Button>
            <Button onClick={() => finish(true)}>Start an analysis</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Chrome --------------------------------- */

function AppChrome() {
  const { state, dispatch } = useApp();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      // Single-key shortcuts must never fire while the user is typing.
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing || mod || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        dispatch({ type: "NEW_BLANK" });
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        dispatch({ type: "SET_PREFS", prefs: { theme: state.prefs.theme === "dark" ? "light" : "dark" } });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.prefs.theme]);

  return (
    <>
      <Cursor enabled={state.prefs.customCursor} reduceMotion={state.prefs.reduceMotion} />
      <Shell onOpenPalette={() => setPaletteOpen(true)}>
        <Router />
      </Shell>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Shortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <FirstRun />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppChrome />
      </ToastProvider>
    </AppProvider>
  );
}
