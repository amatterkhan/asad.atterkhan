<script setup lang="ts">
import { computed, ref } from "vue";
import Ledger from "../components/Ledger.vue";
type ProjectEntry = { slug: string; title: string; description: string; tags: string[]; categories: string[] };
const { projects } = defineProps<{ projects: ProjectEntry[] }>();
const query = ref("");
const found = computed(() => {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return projects.filter((p) => {
    const text = `${p.title} ${p.description} ${p.tags.join(" ")} ${p.categories.join(" ")}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
});
// Projects are not a sequence, so they carry no date and no number: the ledger keeps the owner's order.
const rows = computed(() =>
  found.value.map((p) => ({ href: `/workbench/${p.slug}`, title: p.title, summary: p.description, tags: p.tags, kind: p.categories.join(" · ") })),
);
</script>
<template>
  <div class="search notebook-search">
    <label class="sr-only" for="workbench-search">Find a project</label>
    <input id="workbench-search" v-model="query" type="search" placeholder="Search projects…" />
  </div>
  <p class="sr-only" role="status">{{ found.length }} {{ found.length === 1 ? "project" : "projects" }}</p>
  <Ledger v-if="found.length" :entries="rows" :noun="['project', 'projects']" />
  <div v-else class="empty ledger-empty">
    <h2>No matching projects.</h2>
    <p>Try a title, topic, or technology.</p>
    <button @click="query = ''">Clear search</button>
  </div>
</template>
