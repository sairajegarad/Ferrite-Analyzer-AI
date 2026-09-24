import { Modal, KeyCap } from "./primitives";

/** Keyboard reference sheet, opened with "?" from anywhere in the app. */

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "Global",
    items: [
      { keys: ["⌘", "K"], label: "Open the command palette" },
      { keys: ["?"], label: "Show this shortcut sheet" },
      { keys: ["N"], label: "Start a new analysis" },
      { keys: ["T"], label: "Switch light / dark appearance" },
      { keys: ["Esc"], label: "Close any overlay" },
    ],
  },
  {
    title: "Point counting",
    items: [
      { keys: ["1"], label: "Classify point as ferrite" },
      { keys: ["2"], label: "Classify point as boundary (counts as ½)" },
      { keys: ["3"], label: "Classify point as matrix" },
      { keys: ["←", "→"], label: "Move between grid points" },
    ],
  },
  {
    title: "Wizard",
    items: [
      { keys: ["⌘", "→"], label: "Next step" },
      { keys: ["⌘", "←"], label: "Previous step" },
    ],
  },
];

export function Shortcuts({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="shortcuts-title" width="max-w-[520px]">
      <div className="flex items-start justify-between gap-4 border-b border-app px-6 py-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-app-muted">Reference</div>
          <h2 id="shortcuts-title" className="mt-1.5 text-[18px] font-semibold text-app">
            Keyboard shortcuts
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-app-muted transition-colors hover:bg-hoverfill hover:text-app focus-ring"
        >
          <svg width="11" height="11" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M1 1l8 8M9 1L1 9" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
        {GROUPS.map((g, gi) => (
          <div key={g.title} className={gi > 0 ? "mt-6" : undefined}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">{g.title}</div>
            <div className="mt-2.5 space-y-0.5">
              {g.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-[8px] px-2 py-2 transition-colors duration-150 hover:bg-hoverfill"
                >
                  <span className="text-[12.5px] leading-snug text-app-secondary">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k) => (
                      <KeyCap key={k}>{k}</KeyCap>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
