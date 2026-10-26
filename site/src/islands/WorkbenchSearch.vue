<script setup lang="ts">
import { computed, ref } from "vue";
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
</script>
<template>
  <div class="search notebook-search">
    <label class="sr-only" for="workbench-search">Find a project</label>
    <input id="workbench-search" v-model="query" type="search" placeholder="Search projects…" />
  </div>
  <p class="collection-count" role="status">{{ found.length }} {{ found.length === 1 ? "project" : "projects" }}</p>
  <article v-for="p in found" :key="p.slug" class="entry project-entry">
    <div>
      <p class="meta">{{ p.categories.join(" · ") }}</p>
      <h2><a :href="`/workbench/${p.slug}`">{{ p.title }}</a></h2>
      <p>{{ p.description }}</p>
      <div class="tag-list">
        <span v-for="t in p.tags" :key="t">{{ t }}</span>
      </div>
    </div>
  </article>
  <div v-if="!found.length" class="empty">
    <h2>No matching projects.</h2>
    <p>Try a title, topic, or technology.</p>
    <button @click="query = ''">Clear search</button>
  </div>
</template>
