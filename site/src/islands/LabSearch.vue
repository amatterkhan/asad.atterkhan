<script setup lang="ts">
import { computed, ref } from "vue";
import { date } from "../lib/site";
type Entry = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  publishedAt?: string;
  readingMinutes: number;
  searchText: string;
};
const { articles, devPreview = false } = defineProps<{ articles: Entry[]; devPreview?: boolean }>();
const query = ref("");
const tag = ref("All");
const tags = computed(() => ["All", ...new Set(articles.flatMap((a) => [...a.tags, ...(a.category ? [a.category] : [])]))]);
const found = computed(() =>
  articles.filter(
    (a) =>
      (tag.value === "All" || a.tags.includes(tag.value) || a.category === tag.value) &&
      `${a.title} ${a.description} ${a.tags} ${a.searchText}`.toLowerCase().includes(query.value.toLowerCase()),
  ),
);
const showPreview = computed(() => !articles.length && !query.value && devPreview);
const clear = () => {
  query.value = "";
  tag.value = "All";
};
</script>
<template>
  <div class="search">
    <label class="sr-only" for="lab-search">Find a note</label>
    <input id="lab-search" v-model="query" type="search" placeholder="Search the notebook…" />
  </div>
  <div v-if="tags.length > 1" class="filters" role="group" aria-label="Writing topics">
    <button v-for="t in tags" :key="t" :aria-pressed="tag === t" @click="tag = t">{{ t }}</button>
  </div>
  <p class="sr-only" role="status">{{ found.length }} articles</p>
  <article v-for="a in found" :key="a.slug" class="entry">
    <div class="meta">
      <time :datetime="a.publishedAt">{{ date(a.publishedAt!) }}</time>
      <br />
      {{ a.readingMinutes }} min read
    </div>
    <div>
      <h2><a :href="`/lab/${a.slug}`">{{ a.title }}</a></h2>
      <p>{{ a.description }}</p>
      <div class="tags">{{ a.tags.join(" · ") }}</div>
    </div>
  </article>
  <div v-if="showPreview" class="local-drafts">
    <p class="draft-label">LOCAL PREVIEW · NOT PUBLISHED</p>
    <article class="entry lab-entry">
      <div class="project-mark" aria-hidden="true">
        <span>&gt;_</span>
        <small>Markdown</small>
      </div>
      <div>
        <h2><a href="/preview/reading-layout">A notebook needs room for the details →</a></h2>
        <p>An unpublished layout sample with code, tables, diagrams, and technical notes.</p>
        <div class="tag-list">
          <span>Draft</span>
          <span>Code</span>
          <span>Notes</span>
        </div>
      </div>
    </article>
    <p class="quiet-note">No published notes yet. This sample is only available in local development.</p>
  </div>
  <div v-if="!found.length && !showPreview" class="empty">
    <h2>{{ articles.length ? "No matching notes." : "The notebook is open." }}</h2>
    <p>
      {{
        articles.length
          ? "Try a different search or topic."
          : "This is where my experiments, technical notes, and longer write-ups will live. The first published notes are still on the way."
      }}
    </p>
    <button v-if="articles.length > 0" @click="clear">Clear filters</button>
  </div>
</template>
