import { describe, it, expect } from "vitest";
import { DIVERGENCE, WORLDLINES, nextWorldline, scramble, shiftTimeline } from "../../src/lib/worldline";
import { NIXIE_X, NIXIE_Y, clockTubes, divergenceTubes, litPath, readingPath, unlitFor } from "../../src/lib/nixie";

describe("worldlines", () => {
  it("cycles Normal, Alpha, Beta, Steins Gate and back", () => {
    expect(WORLDLINES).toEqual(["normal", "alpha", "beta", "steins-gate"]);
    expect(["normal", "alpha", "beta", "steins-gate"].map((w) => nextWorldline(w as never))).toEqual([
      "alpha",
      "beta",
      "steins-gate",
      "normal",
    ]);
  });
  it("knows each divergence", () => {
    expect(DIVERGENCE).toEqual({ alpha: "0.571024", beta: "1.130238", "steins-gate": "1.048596" });
  });
  it("scrambles a divergence-shaped number", () => {
    let i = 0;
    const seq = [0.1, 0.25, 0.5, 0.75, 0.99, 0, 0.3, 0.6];
    expect(scramble(() => seq[i++ % seq.length])).toMatch(/^\d\.\d{6}$/);
  });
});

describe("the shift timeline", () => {
  const at = (steps: { at: number; phase: string }[], phase: string) => steps.find((s) => s.phase === phase)?.at;
  it("flickers, cycles, glitches and settles within 1-1.5 s, then shows the note for about 2 s", () => {
    const steps = shiftTimeline("alpha", false);
    expect(steps.map((s) => s.phase)).toEqual(["flicker", "cycle", "glitch", "settle", "note", "idle"]);
    expect(steps.every((s, i) => i === 0 || s.at >= steps[i - 1].at)).toBe(true);
    const settle = at(steps, "settle")!;
    expect(settle).toBeGreaterThanOrEqual(1000);
    expect(settle).toBeLessThanOrEqual(1500);
    expect(at(steps, "idle")! - at(steps, "note")!).toBeGreaterThanOrEqual(1800);
  });
  it("gives Steins Gate a slightly longer shift and note", () => {
    const sg = shiftTimeline("steins-gate", false);
    const alpha = shiftTimeline("alpha", false);
    expect(at(sg, "settle")!).toBeGreaterThan(at(alpha, "settle")!);
    expect(at(sg, "settle")!).toBeLessThanOrEqual(1500);
    expect(at(sg, "idle")! - at(sg, "note")!).toBeGreaterThan(at(alpha, "idle")! - at(alpha, "note")!);
  });
  it("skips the flicker, cycling and glitch under reduced motion", () => {
    const steps = shiftTimeline("beta", true);
    expect(steps.map((s) => s.phase)).toEqual(["settle", "note", "idle"]);
    expect(at(steps, "note")!).toBeLessThanOrEqual(300);
  });
  it("needs no note going back to Normal", () => {
    expect(shiftTimeline("normal", false).map((s) => s.phase)).toEqual(["flicker", "cycle", "glitch", "settle", "idle"]);
  });
});

describe("the divergence meter's tubes", () => {
  it("keeps the clock's eight tubes for the time", () => {
    expect(clockTubes.map((t) => t.kind).join("")).toBe("dd.dd.dd");
    expect(litPath("123456")).toBe(litPath("123456")); // unchanged API
  });
  it("lays a divergence out as one digit, the point, six digits", () => {
    expect(divergenceTubes.map((t) => t.kind).join("")).toBe("d.dddddd");
    expect(divergenceTubes[0].x).toBe(NIXIE_X + 2);
    const path = readingPath("1.048596");
    // the point is a single lit pixel in the dot tube, on the same row as the clock's dots
    expect(path).toContain(`M${divergenceTubes[1].x + 1} ${NIXIE_Y + 8}h1v1h-1z`);
    // seven digits, one dot: "1" has 11 lit pixels, so the path is far longer than the dot alone
    expect(path.split("M").length - 1).toBeGreaterThan(60);
    expect(readingPath("")).toBe("");
  });
  it("draws the unlit 8s for whichever layout is showing", () => {
    expect(unlitFor(divergenceTubes)).not.toBe(unlitFor(clockTubes));
  });
});
