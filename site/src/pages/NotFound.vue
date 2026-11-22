<script setup lang="ts">
import At from "../components/At.vue";
import PixelIcon from "../components/PixelIcon.vue";
import RoomVignette from "../components/RoomVignette.vue";
import Sprite from "../components/Sprite.vue";
import { subtitles } from "../lib/site";
// The pixel 404: the room's floor, with Asad looking around for the page and Storm unbothered.
// Uses the existing sprites until a dedicated 404 sprite exists (art/README.md).
</script>
<template>
  <p class="lost-code" aria-hidden="true">404</p>
  <h1>Nothing here, yet.</h1>
  <p class="page-subtitle">{{ subtitles.notFound }}</p>
  <RoomVignette corner="about">
    <At :x="66" :y="78">
      <div class="asad"><Sprite state="asad-look" :size="128" /></div>
    </At>
    <At :x="156" :y="146">
      <div class="storm"><Sprite state="storm-dream" :size="64" /></div>
    </At>
  </RoomVignette>
  <p>Either this page moved, or it never existed. Try one of these instead.</p>
  <div class="text-links">
    <a href="/">Back home <PixelIcon name="arrowRight" extra="after" /></a>
    <a href="/lab">Explore The Lab <PixelIcon name="arrowRight" extra="after" /></a>
  </div>
</template>
