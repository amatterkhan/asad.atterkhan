<script setup lang="ts">
import RoomVignette from "../components/RoomVignette.vue";
import At from "../components/At.vue";
import Sprite from "../components/Sprite.vue";
import { LabSearch } from "../islands";
import type { ArticleSummary } from "../lib/content.server";
const { intro, articles, devPreview } = defineProps<{ intro: string; articles: ArticleSummary[]; devPreview: boolean }>();
</script>
<template>
  <div class="lab-heading">
    <div>
      <p class="eyebrow">Technical journal</p>
      <h1>The Lab</h1>
      <p>{{ intro }}</p>
    </div>
  </div>
  <RoomVignette corner="lab">
    <At :x="159" :y="111">
      <div class="storm">
        <Sprite state="storm-nap" :size="40" />
        <span class="sleep-mark">z Z</span>
      </div>
    </At>
  </RoomVignette>
  <LabSearch :articles="articles" :dev-preview="devPreview" />
</template>
