<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TerminalLayout from '@/components/TerminalLayout.vue'
import PixelQuestLayout from '@/components/prototype/PixelQuestLayout.vue'

const route = useRoute()
// Local-only site redesign prototype. It deliberately never ships in the production layout.
const showPixelQuestPrototype = computed(() => import.meta.env.DEV)
</script>

<template>
  <router-view v-if="route.meta?.bare" />
  <PixelQuestLayout v-else-if="showPixelQuestPrototype" />
  <TerminalLayout v-else />
</template>
