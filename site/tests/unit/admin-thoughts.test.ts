// @vitest-environment happy-dom
import { it, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import AdminThoughts from "../../src/islands/AdminThoughts.vue";
import seed from "../../content/thoughts.json";

const setup = () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  const api = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    // the server echoes what it saved
    return init?.body ? { ...JSON.parse(init.body as string), updatedAt: "2026-10-27T12:00:00.000Z" } : structuredClone(seed);
  });
  return { calls, wrapper: mount(AdminThoughts, { props: { api: api as never } }) };
};
const row = (w: ReturnType<typeof setup>["wrapper"], text: string) =>
  w.findAll(".admin-thought-list li").find((li) => (li.find("input:not([type])").element as HTMLInputElement).value === text)!;

it("lists the Thoughts with their contexts, nothing featured", async () => {
  const { wrapper } = setup();
  await flushPromises();
  expect(wrapper.findAll(".admin-thought-list li")).toHaveLength(16);
  expect(wrapper.text()).toContain("16 on · 0 off");
  expect((row(wrapper, "Management is inspecting the premises.").find("select").element as HTMLSelectElement).value).toBe("storm");
  expect((wrapper.get('input[name=featured][type=radio]').element as HTMLInputElement).checked).toBe(true);
  expect(wrapper.get("button.primary").attributes("disabled")).toBeDefined();
});

it("adds, switches off, features, previews and removes, then saves exactly that", async () => {
  const { wrapper, calls } = setup();
  await flushPromises();
  await wrapper.get('input[aria-label="New Thought"]').setValue("  Have you tried turning reality off and on?  ");
  await wrapper.get('select[aria-label="When the new Thought comes up"]').setValue("night");
  await wrapper.findAll(".admin-lab-add button").at(-1)!.trigger("click");
  expect(wrapper.findAll(".admin-thought-list li")).toHaveLength(17);

  await row(wrapper, "Working as unintended.").get("input[type=checkbox]").setValue(false);
  expect(wrapper.text()).toContain("16 on · 1 off");
  await row(wrapper, "Reality is an edge case.").get("input[type=radio]").setValue(true);
  const preview = row(wrapper, "Reality is an edge case.").findAll("button").find((b) => b.text() === "Preview")!;
  await preview.trigger("click");
  expect(wrapper.get(".thought-preview").text()).toBe("Reality is an edge case.");
  await row(wrapper, "Human, allegedly.").get('button[aria-label^="Remove"]').trigger("click");

  await wrapper.get("form").trigger("submit");
  await flushPromises();
  const put = calls.find((c) => c.init?.method === "PUT")!;
  expect(put.path).toBe("/api/admin/thoughts");
  const body = JSON.parse(put.init!.body as string);
  expect(Object.keys(body).sort()).toEqual(["featured", "thoughts"]);
  expect(body.featured).toBe("reality-is-an-edge-case");
  expect(body.thoughts).toHaveLength(16);
  expect(body.thoughts.find((t: { id: string }) => t.id === "human-allegedly")).toBeUndefined();
  expect(body.thoughts.find((t: { id: string }) => t.id === "working-as-unintended").enabled).toBe(false);
  expect(body.thoughts.at(-1)).toEqual({ id: "have-you-tried-turning-reality-off-a", text: "Have you tried turning reality off and on?", enabled: true, context: "night" });
  expect(wrapper.get(".admin-actions [role=status]").text()).toContain("Saved.");
});

it("unfeatures a line when it is removed, and keeps new ids unique and valid", async () => {
  const { wrapper, calls } = setup();
  await flushPromises();
  await row(wrapper, "Trust me. I'm verifying.").get("input[type=radio]").setValue(true);
  await row(wrapper, "Trust me. I'm verifying.").get('button[aria-label^="Remove"]').trigger("click");
  for (let i = 0; i < 2; i++) {
    await wrapper.get('input[aria-label="New Thought"]').setValue("Reality is an edge case.");
    await wrapper.findAll(".admin-lab-add button").at(-1)!.trigger("click");
  }
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  const body = JSON.parse(calls.find((c) => c.init?.method === "PUT")!.init!.body as string);
  expect(body.featured).toBeNull();
  expect(body.thoughts.slice(-2).map((t: { id: string }) => t.id)).toEqual(["reality-is-an-edge-case-2", "reality-is-an-edge-case-3"]);
  // a cut that lands on a space must not leave a trailing dash (the server refuses those ids)
  await wrapper.get('input[aria-label="New Thought"]').setValue("abcdefghij abcdefghij abcdefghij ab x");
  await wrapper.findAll(".admin-lab-add button").at(-1)!.trigger("click");
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  const last = JSON.parse(calls.filter((c) => c.init?.method === "PUT").at(-1)!.init!.body as string).thoughts.at(-1);
  expect(last.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});
