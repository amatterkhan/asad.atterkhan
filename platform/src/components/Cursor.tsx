"use client";
import { useEffect, useRef } from "react";

// A pixel circle on a 13x13 grid: matches the dotted-notebook background.
const N = 13;
const cells: [number, number][] = [];
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 6, y - 6);
    if (d > 4.9 && d < 6.1) cells.push([x, y]); // a one-pixel ring
  }

const LINKISH = "a,button,summary,label,[role=button]";
const PAD = 6;

/** Dot + pixel ring that follows the pointer; over a link it snaps into a bracket box around it. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("has-cursor");
    let mx = -100, my = -100, rx = -100, ry = -100, raf = 0;
    let target: Element | null = null;
    const frame = () => {
      if (!target || !box.current) return;
      const r = target.getBoundingClientRect();
      const s = box.current.style;
      s.left = `${r.left - PAD}px`;
      s.top = `${r.top - PAD}px`;
      s.width = `${r.width + PAD * 2}px`;
      s.height = `${r.height + PAD * 2}px`;
    };
    const move = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const t = e.target as Element | null;
      const link = t?.closest(LINKISH);
      // the room's hotspots draw their own brackets; data-cursor="plain" opts out (Storm)
      target = link && !link.classList.contains("spot") && !link.matches("[data-cursor=plain]") ? link : null;
      root.dataset.cursor = t?.closest("input,textarea") ? "text" : target ? "box" : link ? "link" : "";
      frame();
      dot.current?.style.setProperty("transform", `translate(${mx}px,${my}px)`);
    };
    const down = () => (root.dataset.press = "1");
    const up = () => delete root.dataset.press;
    const leave = () => (root.dataset.cursor = "out");
    const loop = () => {
      rx += (mx - rx) * (reduce ? 1 : 0.28);
      ry += (my - ry) * (reduce ? 1 : 0.28);
      ring.current?.style.setProperty("transform", `translate(${rx}px,${ry}px)`);
      raf = requestAnimationFrame(loop);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerdown", down);
    addEventListener("pointerup", up);
    addEventListener("scroll", frame, { passive: true });
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);
    return () => {
      root.classList.remove("has-cursor");
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      removeEventListener("scroll", frame);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor-box" ref={box} />
      <div className="cursor-ring" ref={ring}>
        <svg viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges">
          {cells.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
          ))}
        </svg>
      </div>
      <div className="cursor-dot" ref={dot}>
        <span />
      </div>
    </div>
  );
}
