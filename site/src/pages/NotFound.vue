<script setup lang="ts">
import PixelIcon from "../components/PixelIcon.vue";
import { subtitles } from "../lib/site";
</script>
<template>
  <div class="path">404 · path not found</div>
  <h1>Nothing here, yet.</h1>
  <p class="page-subtitle">{{ subtitles.notFound }}</p>
  <p>Either this page moved, or it never existed. Try one of these instead.</p>
  <div class="text-links">
    <a href="/">Back home <PixelIcon name="arrowRight" extra="after" /></a>
    <a href="/lab">Explore The Lab <PixelIcon name="arrowRight" extra="after" /></a>
  </div>
</template>
