// What Asad does when he stops typing. Mostly coffee or a think, as before; now and then a glance
// toward the window (more often when Storm is over there); rarely, after a long stretch of work, a
// stretch.
export type Pause = "coffee" | "idle" | "look" | "stretch";
/** At least this long since his last stretch before he stretches again. */
export const STRETCH_GAP_MS = 180_000;

export function nextPause(rand: number, sinceStretchMs: number, stormByWindow: boolean): Pause {
  if (sinceStretchMs >= STRETCH_GAP_MS && rand < 0.12) return "stretch";
  if (rand >= 0.12 && rand < (stormByWindow ? 0.42 : 0.24)) return "look";
  return rand < 0.7 ? "coffee" : "idle";
}
