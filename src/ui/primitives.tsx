import React, { useEffect, useId, useRef, useState } from "react";
import { cn } from "../utils/cn";

/* ============================================================================
   PRIMITIVES
   Quiet, precise controls. One accent, hairline structure, calm motion.
   ========================================================================== */

/* ---------------------------------- Button -------------------------------- */

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  loading,
  icon,
  cursorLabel,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  cursorLabel?: string;
}) {
  const base =
    "group relative inline-flex select-none items-center justify-center gap-2 font-medium tracking-[-0.01em] " +
    "transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] " +
    "focus-ring active:scale-[0.985] disabled:pointer-events-none disabled:opacity-35";

  const sizes = {
    sm: "h-8 px-3 text-[12px] rounded-[8px]",
    md: "h-10 px-4 text-[13px] rounded-[10px]",
    lg: "h-12 px-6 text-[14px] rounded-[12px]",
  };

  const variants = {
    primary:
      "bg-[var(--ink)] text-[var(--ink-contrast)] font-semibold shadow-[var(--shadow-sm)] hover:-translate-y-px hover:shadow-[var(--shadow-md)]",
    secondary:
      "border border-app bg-surface text-app hover:-translate-y-px hover:border-app-strong hover:shadow-[var(--shadow-sm)]",
    ghost: "text-app-secondary hover:bg-hoverfill hover:text-app",
    quiet: "border border-transparent text-app-secondary hover:border-app hover:bg-surface hover:text-app",
    danger: "border border-danger/35 bg-danger/10 text-danger hover:bg-danger/18 hover:border-danger/55",
  };

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      data-cursor-label={cursorLabel}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70" />
  );
}

/* ----------------------------------- Card --------------------------------- */

export function Card({
  children,
  className,
  elevated,
  interactive,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  interactive?: boolean;
  as?: "div" | "section" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(elevated ? "panel-elevated" : "panel", "p-5", interactive && "sheen lift", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* --------------------------------- Section -------------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight text-app">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-app-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[10px] font-semibold uppercase tracking-[0.22em] text-app-muted", className)}>
      {children}
    </div>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted", className)}>
      {children}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("hairline my-6 border-0", className)} />;
}

/* ------------------------------- StatusBadge ------------------------------ */

const statusStyles: Record<string, string> = {
  GOOD: "text-success border-success/30 bg-success/10",
  VALID: "text-success border-success/30 bg-success/10",
  VALIDATED: "text-success border-success/30 bg-success/10",
  READY: "text-success border-success/30 bg-success/10",
  WARNING: "text-warning border-warning/30 bg-warning/10",
  MODERATE: "text-warning border-warning/30 bg-warning/10",
  FAIL: "text-danger border-danger/30 bg-danger/10",
  POOR: "text-danger border-danger/30 bg-danger/10",
  INCOMPLETE: "text-danger border-danger/30 bg-danger/10",
  "MORE FIELDS REQUIRED": "text-warning border-warning/30 bg-warning/10",
  "REVIEW REQUIRED": "text-warning border-warning/30 bg-warning/10",
  ACCENT: "text-accent border-accent/30 bg-accent/10",
  NEUTRAL: "text-app-secondary border-app bg-sunken",
};

const statusDot: Record<string, string> = {
  GOOD: "bg-success",
  VALID: "bg-success",
  VALIDATED: "bg-success",
  READY: "bg-success",
  WARNING: "bg-warning",
  MODERATE: "bg-warning",
  FAIL: "bg-danger",
  POOR: "bg-danger",
  INCOMPLETE: "bg-danger",
  "MORE FIELDS REQUIRED": "bg-warning",
  "REVIEW REQUIRED": "bg-warning",
  ACCENT: "bg-accent",
  NEUTRAL: "bg-[var(--text-muted)]",
};

export function StatusBadge({
  status,
  label,
  dot = true,
}: {
  status: keyof typeof statusStyles | string;
  label?: string;
  dot?: boolean;
}) {
  const cls = statusStyles[status] ?? statusStyles.NEUTRAL;
  const dotCls = statusDot[status] ?? statusDot.NEUTRAL;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em]",
        cls,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotCls)} />}
      {label ?? status}
    </span>
  );
}

/* --------------------------------- StatCard ------------------------------- */

export function StatCard({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="panel sheen lift p-4">
      <Label>{label}</Label>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono-num text-[22px] font-semibold text-app">{value}</span>
        {unit && <span className="text-[13px] text-app-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] leading-relaxed text-app-muted">{hint}</div>}
    </div>
  );
}

/* --------------------------------- Tooltip -------------------------------- */

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-1/2 z-[80] w-max max-w-[260px] -translate-x-1/2 rounded-[8px] border border-app bg-surface-elevated px-2.5 py-1.5 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-app-secondary shadow-[var(--shadow-md)] animate-scale-in",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/** Small "?" affordance that opens on hover as well as click/keyboard. */
export function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <button
        type="button"
        aria-label={`Help: ${text}`}
        onClick={(e) => e.preventDefault()}
        className="ml-1.5 inline-flex h-[15px] w-[15px] items-center justify-center rounded-full border border-app-strong text-[9px] font-semibold text-app-muted transition-colors duration-200 hover:border-accent hover:text-accent focus-ring"
      >
        ?
      </button>
    </Tooltip>
  );
}

/* ------------------------------- FormulaBlock ----------------------------- */

export function FormulaBlock({ lines, title }: { lines: string[]; title?: string }) {
  return (
    <div className="panel-sunken overflow-x-auto p-3.5">
      {title && <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">{title}</div>}
      <div className="font-mono-num text-[12.5px] leading-[1.7] text-app-secondary">
        {lines.map((l, i) => (
          <div key={i} className={l === "" ? "h-2.5" : i === 0 ? "text-app" : undefined}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- EmptyState ------------------------------ */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-app-strong bg-sunken px-8 py-16 text-center animate-fade-in-up">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-app bg-surface text-app-muted">
        {icon ?? <DotGrid />}
      </div>
      <div className="mt-1 text-[15px] font-semibold text-app">{title}</div>
      <div className="max-w-sm text-[13px] leading-relaxed text-app-secondary">{description}</div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function DotGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      {[3, 9, 15].map((y) => [3, 9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />))}
    </svg>
  );
}

/* --------------------------------- Toggle --------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "group inline-flex select-none items-start gap-3",
        disabled ? "pointer-events-none opacity-40" : "cursor-pointer",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-[20px] w-[34px] shrink-0 rounded-full border transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-ring",
          checked ? "border-transparent bg-[var(--ink)]" : "border-app-strong bg-sunken group-hover:border-app-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-[14px] w-[14px] rounded-full shadow-[var(--shadow-sm)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
            checked ? "translate-x-[16px] bg-[var(--ink-contrast)]" : "translate-x-[2px] bg-[var(--text-muted)]",
          )}
        />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[13px] leading-tight text-app">{label}</span>}
          {description && <span className="mt-1 block text-[11.5px] leading-relaxed text-app-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

/* --------------------------------- Inputs --------------------------------- */

const fieldClass =
  "w-full rounded-[10px] border border-app bg-sunken px-3 py-2.5 text-[13px] text-app placeholder:text-app-muted outline-none " +
  "transition-[border-color,background-color,box-shadow] duration-200 hover:border-app-strong " +
  "focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)]";

function FieldLabel({
  label,
  required,
  help,
  htmlFor,
}: {
  label?: string;
  required?: boolean;
  help?: string;
  htmlFor?: string;
}) {
  if (!label && !help) return null;
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted"
    >
      {label}
      {required && <span className="ml-1 text-danger">*</span>}
      {help && <HelpTip text={help} />}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  help,
  hint,
  error,
  icon,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  help?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("block", className)}>
      <FieldLabel label={label} required={required} help={help} htmlFor={id} />
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted">{icon}</span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, icon && "pl-9", error && "border-danger/60 focus:border-danger")}
        />
      </div>
      {hint && !error && <div className="mt-1.5 text-[11px] leading-relaxed text-app-muted">{hint}</div>}
      {error && <div className="mt-1.5 text-[11px] leading-relaxed text-danger">{error}</div>}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="block">
      <FieldLabel label={label} htmlFor={id} />
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={cn(fieldClass, "resize-y leading-relaxed")}
      />
      {hint && <div className="mt-1.5 text-[11px] leading-relaxed text-app-muted">{hint}</div>}
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  help,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  help?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="block">
      <FieldLabel label={label} help={help} htmlFor={id} />
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, "cursor-pointer appearance-none pr-9")}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-elevated text-app">
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-app-muted"
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {hint && <div className="mt-1.5 text-[11px] leading-relaxed text-app-muted">{hint}</div>}
    </div>
  );
}

/* -------------------------------- Segmented ------------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex w-full gap-1 rounded-[10px] border border-app bg-sunken p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-[7px] font-medium transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-ring",
              size === "sm" ? "px-2.5 py-1.5 text-[11.5px]" : "px-3 py-2 text-[12.5px]",
              active
                ? "bg-surface text-app shadow-[var(--shadow-sm)]"
                : "text-app-muted hover:text-app-secondary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- Progress -------------------------------- */

export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  className,
}: {
  value: number;
  max?: number;
  tone?: "accent" | "success" | "warning";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-accent";
  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-sunken", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]", bg)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------------------------------- Modal --------------------------------- */

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px] animate-fade-in-up"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "panel-elevated relative w-full overflow-hidden shadow-[var(--shadow-lg)] outline-none animate-scale-in",
          width,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* --------------------------------- KeyCap --------------------------------- */

export function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-[5px] border border-app bg-sunken px-1.5 font-mono-num text-[10px] font-medium text-app-muted">
      {children}
    </kbd>
  );
}

/* --------------------------------- Callout -------------------------------- */

export function Callout({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: "neutral" | "accent" | "warning" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "border-app bg-sunken",
    accent: "border-accent/25 bg-accent/[0.06]",
    warning: "border-warning/30 bg-warning/[0.07]",
    danger: "border-danger/30 bg-danger/[0.07]",
    success: "border-success/30 bg-success/[0.07]",
  };
  const rules = {
    neutral: "bg-[var(--text-muted)]",
    accent: "bg-accent",
    warning: "bg-warning",
    danger: "bg-danger",
    success: "bg-success",
  };
  return (
    <div className={cn("relative overflow-hidden rounded-[var(--radius-md)] border p-4 pl-5", tones[tone], className)}>
      <span className={cn("absolute inset-y-0 left-0 w-[2px]", rules[tone])} aria-hidden="true" />
      {title && <div className="mb-1 text-[13px] font-semibold text-app">{title}</div>}
      <div className="text-[12.5px] leading-relaxed text-app-secondary">{children}</div>
    </div>
  );
}
