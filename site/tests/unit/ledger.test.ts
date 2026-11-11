import { describe, expect, it } from "vitest";
import { groupByYear } from "../../src/lib/ledger";

describe("ledger", () => {
  it("sorts newest first and groups by year", () => {
    const years = groupByYear([
      { href: "/a", date: "2025-12-19", title: "A" },
      { href: "/b", date: "2026-10-12T09:00:00Z", title: "B" },
      { href: "/c", date: "2026-01-04", title: "C" },
      { href: "/d", date: "2026-09-30", title: "D" },
    ]);
    expect(years.map((y) => y.year)).toEqual([2026, 2025]);
    expect(years[0].entries.map((e) => e.title)).toEqual(["B", "D", "C"]);
    expect(years[0].entries.map((e) => e.day)).toEqual(["12 Oct", "30 Sep", "4 Jan"]);
  });

  it("uses the UTC year, so an entry does not change year with the build machine's time zone", () => {
    expect(groupByYear([{ href: "/a", date: "2025-12-31T23:30:00Z", title: "A" }])[0].year).toBe(2025);
  });

  it("does not reorder the caller's array", () => {
    const entries = [
      { href: "/a", date: "2025-01-01", title: "A" },
      { href: "/b", date: "2026-01-01", title: "B" },
    ];
    groupByYear(entries);
    expect(entries[0].title).toBe("A");
  });
});
