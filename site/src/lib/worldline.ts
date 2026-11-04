// Worldlines: the homepage room's hidden Easter egg. Pressing the divergence meter (the Nixie clock)
// shifts the room Normal → Alpha → Beta → Steins Gate → Normal. Nothing is saved; a reload is Normal.
export type Worldline = "normal" | "alpha" | "beta" | "steins-gate";
export const WORLDLINES: Worldline[] = ["normal", "alpha", "beta", "steins-gate"];
export const DIVERGENCE: Record<Exclude<Worldline, "normal">, string> = {
  alpha: "0.571024",
  beta: "1.130238",
  "steins-gate": "1.048596",
};
export const nextWorldline = (w: Worldline): Worldline => WORLDLINES[(WORLDLINES.indexOf(w) + 1) % WORLDLINES.length];

/** What the meter's description says about where the room is now. */
export const worldlineLabel = (w: Worldline) =>
  w === "normal" ? "Normal worldline" : `${{ alpha: "Alpha", beta: "Beta", "steins-gate": "Steins Gate" }[w]} worldline, divergence ${DIVERGENCE[w]}`;

/** A random divergence-shaped number for the tubes to cycle through: "d.dddddd". */
export const scramble = (rand = Math.random) => {
  const d = () => String(Math.floor(rand() * 10) % 10);
  return `${d()}.${Array.from({ length: 6 }, d).join("")}`;
};

export type ShiftPhase = "flicker" | "cycle" | "glitch" | "settle" | "note" | "idle";
/**
 * When each phase of a shift starts, in ms from the press. The digits flicker, cycle, the room glitches
 * (a spatial jolt, never a flash), the new worldline settles at 1-1.5 s, then the note shows for about
 * 2 s. Steins Gate takes a little longer. Reduced motion skips straight to a short fade.
 */
export function shiftTimeline(to: Worldline, reduced: boolean): { at: number; phase: ShiftPhase }[] {
  const special = to === "steins-gate";
  const noteMs = special ? 2600 : 2000;
  const steps: { at: number; phase: ShiftPhase }[] = reduced
    ? [{ at: 0, phase: "settle" }]
    : [
        { at: 0, phase: "flicker" },
        { at: 240, phase: "cycle" },
        { at: special ? 900 : 760, phase: "glitch" },
        { at: special ? 1300 : 1060, phase: "settle" },
      ];
  const settle = steps.at(-1)!.at;
  // the atmosphere fades in for 300 ms before the note appears
  if (to === "normal") steps.push({ at: settle + 300, phase: "idle" });
  else steps.push({ at: settle + (reduced ? 300 : 200), phase: "note" }, { at: settle + (reduced ? 300 : 200) + noteMs, phase: "idle" });
  return steps;
}
