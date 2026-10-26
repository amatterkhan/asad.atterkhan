<script setup lang="ts">
import ArticleView from "./Article.vue";
import type { Article } from "../lib/schemas";
import type { TocEntry } from "../lib/markdown";
const { article, html, toc, related } = defineProps<{
  article: Omit<Article, "body" | "searchText">;
  html: string;
  toc: TocEntry[];
  related: { slug: string; title: string }[];
}>();
</script>
<template>
  <ArticleView :article="article" :html="html" :toc="toc" />
  <section v-if="related.length > 0" class="related">
    <h2>Nearby in The Lab</h2>
    <a v-for="a in related" :key="a.slug" :href="`/lab/${a.slug}`">{{ a.title }}</a>
  </section>
</template>
