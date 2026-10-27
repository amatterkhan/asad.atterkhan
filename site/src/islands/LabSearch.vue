<script setup lang="ts">
import PixelIcon from "../components/PixelIcon.vue";
import { computed, ref } from "vue";
import { date } from "../lib/site";
import type { ArticleCard } from "../lib/content.server";
const { articles, devPreview = false, scoped = false } = defineProps<{ articles: ArticleCard[]; devPreview?: boolean; scoped?: boolean }>();
const query = ref("");
// Titles, descriptions and tags are searched at once. Article text comes from /search.json, fetched
// the first time someone types, so the page itself stays light. Without it (dev, offline) the
// search simply covers less.
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
  return articles.filter((a) => {
    const text = `${a.title} ${a.description} ${a.tags.join(" ")} ${a.shelf.sectionName} ${a.shelf.categoryName ?? ""}`.toLowerCase();
    const body = bodies.value[a.slug] ?? "";
    return words.every((w) => text.includes(w) || body.includes(w));
  });
});
const showPreview = computed(() => !articles.length && !query.value && devPreview);
const shelfLine = (a: ArticleCard) => [a.shelf.sectionName, a.shelf.categoryName].filter(Boolean).join(" · ");
</script>
<template>
  <div class="search lab-search">
    <label class="sr-only" for="lab-search">Find a note</label>
    <input id="lab-search" v-model="query" type="search" :placeholder="scoped ? 'Search this shelf…' : 'Search the whole lab…'" @focus="loadBodies" @input="loadBodies" />
  </div>
  <p class="sr-only" role="status">{{ found.length }} articles</p>
  <div v-if="found.length" class="lab-grid">
    <article v-for="(a, i) in found" :key="a.slug" class="lab-card">
      <div class="lab-card-thumb" aria-hidden="true">
        <img v-if="a.thumb" :src="a.thumb" alt="" width="640" height="360" :loading="i < 2 ? 'eager' : 'lazy'" decoding="async" />
        <span v-else class="lab-card-blank"><PixelIcon :name="a.shelf.icon" /></span>
      </div>
      <div class="lab-card-body">
        <p class="lab-card-shelf">{{ shelfLine(a) }}</p>
        <h2><a :href="`/lab/${a.slug}`">{{ a.title }}</a></h2>
        <p class="lab-card-desc">{{ a.description }}</p>
        <p class="lab-card-meta">
          <time :datetime="a.publishedAt">{{ date(a.publishedAt!) }}</time> · {{ a.readingMinutes }} min
        </p>
      </div>
    </article>
  </div>
  <div v-if="showPreview" class="local-drafts">
    <p class="draft-label">LOCAL PREVIEW · NOT PUBLISHED</p>
    <article class="entry lab-entry">
      <div>
        <h2><a href="/preview/reading-layout">A notebook needs room for the details <PixelIcon name="arrowRight" extra="after" /></a></h2>
        <p>An unpublished layout sample with code, tables, diagrams, and technical notes.</p>
      </div>
    </article>
    <p class="quiet-note">No published notes yet. This sample is only available in local development.</p>
  </div>
  <div v-if="!found.length && !showPreview" class="empty">
    <h2>{{ articles.length ? "No matching notes." : scoped ? "Nothing on this shelf yet." : "The notebook is open." }}</h2>
    <p>
      {{
        articles.length
          ? "Try a different search."
          : scoped
            ? "Write-ups and notes for this shelf are on the way. Have a look around the rest of the lab."
            : "This is where my experiments, technical notes, and longer write-ups will live. The first published notes are still on the way."
      }}
    </p>
    <button v-if="articles.length > 0" @click="query = ''">Clear search</button>
    <a v-else-if="scoped" class="empty-link" href="/lab"><PixelIcon name="arrowLeft" /> Back to the Lab map</a>
  </div>
</template>
