import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, type ViewId } from "../state/AppState";
import { cn } from "../utils/cn";
import { KeyCap } from "./primitives";

/**
 * ⌘K command palette. Gives one keyboard entry point to every view and the
 * handful of global actions, so nothing in the app is more than two keys away.
 */

type Command = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string;
  run: () => void;
  disabled?: boolean;
};

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hasAnalysis = !!state.currentAnalysis;
  const savedFields = state.currentAnalysis?.fields.filter((f) => f.savedAt).length ?? 0;

  const commands = useMemo<Command[]>(() => {
    const go = (view: ViewId) => () => dispatch({ type: "SET_VIEW", view });
    return [
      { id: "new", label: "Start a new analysis", group: "Actions", keywords: "create sample begin", hint: "N", run: () => dispatch({ type: "NEW_BLANK" }) },
      {
        id: "resume",
        label: "Resume current analysis",
        group: "Actions",
        keywords: "continue wizard measure count",
        disabled: !hasAnalysis,
        run: go("analyze"),
      },
      {
        id: "theme",
        label: state.prefs.theme === "dark" ? "Switch to light appearance" : "Switch to dark appearance",
        group: "Actions",
        keywords: "theme dark light appearance contrast",
        run: () => dispatch({ type: "SET_PREFS", prefs: { theme: state.prefs.theme === "dark" ? "light" : "dark" } }),
      },
      {
        id: "cursor",
        label: state.prefs.customCursor ? "Turn off the precision cursor" : "Turn on the precision cursor",
        group: "Actions",
        keywords: "cursor pointer reticle mouse",
        run: () => dispatch({ type: "SET_PREFS", prefs: { customCursor: !state.prefs.customCursor } }),
      },
      { id: "home", label: "Home", group: "Go to", keywords: "dashboard overview start", run: go("home") },
      { id: "analyze", label: "Analyze", group: "Go to", keywords: "wizard measure count grid", disabled: !hasAnalysis, run: go("analyze") },
      { id: "fields", label: "Fields", group: "Go to", hint: `${savedFields} saved`, keywords: "table measurements", disabled: !hasAnalysis, run: go("fields") },
      { id: "results", label: "Results", group: "Go to", keywords: "statistics mean confidence interval", disabled: !hasAnalysis, run: go("results") },
      { id: "reports", label: "Reports & export", group: "Go to", keywords: "pdf csv json export import", disabled: !hasAnalysis, run: go("reports") },
      { id: "validation", label: "Validation", group: "Go to", keywords: "reference accuracy blind", run: go("validation") },
      { id: "history", label: "History", group: "Go to", keywords: "saved projects past open", run: go("history") },
      { id: "methodology", label: "Methodology", group: "Go to", keywords: "astm e562 how why equations help", run: go("methodology") },
      { id: "jury", label: "Explain / Jury", group: "Go to", keywords: "pitch presentation demo", run: go("jury") },
      { id: "settings", label: "Settings", group: "Go to", keywords: "preferences appearance privacy mode", run: go("settings") },
    ];
  }, [dispatch, hasAnalysis, savedFields, state.prefs.theme, state.prefs.customCursor]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = results[index];
        if (target && !target.disabled) {
          target.run();
          onOpenChange(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, index, onOpenChange]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[92] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] animate-fade-in-up" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div className="panel-elevated relative w-full max-w-[520px] overflow-hidden shadow-[var(--shadow-lg)] animate-scale-in">
        <div className="flex items-center gap-3 border-b border-app px-4">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-app-muted" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search views and actions…"
            aria-label="Search views and actions"
            className="h-[52px] flex-1 border-0 bg-transparent text-[14px] text-app placeholder:text-app-muted outline-none"
          />
          <KeyCap>esc</KeyCap>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <div className="px-3 py-8 text-center text-[13px] text-app-muted">No matches for “{query}”</div>
          )}
          {results.map((c, i) => {
            const showGroup = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {showGroup && (
                  <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                    {c.group}
                  </div>
                )}
                <button
                  data-active={i === index}
                  disabled={c.disabled}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    c.run();
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 text-left text-[13px] transition-colors duration-150",
                    c.disabled
                      ? "cursor-not-allowed text-app-muted opacity-45"
                      : i === index
                        ? "bg-hoverfill text-app"
                        : "text-app-secondary",
                  )}
                >
                  <span className="truncate">{c.label}</span>
                  {c.disabled ? (
                    <span className="shrink-0 text-[10.5px] uppercase tracking-wider text-app-muted">needs analysis</span>
                  ) : (
                    c.hint && <span className="shrink-0 font-mono-num text-[10.5px] text-app-muted">{c.hint}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-app bg-sunken px-4 py-2.5 text-[10.5px] text-app-muted">
          <span className="flex items-center gap-1.5">
            <KeyCap>↑</KeyCap>
            <KeyCap>↓</KeyCap>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <KeyCap>↵</KeyCap>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <KeyCap>?</KeyCap>
            shortcuts
          </span>
        </div>
      </div>
    </div>
  );
}
