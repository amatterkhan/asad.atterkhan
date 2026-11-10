<script setup lang="ts">
// The end of an entry: the newer one on the left, the older one on the right.
type Link = { href: string; title: string };
const { newer, older } = defineProps<{ newer?: Link; older?: Link }>();
</script>
<template>
  <nav v-if="newer || older" class="entry-nav" aria-label="More entries">
    <a v-if="newer" :href="newer.href"><small>Newer</small><span>{{ newer.title }}</span></a>
    <span v-else />
    <a v-if="older" class="older" :href="older.href"><small>Older</small><span>{{ older.title }}</span></a>
  </nav>
</template>
