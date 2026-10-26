<script setup lang="ts">
import RoomVignette from "../components/RoomVignette.vue";
import { AchievementCollection } from "../islands";
import type { Achievement } from "../lib/schemas";
const { intro, records } = defineProps<{ intro: string; records: Achievement[] }>();
</script>
<template>
  <p class="eyebrow">Credentials &amp; milestones</p>
  <h1>Achievements</h1>
  <p class="page-intro">{{ intro }}</p>
  <RoomVignette corner="awards" />
  <AchievementCollection :records="records" />
</template>
