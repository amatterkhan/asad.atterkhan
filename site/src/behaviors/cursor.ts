const LINKISH = "a,button,summary,label,[role=button]";
const PAD = 6;

/** Dot + pixel ring that follows the pointer; over a link it snaps into a bracket box around it. */
export function initCursor() {
  if (!matchMedia("(pointer: fine)").matches) return;
  const root = document.documentElement;
  const dot = document.querySelector<HTMLElement>(".cursor-dot");
  const ring = document.querySelector<HTMLElement>(".cursor-ring");
  const box = document.querySelector<HTMLElement>(".cursor-box");
  if (!dot || !ring || !box) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("has-cursor");
  let mx = -100,
    my = -100,
    rx = -100,
    ry = -100;
  let target: Element | null = null;
  const frame = () => {
    if (!target) return;
    const r = target.getBoundingClientRect();
    const s = box.style;
    s.left = `${r.left - PAD}px`;
    s.top = `${r.top - PAD}px`;
    s.width = `${r.width + PAD * 2}px`;
    s.height = `${r.height + PAD * 2}px`;
  };
  addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    const t = e.target as Element | null;
    const link = t?.closest?.(LINKISH) ?? null;
    // the room's hotspots draw their own brackets; data-cursor="plain" opts out (Storm)
    target = link && !link.classList.contains("spot") && !link.matches("[data-cursor=plain]") ? link : null;
    root.dataset.cursor = t?.closest?.("input,textarea") ? "text" : target ? "box" : link ? "link" : "";
    frame();
    dot.style.transform = `translate(${mx}px,${my}px)`;
  });
  addEventListener("pointerdown", () => (root.dataset.press = "1"));
  addEventListener("pointerup", () => delete root.dataset.press);
  addEventListener("scroll", frame, { passive: true });
  document.addEventListener("pointerleave", () => (root.dataset.cursor = "out"));
  const loop = () => {
    rx += (mx - rx) * (reduce ? 1 : 0.28);
    ry += (my - ry) * (reduce ? 1 : 0.28);
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
