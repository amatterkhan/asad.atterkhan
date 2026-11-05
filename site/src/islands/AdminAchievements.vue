<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { slugify, type AchievementKind, type AchievementsState, type Api } from "./admin-types";
// Certifications, badges and awards for /achievements. Up to six can be pinned to the Experience
// page; they show there in the order listed under "Pinned".
const { api } = defineProps<{ api: Api }>();
const MAX_PINS = 6;
const KINDS: { id: AchievementKind; label: string }[] = [
  { id: "certification", label: "Certification" },
  { id: "badge", label: "Badge" },
  { id: "award", label: "Award" },
];
type Item = { key: number; id: string; kind: AchievementKind; title: string; issuer: string; link: string; earnedAt: string };
let keys = 0;
const items = ref<Item[] | null>(null);
const pins = ref<string[]>([]);
const updatedAt = ref<string>();
const note = ref("");
const dirty = ref(false);
const touch = () => (dirty.value = true);

const load = (s: AchievementsState) => {
  items.value = s.achievements.map((a) => ({ key: keys++, id: a.id, kind: a.kind, title: a.title, issuer: a.issuer, link: a.link, earnedAt: a.earnedAt ?? "" }));
  pins.value = [...s.featuredIds];
  updatedAt.value = s.updatedAt;
  dirty.value = false;
};
onMounted(() => api<AchievementsState>("/api/admin/achievements").then(load, (e: Error) => (note.value = e.message)));

const move = (list: unknown[], i: number, by: number) => {
  const j = i + by;
  if (j < 0 || j >= list.length) return;
  list.splice(j, 0, ...list.splice(i, 1));
  touch();
};
const byId = (id: string) => items.value!.find((a) => a.id === id);
const pinned = computed(() => pins.value.map(byId).filter((a): a is Item => !!a));
const togglePin = (a: Item) => {
  pins.value = pins.value.includes(a.id) ? pins.value.filter((id) => id !== a.id) : [...pins.value, a.id];
  touch();
};
const add = () => {
  items.value!.unshift({ key: keys++, id: "", kind: "certification", title: "", issuer: "", link: "https://", earnedAt: "" });
  touch();
};
const remove = (i: number) => {
  const gone = items.value![i];
  pins.value = pins.value.filter((id) => id !== gone.id);
  items.value!.splice(i, 1);
  touch();
};

const problem = computed(() => {
  for (const a of items.value ?? []) {
    if (!a.title.trim() || !a.issuer.trim()) return "Every achievement needs a title and an issuer.";
    if (!/^https:\/\/[^\s/]+/.test(a.link.trim())) return "Credential links must start with https://.";
  }
  return "";
});
const save = async () => {
  if (problem.value) return void (note.value = problem.value);
  note.value = "Saving…";
  try {
    // a new achievement gets its id from its title, once; pins follow the id
    const taken = new Set(items.value!.map((a) => a.id).filter(Boolean));
    const ids = new Map<Item, string>();
    for (const a of items.value!) {
      if (a.id) continue;
      const base = slugify(a.title).slice(0, 60).replace(/-+$/, "") || "achievement";
      let id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
      taken.add(id);
      ids.set(a, id);
    }
    const body: AchievementsState = {
      achievements: items.value!.map((a) => ({
        id: a.id || ids.get(a)!,
        kind: a.kind,
        title: a.title.trim(),
        issuer: a.issuer.trim(),
        link: a.link.trim(),
        ...(a.earnedAt ? { earnedAt: a.earnedAt } : {}),
      })),
      featuredIds: pins.value,
    };
    load(await api<AchievementsState>("/api/admin/achievements", { method: "PUT", body: JSON.stringify(body) }));
    note.value = "Saved.";
  } catch (e) {
    note.value = (e as Error).message;
  }
};
</script>
<template>
  <p v-if="!items" class="admin-status" role="status">{{ note || "Loading…" }}</p>
  <form v-else class="admin-form admin-experience" @submit.prevent="save">
    <fieldset>
      <legend>Pinned on Experience <small>{{ pins.length }} of {{ MAX_PINS }}</small></legend>
      <p v-if="!pinned.length" class="admin-status">Nothing pinned. Pin up to {{ MAX_PINS }} below.</p>
      <ol v-else class="admin-pins">
        <li v-for="(a, i) in pinned" :key="a.key">
          <span class="grow">{{ a.title || "Untitled" }} <small>{{ a.issuer }}</small></span>
          <button type="button" :disabled="i === 0" aria-label="Move pin up" @click="move(pins, i, -1)">↑</button>
          <button type="button" :disabled="i === pinned.length - 1" aria-label="Move pin down" @click="move(pins, i, 1)">↓</button>
          <button type="button" @click="togglePin(a)">Unpin</button>
        </li>
      </ol>
    </fieldset>

    <button type="button" class="admin-add" @click="add">+ Add achievement</button>

    <fieldset v-for="(a, i) in items" :key="a.key" class="admin-lab-section">
      <legend>{{ a.title || "New achievement" }}</legend>
      <div class="admin-lab-order">
        <button type="button" :disabled="i === 0" aria-label="Move achievement up" @click="move(items, i, -1)">↑</button>
        <button type="button" :disabled="i === items.length - 1" aria-label="Move achievement down" @click="move(items, i, 1)">↓</button>
        <button type="button" class="danger" @click="remove(i)">Remove</button>
      </div>
      <div class="admin-row">
        <label class="grow"><span>Title</span><input v-model="a.title" maxlength="200" @input="touch" /></label>
        <label class="grow"><span>Issuer</span><input v-model="a.issuer" maxlength="160" @input="touch" /></label>
      </div>
      <label class="line"><span>Credential link</span><input v-model="a.link" type="url" maxlength="500" @input="touch" /></label>
      <div class="admin-row">
        <label class="grow">
          <span>Type</span>
          <select v-model="a.kind" @change="touch"><option v-for="k in KINDS" :key="k.id" :value="k.id">{{ k.label }}</option></select>
        </label>
        <label class="grow"><span>Earned (optional)</span><input v-model="a.earnedAt" type="date" @input="touch" /></label>
      </div>
      <label class="admin-check">
        <input type="checkbox" :checked="pins.includes(a.id)" :disabled="!a.id || (!pins.includes(a.id) && pins.length >= MAX_PINS)" @change="togglePin(a)" />
        <span>{{ a.id ? "Pin to Experience" : "Save first to pin" }}</span>
      </label>
    </fieldset>

    <div class="admin-actions">
      <button class="primary" :disabled="!dirty">Save</button>
      <span class="admin-status" role="status">{{ note || problem || (dirty ? "Unsaved changes." : updatedAt ? `Saved ${new Date(updatedAt).toLocaleString()}` : "") }}</span>
    </div>
  </form>
</template>
