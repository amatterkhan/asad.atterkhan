import { it, expect } from "vitest";
import { STRETCH_GAP_MS, WALK_GAP_MS, nextPause } from "../../src/lib/pose";

const share = (sinceStretch: number, storm: boolean) => {
  const n = 1000;
  const out: Record<string, number> = { coffee: 0, idle: 0, look: 0, stretch: 0 };
  for (let i = 0; i < n; i++) out[nextPause(i / n, sinceStretch, storm)]++;
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v / n]));
};

it("never stretches again too soon", () => {
  expect(share(STRETCH_GAP_MS - 1, false).stretch).toBe(0);
});
it("mostly keeps to coffee and thinking, with an occasional glance and a rarer stretch", () => {
  const s = share(STRETCH_GAP_MS, false);
  expect(s.coffee + s.idle).toBeGreaterThan(0.65);
  expect(s.look).toBeCloseTo(0.12, 2);
  expect(s.stretch).toBeCloseTo(0.12, 2);
});
it("glances toward the window more when Storm is over there", () => {
  expect(share(0, true).look).toBeGreaterThan(share(0, false).look * 2);
});
it("walks to the window only after a long while, and then now and then", () => {
  const n = 1000;
  const walks = (sinceWalk: number) =>
    Array.from({ length: n }, (_, i) => nextPause(i / n, 0, false, sinceWalk)).filter((p) => p === "walk").length / n;
  expect(walks(WALK_GAP_MS - 1)).toBe(0);
  expect(walks(WALK_GAP_MS)).toBeCloseTo(0.2, 2);
  // never by default (the room passes how long it has been)
  expect(Array.from({ length: n }, (_, i) => nextPause(i / n, 0, false)).includes("walk")).toBe(false);
});
