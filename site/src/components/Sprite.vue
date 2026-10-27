<script setup lang="ts">
import { computed } from "vue";
import { manifest, type SpriteState } from "../lib/manifest";
import { DEFAULT_OUTFIT, spriteSheet } from "../lib/outfits";
// A PixelLab/Aseprite sheet played with CSS steps(). The sheet is a strip inside a one-frame window,
// slid with transform so the browser's compositor plays it (no repaint per frame, and no var() in
// the keyframes, which WebKit resolves badly). Keyed by state, so a new state starts on frame 0.
// behaviors/sprites.ts starts it only while it is on screen and the tab is visible. Asad's sheets
// come from his active outfit.
const { state, size = 128, description, outfit = DEFAULT_OUTFIT } = defineProps<{ state: SpriteState; size?: number; description?: string; outfit?: string }>();
const style = computed(() => ({
  "--sprite-size": `${size}px`,
  "--sprite-sheet": `url(${spriteSheet(state, outfit)})`,
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
  ><span :key="state" class="sprite-strip" /></span>
</template>
