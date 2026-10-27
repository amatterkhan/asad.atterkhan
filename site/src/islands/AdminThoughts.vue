<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import PixelIcon from "../components/PixelIcon.vue";
import { slugify, type Api, type ThoughtContext, type ThoughtLine, type ThoughtsState } from "./admin-types";
// Asad's Thoughts: the one-liners he now and then says in the homepage room. Each has a context that
// decides when it may come up; one can be featured, said first on each visit. Saving rebuilds the site.
const { api } = defineProps<{ api: Api }>();
const CONTEXTS: { id: ThoughtContext; label: string }[] = [
  { id: "general", label: "Any time" },
  { id: "night", label: "At night" },
  { id: "storm", label: "With Storm nearby" },
  { id: "steins-gate", label: "In Steins Gate" },
];
type Editable = ThoughtLine & { key: number };
let keys = 0;
const lines = ref<Editable[] | null>(null);
const featured = ref<string | null>(null);
const updatedAt = ref<string>();
const note = ref("");
const dirty = ref(false);
const draft = ref("");
const draftContext = ref<ThoughtContext>("general");
const previewing = ref<number | null>(null);

const load = (s: ThoughtsState) => {
  lines.value = s.thoughts.map((t) => ({ ...t, key: keys++ }));
  featured.value = s.featured;
  updatedAt.value = s.updatedAt;
  dirty.value = false;
};
onMounted(() => api<ThoughtsState>("/api/admin/thoughts").then(load, (e: Error) => (note.value = e.message)));
const touch = () => (dirty.value = true);
const on = computed(() => lines.value?.filter((t) => t.enabled).length ?? 0);

// A new line's id comes from its text once, and then stays (a featured pick refers to it).
const add = () => {
  const text = draft.value.trim();
  if (!text) return;
  // ids are slugs of at most 40 characters, so leave room for a "-2" and never end on a dash
  const base = slugify(text).slice(0, 36).replace(/-+$/, "") || "thought";
  let id = base;
  for (let n = 2; lines.value!.some((t) => t.id === id); n++) id = `${base}-${n}`;
  lines.value!.push({ id, text, enabled: true, context: draftContext.value, key: keys++ });
  draft.value = "";
  touch();
};
const remove = (i: number) => {
  if (lines.value![i].id === featured.value) featured.value = null;
  lines.value!.splice(i, 1);
  touch();
};

const problem = computed(() => {
  const list = lines.value ?? [];
  if (list.some((t) => !t.text.trim())) return "Every Thought needs some words.";
  if (list.length > 60) return "Keep it to 60 Thoughts.";
  return "";
});
const save = async () => {
  if (problem.value) return void (note.value = problem.value);
  note.value = "Saving…";
  try {
    const body = { thoughts: lines.value!.map(({ id, text, enabled, context }) => ({ id, text: text.trim(), enabled, context })), featured: featured.value };
    load(await api<ThoughtsState>("/api/admin/thoughts", { method: "PUT", body: JSON.stringify(body) }));
    note.value = "Saved. Asad says the new lines once the site rebuild finishes.";
  } catch (e) {
    note.value = (e as Error).message;
  }
};
</script>
<template>
  <p v-if="!lines" class="admin-status" role="status">{{ note || "Loading Asad's Thoughts…" }}</p>
  <form v-else class="admin-form admin-thoughts" @submit.prevent="save">
    <p class="admin-lede">
      Now and then Asad says one of these in the homepage room. Lines for night, Storm or Steins Gate only come up then;
      switched-off lines never do. With every line off, he says nothing.
    </p>
    <fieldset>
      <legend>Featured</legend>
      <label class="admin-check">
        <input v-model="featured" type="radio" name="featured" :value="null" @change="touch" />
        <span>None: pick at random</span>
      </label>
      <small class="admin-status">A featured Thought is the first one Asad says on each visit, when its context fits.</small>
    </fieldset>
    <fieldset>
      <legend>Thoughts <small>{{ on }} on · {{ lines.length - on }} off</small></legend>
      <ul class="admin-thought-list">
        <li v-for="(t, i) in lines" :key="t.key" :class="{ 'is-off': !t.enabled }">
          <label class="admin-check" :title="t.enabled ? 'On' : 'Off'">
            <input v-model="t.enabled" type="checkbox" :aria-label="`Say “${t.text}”`" @change="touch" />
          </label>
          <input v-model="t.text" class="grow" maxlength="80" required :aria-label="`Words of ${t.id}`" @input="touch" />
          <select v-model="t.context" :aria-label="`When “${t.text}” comes up`" @change="touch">
            <option v-for="c in CONTEXTS" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
          <label class="admin-check" title="Featured">
            <input v-model="featured" type="radio" name="featured" :value="t.id" :aria-label="`Feature “${t.text}”`" @change="touch" />
            <PixelIcon name="medal" />
          </label>
          <button type="button" :aria-pressed="previewing === t.key" @click="previewing = previewing === t.key ? null : t.key">Preview</button>
          <button type="button" :aria-label="`Remove “${t.text}”`" @click="remove(i)"><PixelIcon name="close" /></button>
          <p v-if="previewing === t.key" class="admin-thought-preview"><span class="thought-preview">{{ t.text || "…" }}</span></p>
        </li>
      </ul>
      <div class="admin-lab-add">
        <input v-model="draft" maxlength="80" placeholder="A new Thought, e.g. Reality is an edge case." aria-label="New Thought" @keydown.enter.prevent="add" />
        <select v-model="draftContext" aria-label="When the new Thought comes up">
          <option v-for="c in CONTEXTS" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
        <button type="button" :disabled="!draft.trim() || lines.length >= 60" @click="add">Add</button>
      </div>
    </fieldset>
    <div class="admin-actions">
      <button class="primary" :disabled="!dirty">Save Thoughts</button>
      <span class="admin-status" role="status">{{ note || problem || (dirty ? "Unsaved changes." : updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Showing the starting set.") }}</span>
    </div>
  </form>
</template>
