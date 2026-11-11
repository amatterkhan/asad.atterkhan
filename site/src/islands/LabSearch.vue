<script setup lang="ts">
import { computed, ref } from "vue";
import Ledger from "../components/Ledger.vue";
import PixelIcon from "../components/PixelIcon.vue";
import type { LabEntry } from "../lib/lab-index";
const { entries, scoped = false } = defineProps<{ entries: LabEntry[]; devPreview?: boolean; scoped?: boolean }>();
const query = ref("");
// Titles, summaries, kinds and tags are searched at once. Article text comes from /search.json,
// fetched the first time someone types, so the page itself stays light. Without it (dev, offline)
// the search simply covers less. Pagefind was weighed and not adopted: see docs/decisions/0007.
const bodies = ref<Record<string, string>>({});
let fetched = false;
const loadBodies = () => {
  if (fetched) return;
  fetched = true;
  fetch("/search.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((all: { slug: string; searchText: string }[]) => (bodies.value = Object.fromEntries(all.map((a) => [a.slug, a.searchText.toLowerCase()]))))
    .catch(() => {});
};
const found = computed(() => {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    const text = `${e.title} ${e.summary ?? ""} ${e.tags.join(" ")} ${e.kind ?? ""}`.toLowerCase();
    const body = bodies.value[e.slug] ?? "";
    return words.every((w) => text.includes(w) || body.includes(w));
  });
});
</script>
<template>
  <div class="search lab-search">
    <label class="sr-only" for="lab-search">Find a note</label>
    <input id="lab-search" v-model="query" type="search" :placeholder="scoped ? 'Search this list…' : 'Search the whole lab…'" @focus="loadBodies" @input="loadBodies" />
  </div>
  <p class="sr-only" role="status">{{ found.length }} {{ found.length === 1 ? "entry" : "entries" }}</p>
  <Ledger v-if="found.length" :entries="found" />
  <div v-else class="empty ledger-empty">
    <h2>{{ entries.length ? "No matching notes." : scoped ? "Nothing here yet." : "The notebook is open." }}</h2>
    <p>
      {{
        entries.length
          ? "Try a different search."
          : scoped
            ? "Entries filed here will appear in this list."
            : "This is where my experiments, technical notes, and longer write-ups will live. The first published notes are still on the way."
      }}
    </p>
    <button v-if="entries.length > 0" @click="query = ''">Clear search</button>
    <a v-else-if="scoped" class="empty-link" href="/lab"><PixelIcon name="arrowLeft" /> Back to the Lab</a>
  </div>
</template>
