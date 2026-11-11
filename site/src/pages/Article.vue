<script setup lang="ts">
import PixelIcon from "../components/PixelIcon.vue";
import { date } from "../lib/site";
import type { Article } from "../lib/schemas";
import type { TocEntry } from "../lib/markdown";
import { DISCLOSURE_LABELS } from "../lib/lab-index";
// Reading page. behaviors/article.ts adds the code headers and copy buttons, renders Mermaid, moves
// the progress bar and highlights the current section in the table of contents.
const { article, html, toc, draft = false, series } = defineProps<{
  article: Omit<Article, "body" | "searchText">;
  html: string;
  toc: TocEntry[];
  draft?: boolean;
  series?: { name: string; items: { href: string; title: string; position: number; current: boolean }[] };
}>();
const disclosure = article.disclosure && article.disclosure !== "unresolved" ? DISCLOSURE_LABELS[article.disclosure] : undefined;
const cls = (h: TocEntry) => (h.depth === 3 ? "subheading" : undefined);
</script>
<template>
  <div class="read-progress" aria-hidden="true" />
  <p class="eyebrow article-crumb">
    <a href="/lab">The Lab</a> <span aria-hidden="true">/</span>
    <template v-if="article.shelf">
      <a :href="`/lab/section/${article.shelf.section}`">{{ article.shelf.sectionName }}</a>
      <template v-if="article.shelf.category">
        <span aria-hidden="true">/</span>
        <a :href="`/lab/section/${article.shelf.section}/${article.shelf.category}`">{{ article.shelf.categoryName }}</a>
      </template>
    </template>
    <template v-else>Notes</template>
  </p>
  <aside v-if="draft" class="callout draft">
    <strong>LOCAL DRAFT PREVIEW</strong>
    <br />
    Illustrative reading fixture. Not published, indexed, or included in RSS.
  </aside>
  <h1 class="article-title">{{ article.title }}</h1>
  <p v-if="disclosure" class="disclosure-line">
    <a href="/disclosure"><b>{{ disclosure.label }}</b></a>
    <span>{{ disclosure.note }}</span>
  </p>
  <p v-if="article.status === 'archived'" class="disclosure-line"><b>Archived</b><span>Kept for the record; it may be out of date.</span></p>
  <div class="article-meta">
    <time v-if="article.publishedAt" :datetime="article.publishedAt">Published {{ date(article.publishedAt) }}</time>
    <span v-else>Unpublished draft</span>
    <time v-if="article.updatedAt" :datetime="article.updatedAt">Updated {{ date(article.updatedAt) }}</time>
    <span>{{ article.readingMinutes }} min read</span>
  </div>
  <div class="tag-list article-tags">
    <span v-for="tag in article.tags" :key="tag">{{ tag }}</span>
  </div>
  <p class="article-lead">{{ article.description }}</p>
  <nav v-if="series && series.items.length > 1" class="series-nav" aria-label="Series">
    <p>Part of the series <b>{{ series.name }}</b></p>
    <ol>
      <li v-for="i in series.items" :key="i.href">
        <span v-if="i.current" aria-current="page">{{ i.position }}. {{ i.title }}</span>
        <a v-else :href="i.href">{{ i.position }}. {{ i.title }}</a>
      </li>
    </ol>
  </nav>
  <img v-if="article.thumb" class="article-thumb" :src="article.thumb" alt="" width="640" height="360" fetchpriority="high" />
  <details v-if="toc.length > 0" class="mobile-toc">
    <summary>On this page</summary>
    <a v-for="h in toc" :key="h.id" :href="`#${h.id}`" :class="cls(h)">{{ h.title }}</a>
  </details>
  <div class="article-grid">
    <article class="prose" data-article>
      <div v-html="html" />
      <footer class="article-end">
        <span class="tags">{{ article.tags.join(" / ") }}</span>
        <a :href="article.shelf ? `/lab/section/${article.shelf.section}` : '/lab'"><PixelIcon name="arrowLeft" />Back to {{ article.shelf?.sectionName ?? "The Lab" }}</a>
      </footer>
    </article>
    <aside v-if="toc.length > 0" class="toc" aria-label="On this page">
      <span>ON THIS PAGE</span>
      <a v-for="h in toc" :key="h.id" :href="`#${h.id}`" :class="cls(h)">{{ h.title }}</a>
    </aside>
  </div>
</template>
