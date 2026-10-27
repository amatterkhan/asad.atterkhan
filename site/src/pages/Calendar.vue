<script setup lang="ts">
import RoomVignette from "../components/RoomVignette.vue";
import { ShiftCalendar } from "../islands";
// Public but unlisted: not linked anywhere, not in the sitemap, not indexed. Reachable by typing /calendar.
</script>
<template>
  <p class="eyebrow">Unlisted</p>
  <h1>Shift calendar</h1>
  <RoomVignette corner="calendar" />
  <ShiftCalendar />
</template>
