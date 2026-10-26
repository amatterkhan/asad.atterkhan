<script setup lang="ts">
import { ICONS, type IconName } from "../lib/icons";
const { name, extra = "" } = defineProps<{ name: IconName; extra?: string }>();
</script>
<template>
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" :class="`pixel-icon ${extra}`" aria-hidden="true" focusable="false"><path v-for="d in ICONS[name]" :key="d" :d="d" /></svg>
</template>
