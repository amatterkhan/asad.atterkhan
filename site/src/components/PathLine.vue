<script setup lang="ts">
// Where the page sits, written as a path: ~/lab/writeups. Every segment is a link.
const { segments } = defineProps<{ segments: { label: string; href: string }[] }>();
</script>
<template>
  <nav class="path-line" aria-label="Breadcrumb">
    <span aria-hidden="true">~</span>
    <template v-for="s in segments" :key="s.href">
      <span aria-hidden="true">/</span>
      <a :href="s.href">{{ s.label }}</a>
    </template>
  </nav>
</template>
