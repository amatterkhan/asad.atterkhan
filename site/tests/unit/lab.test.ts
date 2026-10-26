// @vitest-environment happy-dom
import { it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LabSearch from "../../src/islands/LabSearch.vue";
it("filters seeded Lab articles and clears filters", async () => {
  const wrapper = mount(LabSearch, {
    props: {
      articles: [
        {
          title: "Investigation",
          description: "A security note",
          slug: "investigation",
          tags: ["security"],
          publishedAt: "2025-01-01",
          readingMinutes: 1,
          searchText: "forensic evidence",
        },
      ],
    },
  });
  const input = wrapper.get("input");
  await input.setValue("forensic");
  expect(wrapper.findAll("article")).toHaveLength(1);
  await input.setValue("no-such-note");
  expect(wrapper.findAll("article")).toHaveLength(0);
  await wrapper
    .findAll("button")
    .find((b) => b.text() === "Clear filters")!
    .trigger("click");
  expect((input.element as HTMLInputElement).value).toBe("");
  expect(wrapper.findAll("article")).toHaveLength(1);
  wrapper.unmount();
});
