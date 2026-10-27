// @vitest-environment happy-dom
import { it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import LabSearch from "../../src/islands/LabSearch.vue";
it("filters seeded Lab articles and clears filters", async () => {
  // Article text arrives from /search.json on first input
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [{ slug: "investigation", searchText: "Forensic evidence" }] })));
  const wrapper = mount(LabSearch, {
    props: {
      articles: [
        {
          title: "Investigation",
          description: "A security note",
          slug: "investigation",
          tags: ["security"],
          shelf: { section: "writeups", sectionName: "Writeups", icon: "flag", category: "ctf", categoryName: "CTF" },
          thumb: "/lab-media/0123456789abcdef.webp",
          featured: false,
          publishedAt: "2025-01-01",
          readingMinutes: 1,
        },
      ],
    },
  });
  const input = wrapper.get("input");
  await input.setValue("forensic");
  await flushPromises();
  expect(wrapper.findAll("article")).toHaveLength(1);
  expect(wrapper.get("article img").attributes("src")).toBe("/lab-media/0123456789abcdef.webp");
  expect(wrapper.get(".lab-card-shelf").text()).toBe("Writeups · CTF");
  await input.setValue("ctf");
  expect(wrapper.findAll("article")).toHaveLength(1);
  await input.setValue("no-such-note");
  expect(wrapper.findAll("article")).toHaveLength(0);
  await wrapper
    .findAll("button")
    .find((b) => b.text() === "Clear search")!
    .trigger("click");
  expect((input.element as HTMLInputElement).value).toBe("");
  expect(wrapper.findAll("article")).toHaveLength(1);
  wrapper.unmount();
  vi.unstubAllGlobals();
});
