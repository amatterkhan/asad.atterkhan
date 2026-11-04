// @vitest-environment happy-dom
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { scramblePage, shuffleUnsettled } from "../../src/lib/scramble";

const letters = (s: string) => [...s].sort().join("");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("only trades unsettled letters among themselves", () => {
  const word = [..."worldline"];
  const settled = word.map((_, i) => i < 3);
  for (let k = 0; k < 20; k++) {
    const out = shuffleUnsettled(word, settled, Math.random);
    expect(out.slice(0, 3).join("")).toBe("wor");
    expect(letters(out.join(""))).toBe(letters("worldline"));
  }
});

it("rearranges each word's own letters, then puts the exact text back", () => {
  document.body.innerHTML = `<main><h1>Hey, I'm Asad.</h1><p>Somewhere between cloud nine and layer seven.</p></main>`;
  const before = document.body.innerHTML;
  const p = document.querySelector("p")!;
  scramblePage(document.body, { ms: 800, inView: () => true });
  vi.advanceTimersByTime(120);
  const mid = p.textContent!;
  expect(mid).not.toBe("Somewhere between cloud nine and layer seven.");
  // the same words, each with its own letters (spaces and widths stay put)
  expect(mid.split(" ").map(letters)).toEqual("Somewhere between cloud nine and layer seven.".split(" ").map(letters));
  vi.advanceTimersByTime(800);
  expect(document.body.innerHTML).toBe(before);
});

it("leaves islands, code, screen-reader text and off-screen text alone, and stops on demand", () => {
  document.body.innerHTML = `<div data-island="Room"><p>Storm supervises</p></div><code>make check</code><span class="sr-only">Divergence meter</span><p id="off">Occasionally here</p><p id="on">Running experiments on reality</p>`;
  const stop = scramblePage(document.body, { ms: 800, inView: (el) => el.id !== "off" });
  vi.advanceTimersByTime(60);
  expect(document.querySelector("[data-island] p")!.textContent).toBe("Storm supervises");
  expect(document.querySelector("code")!.textContent).toBe("make check");
  expect(document.querySelector(".sr-only")!.textContent).toBe("Divergence meter");
  expect(document.getElementById("off")!.textContent).toBe("Occasionally here");
  expect(document.getElementById("on")!.textContent).not.toBe("Running experiments on reality");
  stop();
  expect(document.getElementById("on")!.textContent).toBe("Running experiments on reality");
});
