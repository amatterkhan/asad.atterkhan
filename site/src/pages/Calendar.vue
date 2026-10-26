<script setup lang="ts">
import RoomVignette from "../components/RoomVignette.vue";
import { ShiftCalendar } from "../islands";
// Private: not linked anywhere, not in the sitemap, not indexed. Shifts load only for the owner.
const { open } = defineProps<{ open: boolean }>();
</script>
<template>
  <p class="eyebrow">Private</p>
  <h1>Shift calendar</h1>
  <p class="page-intro">My rotation, a month at a time. Only I can see this page.</p>
  <RoomVignette corner="calendar" />
  <ShiftCalendar :open="open" />
</template>
