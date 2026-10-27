<script setup lang="ts">
import ArticleView from "./Article.vue";
import PixelIcon from "../components/PixelIcon.vue";
import type { Article } from "../lib/schemas";
import type { TocEntry } from "../lib/markdown";
const { article, html, toc, related } = defineProps<{
  article: Omit<Article, "body" | "searchText">;
  html: string;
  toc: TocEntry[];
  related: { slug: string; title: string; thumb?: string; shelf: NonNullable<Article["shelf"]> }[];
}>();
</script>
<template>
  <ArticleView :article="article" :html="html" :toc="toc" />
  <section v-if="related.length > 0" class="related">
    <h2>Nearby in The Lab</h2>
    <a v-for="a in related" :key="a.slug" :href="`/lab/${a.slug}`" class="related-item">
      <span class="related-thumb" aria-hidden="true">
        <img v-if="a.thumb" :src="a.thumb" alt="" width="640" height="360" loading="lazy" decoding="async" />
        <PixelIcon v-else :name="a.shelf.icon" />
      </span>
      <span><small>{{ [a.shelf.sectionName, a.shelf.categoryName].filter(Boolean).join(" · ") }}</small>{{ a.title }}</span>
    </a>
  </section>
</template>
