// What Asad does when he stops typing. Mostly coffee or a think, as before; now and then a glance
// toward the window (more often when Storm is over there); rarely, after a long stretch of work, a
// stretch; and once in a while he gets up and walks to the window for a look outside.
export type Pause = "coffee" | "idle" | "look" | "stretch" | "walk";
/** At least this long since his last stretch before he stretches again. */
export const STRETCH_GAP_MS = 180_000;
/** At least this long since he last got up (or since the room appeared) before he walks again. */
export const WALK_GAP_MS = 150_000;

export function nextPause(rand: number, sinceStretchMs: number, stormByWindow: boolean, sinceWalkMs = 0): Pause {
  if (sinceStretchMs >= STRETCH_GAP_MS && rand < 0.12) return "stretch";
  if (rand >= 0.12 && rand < (stormByWindow ? 0.42 : 0.24)) return "look";
  if (sinceWalkMs >= WALK_GAP_MS && rand >= 0.88) return "walk";
  return rand < 0.7 ? "coffee" : "idle";
}
