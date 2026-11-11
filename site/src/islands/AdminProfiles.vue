<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import PixelIcon from "../components/PixelIcon.vue";
import { profileView } from "../lib/profiles";
import { isHttpsUrl } from "../lib/safe-url";
import type { Profile, ProfileKind } from "../lib/schemas";
import { slugify, type Api, type ProfilesState } from "./admin-types";
// The places Asad can be found: the links on Home and in the menu. A link's icon is recognised from its
// address (Hack The Box, TryHackMe, HackerOne, Bugcrowd and more), so "Other" needs only the link.
// With the list empty, nothing is shown. Saving rebuilds the site.
const { api } = defineProps<{ api: Api }>();
const KINDS: { id: ProfileKind; label: string; hint: string }[] = [
  { id: "github", label: "GitHub", hint: "https://github.com/…" },
  { id: "linkedin", label: "LinkedIn", hint: "https://linkedin.com/in/…" },
  { id: "email", label: "Email", hint: "name@example.com" },
  { id: "website", label: "Website", hint: "https://…" },
  { id: "other", label: "Other", hint: "https://app.hackthebox.com/…" },
];
const hintFor = (k: ProfileKind) => KINDS.find((x) => x.id === k)!.hint;
type Editable = Profile & { key: number };
let keys = 0;
const rows = ref<Editable[] | null>(null);
const updatedAt = ref<string>();
const note = ref("");
const dirty = ref(false);
const draftKind = ref<ProfileKind>("other");
const draft = ref("");

const load = (s: ProfilesState) => {
  rows.value = s.profiles.map((p) => ({ ...p, key: keys++ }));
  updatedAt.value = s.updatedAt;
  dirty.value = false;
};
onMounted(() => api<ProfilesState>("/api/admin/profiles").then(load, (e: Error) => (note.value = e.message)));
const touch = () => (dirty.value = true);
const view = (p: Profile) => profileView(p);
const EMAIL = /^[^\s@<>"'\\:]+@[^\s@<>"'\\]+\.[^\s@<>"'\\]+$/;
const valid = (p: Pick<Profile, "kind" | "value">) => (p.kind === "email" ? EMAIL.test(p.value.trim()) : isHttpsUrl(p.value.trim()));

const add = () => {
  const value = draft.value.trim();
  if (!value || !valid({ kind: draftKind.value, value })) return void (note.value = draftKind.value === "email" ? "That is not an email address." : "Links start with https://.");
  const base = slugify(draftKind.value).slice(0, 30) || "link";
  let id = base;
  for (let n = 2; rows.value!.some((p) => p.id === id); n++) id = `${base}-${n}`;
  rows.value!.push({ id, kind: draftKind.value, value, label: "", key: keys++ });
  draft.value = "";
  note.value = "";
  touch();
};
const remove = (i: number) => {
  rows.value!.splice(i, 1);
  touch();
};
const problem = computed(() => {
  const list = rows.value ?? [];
  if (list.length > 12) return "Keep it to 12 links.";
  const bad = list.find((p) => !valid(p));
  return bad ? `${view(bad).label || "A link"} needs ${bad.kind === "email" ? "an email address" : "an https:// link"}.` : "";
});
const save = async () => {
  if (problem.value) return void (note.value = problem.value);
  note.value = "Saving…";
  try {
    const body = { profiles: rows.value!.map(({ id, kind, value, label }) => ({ id, kind, value: value.trim(), label: label.trim() })) };
    load(await api<ProfilesState>("/api/admin/profiles", { method: "PUT", body: JSON.stringify(body) }));
    note.value = "Saved.";
  } catch (e) {
    note.value = (e as Error).message;
  }
};
</script>
<template>
  <p v-if="!rows" class="admin-status" role="status">{{ note || "Loading profile links…" }}</p>
  <form v-else class="admin-form admin-profiles" @submit.prevent="save">
    <p class="admin-lede">
      Where people can find Asad. Links appear on Home and in the phone menu. Paste a link under “Other” and the icon is picked
      from the address; the page shows the platform’s name unless you give it a label. With no links, nothing is shown.
    </p>
    <fieldset>
      <legend>Links <small>{{ rows.length }} of 12</small></legend>
      <ul class="admin-profile-list">
        <li v-for="(p, i) in rows" :key="p.key">
          <span class="admin-profile-icon" :title="view(p).label"><PixelIcon :name="view(p).icon" /></span>
          <select v-model="p.kind" :aria-label="`Kind of link ${i + 1}`" @change="touch">
            <option v-for="k in KINDS" :key="k.id" :value="k.id">{{ k.label }}</option>
          </select>
          <input v-model="p.value" class="grow" maxlength="300" required :placeholder="hintFor(p.kind)" :aria-label="`Address of link ${i + 1}`" @input="touch" />
          <input v-model="p.label" maxlength="40" :placeholder="view(p).label" :aria-label="`Label of link ${i + 1}`" @input="touch" />
          <button type="button" :aria-label="`Remove ${view(p).label}`" @click="remove(i)"><PixelIcon name="close" /></button>
        </li>
      </ul>
      <div class="admin-lab-add">
        <select v-model="draftKind" aria-label="Kind of the new link">
          <option v-for="k in KINDS" :key="k.id" :value="k.id">{{ k.label }}</option>
        </select>
        <input v-model="draft" maxlength="300" :placeholder="hintFor(draftKind)" aria-label="Address of the new link" @keydown.enter.prevent="add" />
        <button type="button" :disabled="!draft.trim() || rows.length >= 12" @click="add">Add</button>
      </div>
    </fieldset>
    <div class="admin-actions">
      <button class="primary" :disabled="!dirty">Save links</button>
      <span class="admin-status" role="status">{{ note || problem || (dirty ? "Unsaved changes." : updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "") }}</span>
    </div>
  </form>
</template>
