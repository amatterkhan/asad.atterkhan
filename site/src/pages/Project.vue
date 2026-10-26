<script setup lang="ts">
import PixelIcon from "../components/PixelIcon.vue";
import type { Project } from "../lib/schemas";
const { project: p, writeup } = defineProps<{ project: Project; writeup: string | null }>();
</script>
<template>
  <div class="path"><a href="/workbench">Workbench</a> · {{ p.categories[0] }}</div>
  <h1>{{ p.title }}</h1>
  <p class="opening">{{ p.description }}</p>
  <div class="tags">{{ p.categories.join(" / ") }}</div>
  <div class="text-links">
    <a v-for="l in p.links" :key="l.url" :href="l.url" rel="noopener noreferrer">{{ l.type === "Code" ? "Source code" : l.type }} ↗</a>
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
