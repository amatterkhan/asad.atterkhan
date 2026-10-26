<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Api, SiteCopyForm } from "./admin-types";
const { api } = defineProps<{ api: Api }>();
const GROUPS: { title: string; fields: [string, string, "line" | "text" | "markdown"][] }[] = [
  { title: "Who", fields: [["role", "Role", "line"], ["company", "Company", "line"], ["location", "Location", "line"]] },
  { title: "Hero", fields: [["heroTitle", "Title", "line"], ["heroLede", "Lead sentence", "text"], ["heroBody", "Paragraph", "text"]] },
  {
    title: "Room and closing",
    fields: [["roomHint", "Caption under the room", "line"], ["closingTitle", "Closing title", "line"], ["closingBody", "Closing text (before the email)", "text"]],
  },
  {
    title: "Page intros",
    fields: [["labIntro", "The Lab", "text"], ["workbenchIntro", "Workbench", "text"], ["experienceIntro", "Experience", "text"], ["achievementsIntro", "Achievements", "text"]],
  },
  { title: "About", fields: [["aboutBody", "About page (Markdown)", "markdown"]] },
];
const copy = ref<SiteCopyForm | null>(null);
const note = ref("");
onMounted(() => api<SiteCopyForm>("/api/admin/site").then((c) => (copy.value = c), (e: Error) => (note.value = e.message)));
const save = async () => {
  note.value = "Saving…";
  try {
    copy.value = await api<SiteCopyForm>("/api/admin/site", { method: "PUT", body: JSON.stringify(copy.value) });
    note.value = "Saved. The site rebuilds with it in a minute or two.";
  } catch (e) {
    note.value = (e as Error).message;
  }
};
</script>
<template>
  <p v-if="!copy" class="admin-status">{{ note || "Loading site copy…" }}</p>
  <form v-else class="admin-form" @submit.prevent="save">
    <fieldset v-for="g in GROUPS" :key="g.title">
      <legend>{{ g.title }}</legend>
      <label v-for="[key, label, kind] in g.fields" :key="key" :class="kind">
        <span>{{ label }}</span>
        <input v-if="kind === 'line'" v-model="copy[key]" maxlength="600" />
        <textarea v-else v-model="copy[key]" :rows="kind === 'markdown' ? 12 : 3" :maxlength="kind === 'markdown' ? 8000 : 600" />
      </label>
    </fieldset>
    <div class="admin-actions">
      <button class="primary">Save site copy</button>
      <span class="admin-status" role="status">{{ note }}{{ copy.updatedAt ? ` · last saved ${new Date(copy.updatedAt).toLocaleString()}` : "" }}</span>
    </div>
  </form>
</template>
