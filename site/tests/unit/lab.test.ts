// @vitest-environment happy-dom
import { it, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import LabSearch from "../../src/islands/LabSearch.vue";
import { tagCounts, tagSlug, toLabEntry } from "../../src/lib/lab-index";

const base = {
  slug: "investigation",
  title: "Investigation",
  description: "A security note",
  publishedAt: "2025-01-01",
  readingMinutes: 1,
  status: "published",
  tags: ["security"],
  shelf: { sectionName: "Writeups", categoryName: "CTF" },
};

it("filters the ledger by text, body text and kind, and clears the search", async () => {
  // Article text arrives from /search.json on first input
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [{ slug: "investigation", searchText: "Forensic evidence" }] })));
  const wrapper = mount(LabSearch, { props: { entries: [toLabEntry(base)] } });
  const input = wrapper.get("input");
  await input.setValue("forensic");
  await flushPromises();
  expect(wrapper.findAll(".ledger li")).toHaveLength(1);
  expect(wrapper.get(".ledger-meta b").text()).toBe("Writeups / CTF");
  await input.setValue("ctf");
  expect(wrapper.findAll(".ledger li")).toHaveLength(1);
  await input.setValue("no-such-note");
  expect(wrapper.findAll(".ledger li")).toHaveLength(0);
  await wrapper
    .findAll("button")
    .find((b) => b.text() === "Clear search")!
    .trigger("click");
  expect((input.element as HTMLInputElement).value).toBe("");
  expect(wrapper.findAll(".ledger li")).toHaveLength(1);
  wrapper.unmount();
  vi.unstubAllGlobals();
});

it("builds ledger rows and tag links", () => {
  expect(tagSlug("Active Directory")).toBe("active-directory");
  expect(tagSlug("C++ / Rust")).toBe("c-rust");
  expect(toLabEntry({ ...base, status: "archived" })).toMatchObject({ href: "/lab/investigation", flag: "Archived" });
  expect(toLabEntry(base, true)).toMatchObject({ href: "/preview/investigation", flag: "Draft" });
  expect(toLabEntry(base).flag).toBeUndefined();
  expect(tagCounts([{ tags: ["Web", "xss"] }, { tags: ["web"] }, { tags: ["web", "Web"] }])).toEqual([
    { slug: "web", label: "Web", count: 3 },
    { slug: "xss", label: "xss", count: 1 },
  ]);
});
