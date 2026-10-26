<script setup lang="ts">
/** Places a child at room coordinates inside a vignette. */
const { x, y } = defineProps<{ x: number; y: number }>();
</script>
<template>
  <div class="vignette-at" :style="{ '--x': x, '--y': y }"><slot /></div>
</template>
