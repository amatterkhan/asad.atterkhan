<script setup lang="ts">
import PathLine from "../components/PathLine.vue";
import PixelIcon from "../components/PixelIcon.vue";
import { safeHref } from "../lib/safe-url";
import type { Project } from "../lib/schemas";
const { project: p, writeup } = defineProps<{ project: Project; writeup: string | null }>();
</script>
<template>
  <PathLine :segments="[{ label: 'workbench', href: '/workbench' }, { label: p.slug, href: `/workbench/${p.slug}` }]" />
  <h1>{{ p.title }}</h1>
  <p class="opening">{{ p.description }}</p>
  <div class="tags">{{ p.categories.join(" / ") }}</div>
  <div class="text-links">
    <a v-for="l in p.links" :key="l.url" :href="safeHref(l.url)" rel="noopener noreferrer">{{ l.type === "Code" ? "Source code" : l.type }}<PixelIcon name="external" extra="ext" /></a>
  </div>
  <section class="section project-facts">
    <h2>Project notes</h2>
    <dl>
      <div>
        <dt>Technologies</dt>
        <dd>{{ p.tags.join(", ") }}</dd>
      </div>
      <div>
        <dt>Type</dt>
        <dd>{{ p.categories[0] }}</dd>
      </div>
    </dl>
  </section>
  <article v-if="writeup" class="prose project-writeup" data-article>
    <div v-html="writeup" />
  </article>
  <a href="/workbench"><PixelIcon name="arrowLeft" />Back to the Workbench</a>
</template>
