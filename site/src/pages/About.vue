<script setup lang="ts">
import RoomVignette from "../components/RoomVignette.vue";
import At from "../components/At.vue";
import Sprite from "../components/Sprite.vue";
const { html, outfit } = defineProps<{ html: string; outfit: string }>();
</script>
<template>
  <p class="eyebrow">A bit about me</p>
  <h1>About</h1>
  <RoomVignette corner="about">
    <At :x="66" :y="78">
      <div class="asad"><Sprite state="asad-coffee" :outfit="outfit" :size="128" /></div>
    </At>
    <At :x="156" :y="146">
      <div class="storm"><Sprite state="storm-sleeping" :size="64" /></div>
    </At>
  </RoomVignette>
  <div class="about-grid">
    <div class="prose" v-html="html" />
  </div>
</template>
