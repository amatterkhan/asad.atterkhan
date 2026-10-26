<script setup lang="ts">
import { computed } from "vue";
import { manifest, type SpriteState } from "../lib/manifest";
// A PixelLab/Aseprite sheet played with CSS steps(). behaviors/sprites.ts starts it only while it is
// on screen and the tab is visible.
const { state, size = 128, description } = defineProps<{ state: SpriteState; size?: number; description?: string }>();
const style = computed(() => ({
  "--sprite-size": `${size}px`,
  "--sprite-sheet": `url(/sprites/${state}.png?v=${manifest.version})`,
  "--n": manifest.states[state].frames,
  "--ms": `${manifest.states[state].frameMs}ms`,
}));
</script>
<template>
  <span
    :role="description ? 'img' : undefined"
    :aria-label="description"
    :aria-hidden="description ? undefined : 'true'"
    :class="`sprite ${state}`"
    :style="style"
  />
</template>
