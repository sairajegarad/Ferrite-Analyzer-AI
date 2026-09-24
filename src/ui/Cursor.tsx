import { useEffect, useRef } from "react";

/**
 * Custom pointer for fine-pointer devices.
 *
 * A precision dot tracks the pointer exactly; a hairline ring trails it with
 * spring-like easing and changes shape based on what is underneath:
 *
 *   default    hairline ring
 *   hover      ring expands + tints on anything clickable
 *   text       ring dissolves, dot becomes a caret
 *   precision  ring squares into a reticle over measurement surfaces
 *   label      optional caption via data-cursor-label="…"
 *
 * Falls back to the native cursor on touch/coarse pointers, when the user
 * turns it off in Settings, or if this component never mounts.
 */

const INTERACTIVE =
  'a[href], button, [role="button"], [role="tab"], summary, label.cursor-pointer, .cursor-pointer, [data-cursor="hover"]';
const TEXT_INPUT = 'input:not([type="range"]):not([type="file"]):not([type="checkbox"]), textarea, [contenteditable="true"]';
const PRECISION = '[data-cursor="precision"]';

type State = "default" | "hover" | "text" | "precision";

export function Cursor({ enabled, reduceMotion }: { enabled: boolean; reduceMotion: boolean }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const layer = layerRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const cross = crossRef.current;
    const label = labelRef.current;
    if (!layer || !dot || !ring || !cross || !label) return;

    const root = document.documentElement;
    root.classList.add("has-cursor");

    // Pointer position (exact) and the trailing ring position (eased).
    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    let rx = px;
    let ry = py;
    let raf = 0;
    let state: State = "default";
    let labelText = "";
    let visible = false;

    // A lower factor gives the ring more "weight"; 1 disables the lag entirely.
    const follow = reduceMotion ? 1 : 0.18;

    const setState = (next: State) => {
      if (next === state) return;
      state = next;
      layer.dataset.state = next;
    };

    const setLabel = (next: string) => {
      if (next === labelText) return;
      labelText = next;
      label.textContent = next;
      layer.dataset.label = next ? "true" : "false";
    };

    const render = () => {
      rx += (px - rx) * follow;
      ry += (py - ry) * follow;
      const rounded = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
      dot.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
      ring.style.transform = rounded;
      cross.style.transform = rounded;
      label.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0) translate(-50%, 30px)`;
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;

      if (!visible) {
        visible = true;
        layer.dataset.hidden = "false";
      }

      const target = e.target as Element | null;
      if (!target || typeof target.closest !== "function") return;

      // Pointer-tracked sheen for cards and buttons that opt in.
      const sheen = target.closest<HTMLElement>(".sheen");
      if (sheen) {
        const r = sheen.getBoundingClientRect();
        sheen.style.setProperty("--mx", `${e.clientX - r.left}px`);
        sheen.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      const precision = target.closest(PRECISION);
      const interactive = target.closest(INTERACTIVE);
      const text = target.closest(TEXT_INPUT);

      if (interactive) setState("hover");
      else if (text) setState("text");
      else if (precision) setState("precision");
      else setState("default");

      const labelled = target.closest<HTMLElement>("[data-cursor-label]");
      setLabel(labelled?.dataset.cursorLabel ?? "");
    };

    const onDown = () => {
      layer.dataset.pressed = "true";
    };
    const onUp = () => {
      layer.dataset.pressed = "false";
    };
    const onLeave = () => {
      visible = false;
      layer.dataset.hidden = "true";
    };
    const onEnter = () => {
      visible = true;
      layer.dataset.hidden = "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      root.classList.remove("has-cursor");
    };
  }, [enabled, reduceMotion]);

  if (!enabled) return null;

  return (
    <div ref={layerRef} className="cursor-layer" data-state="default" data-hidden="true" aria-hidden="true">
      <div ref={ringRef} className="cursor-ring" />
      <div ref={crossRef} className="cursor-cross">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={labelRef} className="cursor-label" />
    </div>
  );
}
