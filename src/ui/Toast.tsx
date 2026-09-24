import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";

/**
 * Lightweight toast surface. Confirms invisible work (autosave, exports,
 * imports) so the operator is never left guessing whether an action landed.
 */

export type ToastTone = "neutral" | "success" | "warning" | "danger";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

type ToastInput = { title: string; description?: string; tone?: ToastTone; duration?: number };

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, tone = "neutral", duration = 3600 }: ToastInput) => {
      const id = ++seq.current;
      setItems((prev) => [...prev.slice(-2), { id, title, description, tone }]);
      const handle = window.setTimeout(() => dismiss(id), duration);
      timers.current.push(handle);
    },
    [dismiss],
  );

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 left-1/2 z-[95] flex w-[min(380px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const dot = {
    neutral: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[item.tone];

  return (
    <div className="panel-elevated pointer-events-auto flex items-start gap-3 px-4 py-3 animate-fade-in-up">
      <span className={cn("mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-snug text-app">{item.title}</div>
        {item.description && (
          <div className="mt-0.5 text-[11.5px] leading-relaxed text-app-muted">{item.description}</div>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-app-muted transition-colors hover:bg-hoverfill hover:text-app focus-ring"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M1 1l8 8M9 1L1 9" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/** Safe in components rendered outside the provider — becomes a no-op. */
export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { toast: () => {} };
}
