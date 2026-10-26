"use client";
import { useEffect, useRef } from "react";

// A pixel circle on a 13x13 grid: matches the dotted-notebook background.
const N = 13;
const cells: [number, number][] = [];
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 6, y - 6);
    if (d > 4.6 && d < 6.1) cells.push([x, y]);
  }

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("has-cursor");
    let mx = -100, my = -100, rx = -100, ry = -100, raf = 0;
    const move = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const t = e.target as Element | null;
      root.dataset.cursor = t?.closest("input,textarea")
        ? "text"
        : t?.closest("a,button,summary,label,[role=button]")
          ? "link"
          : "";
      dot.current?.style.setProperty("transform", `translate(${mx}px,${my}px)`);
    };
    const down = () => (root.dataset.press = "1");
    const up = () => delete root.dataset.press;
    const leave = () => (root.dataset.cursor = "out");
    const loop = () => {
      rx += (mx - rx) * (reduce ? 1 : 0.2);
      ry += (my - ry) * (reduce ? 1 : 0.2);
      ring.current?.style.setProperty("transform", `translate(${rx}px,${ry}px)`);
      raf = requestAnimationFrame(loop);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerdown", down);
    addEventListener("pointerup", up);
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);
    return () => {
      root.classList.remove("has-cursor");
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
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
