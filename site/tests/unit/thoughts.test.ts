import { describe, it, expect } from "vitest";
import { nextWait, pickThought, readMs, type PublicThought } from "../../src/lib/thoughts";

const t = (id: string, context: PublicThought["context"] = "general"): PublicThought => ({ id, text: `Line ${id}.`, context });
const all = [t("a"), t("b"), t("c"), t("night", "night"), t("storm", "storm"), t("sg", "steins-gate")];
const general = new Set(["general"] as const);

describe("picking a Thought", () => {
  it("only picks lines whose context holds now", () => {
    for (let i = 0; i < 50; i++) expect(["a", "b", "c"]).toContain(pickThought(all, general, undefined, null)!.id);
    const night = new Set(["general", "night"] as const);
    const seen = new Set(Array.from({ length: 200 }, (_, i) => pickThought(all, night, undefined, null, () => (i % 4) / 4)!.id));
    expect(seen).toEqual(new Set(["a", "b", "c", "night"]));
  });
  it("never says the same line twice in a row, unless it is the only one", () => {
    for (let i = 0; i < 50; i++) expect(pickThought(all, general, "b", null)!.id).not.toBe("b");
    expect(pickThought([t("only")], general, "only", null)!.id).toBe("only");
  });
  it("says the featured line first while it is eligible, and only then", () => {
    expect(pickThought(all, general, undefined, "c")!.id).toBe("c");
    // featured but out of context: random instead, the featured line still waits for its turn
    expect(pickThought(all, general, undefined, "night")!.id).not.toBe("night");
    expect(pickThought(all, new Set(["general", "night"] as const), undefined, "night")!.id).toBe("night");
  });
  it("is silent with nothing eligible", () => {
    expect(pickThought([], general, undefined, null)).toBeUndefined();
    expect(pickThought([t("sg", "steins-gate")], general, undefined, null)).toBeUndefined();
  });
});

describe("timing", () => {
  it("keeps a Thought up 4-8 s, longer for longer lines", () => {
    expect(readMs("Hi.")).toBe(4000);
    expect(readMs("Some thoughts are better left running overnight.")).toBeGreaterThan(readMs("Reality is an edge case."));
    expect(readMs("x".repeat(80))).toBe(8000);
  });
  it("waits 20-40 s for the first, then 60-150 s", () => {
    expect(nextWait(false, () => 0)).toBe(20000);
    expect(nextWait(false, () => 0.999999)).toBeLessThanOrEqual(40000);
    expect(nextWait(true, () => 0)).toBe(60000);
    expect(nextWait(true, () => 0.999999)).toBeLessThanOrEqual(150000);
  });
});
