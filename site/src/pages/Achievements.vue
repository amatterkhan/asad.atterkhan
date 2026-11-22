<script setup lang="ts">
import PathLine from "../components/PathLine.vue";
import RoomVignette from "../components/RoomVignette.vue";
import { AchievementCollection } from "../islands";
import type { Achievement } from "../lib/schemas";
const { intro, records } = defineProps<{ intro: string; records: Achievement[] }>();
</script>
<template>
  <PathLine :segments="[{ label: 'achievements', href: '/achievements' }]" />
  <h1>Achievements</h1>
  <p class="page-intro">{{ intro }}</p>
  <RoomVignette corner="awards" />
  <AchievementCollection :records="records" />
</template>
