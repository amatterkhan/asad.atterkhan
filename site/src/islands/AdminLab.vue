<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import PixelIcon from "../components/PixelIcon.vue";
import { SECTION_ICONS } from "../lib/icons";
import { slugify, type Api, type LabMap, type LabSection, type Summary } from "./admin-types";
// The Lab map: the sections visitors browse (/lab/section/<id>) and the categories inside each.
// Ids are part of URLs and of every article filed under them, so they are fixed once saved; names,
// blurbs, icons and order can change freely. The last section also catches unfiled articles.
const { api } = defineProps<{ api: Api }>();
type Editable = LabSection & { key: number; saved: boolean; newCategory: string };
let keys = 0;
const sections = ref<Editable[] | null>(null);
const articles = ref<Summary[]>([]);
const updatedAt = ref<string>();
const note = ref("");
const dirty = ref(false);

const load = (map: LabMap) => {
  sections.value = map.sections.map((s) => ({ ...s, categories: s.categories.map((c) => ({ ...c })), key: keys++, saved: true, newCategory: "" }));
  updatedAt.value = map.updatedAt;
  dirty.value = false;
};
onMounted(async () => {
  try {
    load(await api<LabMap>("/api/admin/lab"));
    articles.value = (await api<{ articles: Summary[] }>("/api/admin/articles")).articles;
  } catch (e) {
    note.value = (e as Error).message;
  }
});
const lastId = computed(() => sections.value?.at(-1)?.id);
// An article counts for the section it names, or for the last one when that section is unknown.
const usage = (id: string) =>
  articles.value.filter((a) => (sections.value!.some((s) => s.id === a.section) ? a.section === id : id === lastId.value)).length;
const usageOf = (s: Editable, cat: string) => articles.value.filter((a) => a.section === s.id && a.category === cat).length;

const touch = () => (dirty.value = true);
const rename = (s: Editable, name: string) => {
  s.name = name;
  if (!s.saved) s.id = slugify(name).slice(0, 40);
  touch();
};
const move = <T,>(list: T[], i: number, by: number) => {
  const j = i + by;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  touch();
};
const addSection = () => {
  sections.value!.push({ id: "", name: "", blurb: "", icon: "notebook", categories: [], key: keys++, saved: false, newCategory: "" });
  touch();
};
const removeSection = (i: number) => {
  const s = sections.value![i];
  const n = usage(s.id);
  if (n && !confirm(`${n} article${n === 1 ? "" : "s"} use “${s.name}”. They will move to the last section until you refile them. Remove it?`)) return;
  sections.value!.splice(i, 1);
  touch();
};
const addCategory = (s: Editable) => {
  const name = s.newCategory.trim();
  const id = slugify(name).slice(0, 40);
  if (!name || !id) return;
  if (s.categories.some((c) => c.id === id)) {
    note.value = `“${s.name}” already has a category called ${name}.`;
    return;
  }
  s.categories.push({ id, name });
  s.newCategory = "";
  touch();
};
const removeCategory = (s: Editable, i: number) => {
  const c = s.categories[i];
  const n = usageOf(s, c.id);
  if (n && !confirm(`${n} article${n === 1 ? "" : "s"} use “${c.name}”. They stay in “${s.name}” without a category. Remove it?`)) return;
  s.categories.splice(i, 1);
  touch();
};

const problem = computed(() => {
  const list = sections.value ?? [];
  if (!list.length) return "Keep at least one section.";
  if (list.some((s) => !s.name.trim() || !s.id)) return "Every section needs a name.";
  if (new Set(list.map((s) => s.id)).size !== list.length) return "Two sections have the same id.";
  return "";
});
const save = async () => {
  if (problem.value) return void (note.value = problem.value);
  note.value = "Saving…";
  try {
    const body = { sections: sections.value!.map(({ id, name, blurb, icon, categories }) => ({ id, name, blurb, icon, categories })) };
    load(await api<LabMap>("/api/admin/lab", { method: "PUT", body: JSON.stringify(body) }));
    note.value = "Saved. The Lab updates when the site rebuild finishes.";
  } catch (e) {
    note.value = (e as Error).message;
  }
};
</script>
<template>
  <p v-if="!sections" class="admin-status" role="status">{{ note || "Loading the Lab map…" }}</p>
  <form v-else class="admin-form admin-lab" @submit.prevent="save">
    <p class="admin-lede">
      Visitors browse The Lab by these sections, then by category. They show in this order; the last section also holds
      articles without one.
    </p>
    <fieldset v-for="(s, i) in sections" :key="s.key" class="admin-lab-section">
      <legend><PixelIcon :name="s.icon as never" /> {{ s.name || "New section" }}</legend>
      <div class="admin-lab-order">
        <button type="button" :disabled="i === 0" aria-label="Move section up" @click="move(sections, i, -1)">↑</button>
        <button type="button" :disabled="i === sections.length - 1" aria-label="Move section down" @click="move(sections, i, 1)">↓</button>
        <button type="button" class="danger" @click="removeSection(i)">Remove</button>
      </div>
      <div class="admin-row">
        <label class="grow"><span>Name</span><input :value="s.name" maxlength="40" required @input="rename(s, ($event.target as HTMLInputElement).value)" /></label>
        <label>
          <span>Address</span>
          <output class="admin-lab-id">/lab/section/{{ s.id || "…" }}</output>
        </label>
      </div>
      <label><span>Blurb</span><input v-model="s.blurb" maxlength="200" @input="touch" /></label>
      <div class="admin-lab-icons" role="radiogroup" :aria-label="`Icon for ${s.name || 'new section'}`">
        <label v-for="icon in SECTION_ICONS" :key="icon" :class="{ 'is-picked': s.icon === icon }" :title="icon">
          <input v-model="s.icon" type="radio" :name="`icon-${s.key}`" :value="icon" @change="touch" />
          <PixelIcon :name="icon" />
        </label>
      </div>
      <div class="admin-lab-cats">
        <span class="admin-lab-label">Categories <small>{{ usage(s.id) }} article{{ usage(s.id) === 1 ? "" : "s" }} in this section</small></span>
        <ul v-if="s.categories.length">
          <li v-for="(c, j) in s.categories" :key="c.id">
            <input v-model="c.name" maxlength="40" :aria-label="`Name of ${c.id}`" required @input="touch" />
            <small>{{ c.id }} · {{ usageOf(s, c.id) }}</small>
            <button type="button" :disabled="j === 0" aria-label="Move up" @click="move(s.categories, j, -1)">↑</button>
            <button type="button" :disabled="j === s.categories.length - 1" aria-label="Move down" @click="move(s.categories, j, 1)">↓</button>
            <button type="button" aria-label="Remove category" @click="removeCategory(s, j)"><PixelIcon name="close" /></button>
          </li>
        </ul>
        <div class="admin-lab-add">
          <input v-model="s.newCategory" maxlength="40" placeholder="New category, e.g. Hack The Box" aria-label="New category" @keydown.enter.prevent="addCategory(s)" />
          <button type="button" :disabled="!s.newCategory.trim()" @click="addCategory(s)">Add</button>
        </div>
      </div>
    </fieldset>
    <button type="button" class="admin-lab-new" :disabled="sections.length >= 12" @click="addSection">+ Add a section</button>
    <div class="admin-actions">
      <button class="primary" :disabled="!dirty">Save Lab map</button>
      <span class="admin-status" role="status">{{ note || problem || (dirty ? "Unsaved changes." : updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Showing the default map.") }}</span>
    </div>
  </form>
</template>
