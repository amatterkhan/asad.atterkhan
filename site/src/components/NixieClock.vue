<script setup lang="ts">
import { NIXIE_BOX, NIXIE_X, NIXIE_Y, NIXIE_W, clockLabel, litPath, tubes, unlitPath } from "../lib/nixie";
// One half of the Nixie clock (lib/nixie.ts), sized to the clock's own box inside a room-sized parent.
// "glass" is the tubes and plinth, drawn on the wall under the night layers; "lit" is the glowing
// digits, drawn over them. With no `time`, behaviors/nixie.ts keeps the digits ticking (the page
// vignettes); the homepage room passes its own.
const { part, time } = defineProps<{ part: "glass" | "lit"; time?: string }>();
const [x, y, w, h] = NIXIE_BOX;
const box = {
  left: `${(x / 384) * 100}%`,
  top: `${(y / 216) * 100}%`,
  width: `${(w / 384) * 100}%`,
  height: `${(h / 216) * 100}%`,
};
const viewBox = `${x} ${y} ${w} ${h}`;
</script>
<template>
  <svg v-if="part === 'glass'" class="nixie nixie-glass-set" :style="box" :viewBox="viewBox" aria-hidden="true">
    <rect class="nixie-plinth" :x="NIXIE_X" :y="NIXIE_Y + 12" :width="NIXIE_W" height="3" />
    <rect class="nixie-plinth-top" :x="NIXIE_X" :y="NIXIE_Y + 12" :width="NIXIE_W" height="1" />
    <g v-for="t in tubes" :key="t.x">
      <rect class="nixie-glass" :x="t.x" :y="NIXIE_Y + 1" :width="t.w" height="9" />
      <rect class="nixie-glass" :x="t.x + 1" :y="NIXIE_Y" :width="t.w - 2" height="1" />
      <rect class="nixie-shine" :x="t.x" :y="NIXIE_Y + 1" width="1" height="8" />
      <rect class="nixie-socket" :x="t.x" :y="NIXIE_Y + 10" :width="t.w" height="2" />
    </g>
    <path class="nixie-unlit" :d="unlitPath" />
  </svg>
  <svg
    v-else
    class="nixie nixie-lit"
    :style="box"
    :viewBox="viewBox"
    role="img"
    :aria-label="clockLabel(time ?? '')"
    :data-nixie="time === undefined ? '' : undefined"
  >
    <path :d="litPath(time ?? '')" />
  </svg>
</template>
