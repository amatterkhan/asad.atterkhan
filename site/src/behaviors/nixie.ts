import { clockLabel, litPath, mauritiusTime } from "../lib/nixie";

/** Ticks the Nixie clocks in page vignettes (the homepage room runs its own), only while the tab is visible. */
export function initNixie() {
  const clocks = document.querySelectorAll<SVGSVGElement>("svg[data-nixie]");
  if (!clocks.length) return;
  let last = "";
  const tick = () => {
    if (document.hidden) return;
    const time = mauritiusTime();
    if (time === last) return;
    last = time;
    clocks.forEach((svg) => {
      svg.querySelector("path")?.setAttribute("d", litPath(time));
      svg.setAttribute("aria-label", clockLabel(time));
    });
  };
  tick();
  setInterval(tick, 1000);
  document.addEventListener("visibilitychange", tick);
}
