<script setup lang="ts">
import PathLine from "../components/PathLine.vue";
import RoomVignette from "../components/RoomVignette.vue";
import At from "../components/At.vue";
import Sprite from "../components/Sprite.vue";
import { WorkbenchSearch } from "../islands";
type Entry = { slug: string; title: string; description: string; tags: string[]; categories: string[] };
const { intro, projects } = defineProps<{ intro: string; projects: Entry[] }>();
</script>
<template>
  <PathLine :segments="[{ label: 'workbench', href: '/workbench' }]" />
  <h1>Workbench</h1>
  <p class="page-intro">{{ intro }}</p>
  <RoomVignette corner="bench">
    <At :x="286" :y="80">
      <div class="robot"><Sprite state="robot-idle" :size="48" /></div>
    </At>
  </RoomVignette>
  <h2 class="sr-only">Projects</h2>
  <WorkbenchSearch :projects="projects" />
</template>
