import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { manifest } from "../../src/lib/manifest";

const css = readFileSync(new URL("../../src/styles/app.css", import.meta.url), "utf8");

describe("sprite animations", () => {
  it("has held-frame keyframes for every frame count in the manifest", () => {
    for (const { frames } of Object.values(manifest.states)) {
      expect(css, `@keyframes sprite-play-${frames}`).toContain(`@keyframes sprite-play-${frames} {`);
    }
  });

  it("keeps steps() and var() out of the looping room animations, which Safari would run on the main thread", () => {
    const loops = css.match(/animation:[^;]*infinite[^;]*;/g) ?? [];
    expect(loops.length).toBeGreaterThan(0);
    for (const rule of loops) expect(rule).not.toMatch(/steps\(/);
    for (const block of css.match(/@keyframes [^{]+\{[^\n]*\}/g) ?? []) expect(block).not.toMatch(/var\(/);
  });
});
