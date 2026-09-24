import React, { useEffect, useState } from "react";
import { useApp, type ViewId } from "../../state/AppState";
import { cn } from "../../utils/cn";
import { KeyCap, StatusBadge, Tooltip } from "../primitives";

/* ============================================================================
   SHELL
   Grouped navigation, a quiet header, and honest state: what is loaded,
   how far the run has progressed, and whether the work is saved.
   ========================================================================== */

type NavItem = { id: ViewId; label: string; icon: React.ReactNode; needsAnalysis?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      { id: "home", label: "Home", icon: <IconHome /> },
      { id: "new-analysis", label: "New Analysis", icon: <IconPlus /> },
      { id: "history", label: "History", icon: <IconClock /> },
    ],
  },
  {
    title: "Measurement",
    items: [
      { id: "analyze", label: "Analyze", icon: <IconScan />, needsAnalysis: true },
      { id: "fields", label: "Fields", icon: <IconGrid />, needsAnalysis: true },
      { id: "results", label: "Results", icon: <IconChart />, needsAnalysis: true },
      { id: "reports", label: "Reports", icon: <IconDoc />, needsAnalysis: true },
      { id: "validation", label: "Validation", icon: <IconCheck /> },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "methodology", label: "Methodology", icon: <IconBook /> },
      { id: "jury", label: "Explain", icon: <IconSpark /> },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items).concat({
  id: "settings",
  label: "Settings",
  icon: <IconGear />,
});

const TARGET_FIELDS = 30;

export function Shell({
  children,
  onOpenPalette,
}: {
  children: React.ReactNode;
  onOpenPalette?: () => void;
}) {
  const { state } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => setDrawerOpen(false), [state.view]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-app text-app">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-app bg-surface transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)] lg:flex",
          collapsed ? "w-[76px]" : "w-[244px]",
        )}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[88] lg:hidden">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-fade-in-up"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-[268px] max-w-[82vw] flex-col border-r border-app bg-surface shadow-[var(--shadow-lg)] animate-fade-in-up">
            <SidebarContent collapsed={false} onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenPalette={onOpenPalette} onOpenDrawer={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1320px] px-5 py-7 sm:px-7 lg:px-9">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* --------------------------------- Sidebar -------------------------------- */

function SidebarContent({
  collapsed,
  onToggleCollapse,
  onClose,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}) {
  const { state, dispatch } = useApp();
  const analysis = state.currentAnalysis;
  const hasAnalysis = !!analysis;
  const savedFields = analysis?.fields.filter((f) => f.savedAt).length ?? 0;

  const navigate = (id: ViewId) => {
    dispatch({ type: "SET_VIEW", view: id });
    onClose?.();
  };

  return (
    <>
      {/* Wordmark */}
      <div className={cn("flex h-[68px] shrink-0 items-center gap-3 border-b border-app", collapsed ? "justify-center px-3" : "px-5")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-app-strong bg-sunken text-app">
          <IconLogo />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-semibold tracking-[-0.02em] text-app">Ferrite Analyzer</div>
            <div className="truncate text-[10px] font-medium tracking-[0.14em] text-app-muted">ASTM E562</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-3" : "px-3")} aria-label="Main">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? "mt-6" : undefined}>
            {!collapsed && (
              <div className="px-3 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-app-muted">
                {group.title}
              </div>
            )}
            {collapsed && gi > 0 && <div className="mx-2 mb-3 h-px bg-[var(--border)]" aria-hidden="true" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  active={state.view === item.id}
                  locked={!!item.needsAnalysis && !hasAnalysis}
                  onSelect={() => navigate(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Run progress */}
      {hasAnalysis && !collapsed && (
        <div className="mx-3 mb-3 rounded-[var(--radius-md)] border border-app bg-sunken p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">Progress</span>
            <span className="font-mono-num text-[11px] text-app-secondary">
              {savedFields}/{TARGET_FIELDS}
            </span>
          </div>
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]",
                savedFields >= TARGET_FIELDS ? "bg-success" : "bg-accent",
              )}
              style={{ width: `${Math.min(100, (savedFields / TARGET_FIELDS) * 100)}%` }}
            />
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-app-muted">
            {savedFields >= TARGET_FIELDS
              ? "Enough fields for a formal confidence interval."
              : `${TARGET_FIELDS - savedFields} more fields for a formal 95% CI.`}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-app p-3">
        <NavButton
          item={{ id: "settings", label: "Settings", icon: <IconGear /> }}
          collapsed={collapsed}
          active={state.view === "settings"}
          locked={false}
          onSelect={() => navigate("settings")}
        />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "mt-1 flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-[12.5px] text-app-muted transition-colors duration-200 hover:bg-hoverfill hover:text-app focus-ring",
              collapsed && "justify-center px-0",
            )}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className={cn("shrink-0 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]", collapsed && "rotate-180")}
              aria-hidden="true"
            >
              <path d="M14 8l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="mt-1 flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-[12.5px] text-app-muted transition-colors hover:bg-hoverfill hover:text-app focus-ring"
          >
            Close menu
          </button>
        )}
      </div>
    </>
  );
}

function NavButton({
  item,
  collapsed,
  active,
  locked,
  onSelect,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const button = (
    <button
      onClick={onSelect}
      disabled={locked}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-[9px] py-2.5 text-[12.5px] font-medium transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-ring",
        collapsed ? "justify-center px-0" : "px-3",
        locked
          ? "cursor-not-allowed text-app-muted opacity-40"
          : active
            ? "bg-hoverfill text-app"
            : "text-app-secondary hover:bg-hoverfill hover:text-app",
      )}
    >
      {/* Active marker: a single hairline tick, not a heavy fill */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--ink)] transition-[opacity,transform] duration-400 ease-[cubic-bezier(.22,1,.36,1)]",
          active ? "opacity-100" : "scale-y-50 opacity-0",
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "shrink-0 transition-transform duration-400 ease-[cubic-bezier(.22,1,.36,1)]",
          !locked && "group-hover:scale-[1.08]",
        )}
      >
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && locked && <IconLock />}
    </button>
  );

  if (locked) {
    return <Tooltip content="Start or open an analysis to unlock this step." side="bottom">{button}</Tooltip>;
  }
  if (collapsed) {
    return <Tooltip content={item.label} side="bottom">{button}</Tooltip>;
  }
  return button;
}

/* ---------------------------------- Header -------------------------------- */

function Header({
  onOpenPalette,
  onOpenDrawer,
}: {
  onOpenPalette?: () => void;
  onOpenDrawer: () => void;
}) {
  const { state, dispatch } = useApp();
  const analysis = state.currentAnalysis;
  const savedFields = analysis?.fields.filter((f) => f.savedAt).length ?? 0;
  const isMac = typeof navigator !== "undefined" && /Mac|iP(hone|ad)/.test(navigator.platform || navigator.userAgent);

  return (
    <header className="glass sticky top-0 z-40 flex h-[68px] shrink-0 items-center gap-4 border-0 border-b border-app px-5 sm:px-7 lg:px-9">
      <button
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-app-secondary transition-colors hover:bg-hoverfill hover:text-app focus-ring lg:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      {/* Breadcrumb: section, then the thing being worked on */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">{navLabel(state.view)}</span>
          {analysis?.locked && <StatusBadge status="WARNING" label="Locked" />}
          {analysis?.competitionMode && <StatusBadge status="NEUTRAL" label="Competition" />}
        </div>
        <div className="mt-0.5 truncate text-[14px] font-medium tracking-[-0.015em] text-app">
          {analysis ? analysis.sample.sampleId || "Untitled sample" : "No active analysis"}
        </div>
      </div>

      {/* Live run stats */}
      {analysis && (
        <div className="hidden items-center gap-5 md:flex">
          <HeaderStat label="Fields" value={String(savedFields)} />
          <HeaderStat label="Status" value={analysis.status} />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Command palette trigger */}
        {onOpenPalette && (
          <button
            onClick={onOpenPalette}
            className="hidden h-9 items-center gap-2 rounded-[9px] border border-app bg-surface px-2.5 text-[12px] text-app-muted transition-[border-color,color,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-px hover:border-app-strong hover:text-app focus-ring sm:flex"
            aria-label="Open command palette"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
            <span className="hidden lg:inline">Search</span>
            <span className="flex items-center gap-0.5">
              <KeyCap>{isMac ? "⌘" : "Ctrl"}</KeyCap>
              <KeyCap>K</KeyCap>
            </span>
          </button>
        )}

        <Tooltip content="All processing happens on this device. Nothing is uploaded." side="bottom">
          <span className="hidden items-center gap-1.5 rounded-full border border-app px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-app-muted xl:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" /> Local only
          </span>
        </Tooltip>

        <Tooltip content={state.prefs.theme === "dark" ? "Light appearance" : "Dark appearance"} side="bottom">
          <button
            onClick={() =>
              dispatch({ type: "SET_PREFS", prefs: { theme: state.prefs.theme === "dark" ? "light" : "dark" } })
            }
            className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-app bg-surface text-app-secondary transition-[border-color,color,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-px hover:border-app-strong hover:text-app focus-ring"
            aria-label="Toggle appearance"
          >
            {state.prefs.theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </Tooltip>
      </div>
    </header>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-app-muted">{label}</div>
      <div className="mt-0.5 font-mono-num text-[13px] text-app">{value}</div>
    </div>
  );
}

function navLabel(view: ViewId): string {
  return ALL_ITEMS.find((n) => n.id === view)?.label ?? view;
}

/* ---------------------------------- Icons --------------------------------- */

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M3.5 11L12 4.5l8.5 6.5" />
      <path d="M5.5 10v9.5h13V10" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  );
}
function IconScan() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 8.5V5.5A1.5 1.5 0 015.5 4h3M20 8.5V5.5A1.5 1.5 0 0018.5 4h-3M4 15.5v3A1.5 1.5 0 005.5 20h3M20 15.5v3A1.5 1.5 0 0118.5 20h-3" />
      <path d="M4.5 12h15" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.33h16M4 14.67h16M9.33 4v16M14.67 4v16" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4.5 19.5V11M12 19.5V5M19.5 19.5v-6" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M7 3.5h6.5L18 8v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4.5a1 1 0 011-1z" />
      <path d="M13.5 3.5V8H18M9 13h6M9 16.5h4" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-4.9" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4.5 5.5A1.5 1.5 0 016 4h5v16H6a1.5 1.5 0 01-1.5-1.5v-13z" />
      <path d="M19.5 5.5A1.5 1.5 0 0018 4h-5v16h5a1.5 1.5 0 001.5-1.5v-13z" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M12 4l1.7 4.8L18.5 10.5 13.7 12.2 12 17l-1.7-4.8L5.5 10.5l4.8-1.7L12 4z" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" {...stroke} className="ml-auto shrink-0" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 017 0v3" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
    </svg>
  );
}
