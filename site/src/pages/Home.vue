<script setup lang="ts">
import PixelIcon from "../components/PixelIcon.vue";
import { Room } from "../islands";
import { date, site } from "../lib/site";
import type { SiteCopy, Project } from "../lib/schemas";
import type { ArticleSummary } from "../lib/content.server";
const { copy, articles, projects, outfit } = defineProps<{ copy: SiteCopy; articles: ArticleSummary[]; projects: Project[]; outfit: string }>();
const name = copy.heroTitle.match(/Asad\.?$/)?.[0];
</script>
<template>
  <section class="hero">
    <div>
      <p class="eyebrow">{{ copy.role }} · {{ copy.location }}</p>
      <h1>{{ copy.heroTitle.replace(/Asad\.?$/, "") }}<em>{{ name }}</em></h1>
    </div>
    <div>
      <p class="lede">{{ copy.heroLede }}</p>
      <p class="hero-sub">{{ copy.heroBody }}</p>
    </div>
  </section>

  <Room :hint="copy.roomHint" :outfit="outfit" />

  <section class="block">
    <header class="block-head">
      <h2>From The Lab</h2>
      <a href="/lab">All notes <PixelIcon name="arrowRight" extra="after" /></a>
    </header>
    <ul v-if="articles.length" class="plain-list">
      <li v-for="a in articles" :key="a.slug">
        <time :datetime="a.publishedAt">{{ date(a.publishedAt!) }}</time>
        <a :href="`/lab/${a.slug}`">{{ a.title }}</a>
        <small class="shelf-note">{{ a.shelf.categoryName ?? a.shelf.sectionName }}</small>
      </li>
    </ul>
    <p v-else class="quiet-note">
      Nothing published yet. The first notes are being written: experiments, write-ups, and the occasional dead end
      worth keeping.
    </p>
  </section>

  <section class="block">
    <header class="block-head">
      <h2>On the Workbench</h2>
      <a href="/workbench">All projects <PixelIcon name="arrowRight" extra="after" /></a>
    </header>
    <ol class="showcase">
      <li v-for="(p, i) in projects" :key="p.slug">
        <span class="num" aria-hidden="true">{{ String(i + 1).padStart(2, "0") }}</span>
        <div>
          <h3><a :href="`/workbench/${p.slug}`">{{ p.title }}</a></h3>
          <p>{{ p.description }}</p>
          <p class="stack">{{ p.tags.join(" · ") }}</p>
        </div>
      </li>
    </ol>
  </section>

  <section class="block closing">
    <h2>{{ copy.closingTitle }}</h2>
    <p>{{ copy.closingBody }} <a :href="`mailto:${site.email}`">{{ site.email }}</a></p>
    <p class="closing-links">
      <a :href="site.github"><PixelIcon name="github" /> GitHub <PixelIcon name="external" extra="ext" /></a>
      <a :href="site.linkedin"><PixelIcon name="linkedin" /> LinkedIn <PixelIcon name="external" extra="ext" /></a>
      <a href="/experience"><PixelIcon name="briefcase" /> Experience</a>
      <a href="/achievements"><PixelIcon name="medal" /> Achievements</a>
    </p>
  </section>
</template>
