<script setup lang="ts">
// Filters as links, so every filtered view has its own URL and works without JavaScript.
const { label, tabs } = defineProps<{
  label: string;
  tabs: { label: string; href: string; count?: number; current?: boolean }[];
}>();
</script>
<template>
  <nav class="filter-tabs" :aria-label="label">
    <a v-for="t in tabs" :key="t.href" :href="t.href" :aria-current="t.current ? 'page' : undefined">
      {{ t.label }}
      <sup v-if="t.count !== undefined">
        <span class="sr-only">, </span>{{ t.count }}<span class="sr-only"> {{ t.count === 1 ? "entry" : "entries" }}</span>
      </sup>
    </a>
  </nav>
</template>
