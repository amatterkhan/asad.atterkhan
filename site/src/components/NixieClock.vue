<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  NIXIE_BOX,
  NIXIE_X,
  NIXIE_Y,
  clockLabel,
  clockTubes,
  divergenceTubes,
  litPath,
  mauritiusTime,
  plinthWidth,
  readingPath,
  unlitFor,
} from "../lib/nixie";
// One half of the Nixie clock (lib/nixie.ts), sized to the clock's own box inside a room-sized parent.
// "glass" is the tubes and plinth, drawn on the wall under the night layers; "lit" is the glowing
// digits, drawn over them. Inside an island (the homepage room) `live` ticks it here, so only the clock
// re-renders each second; in static page vignettes behaviors/nixie.ts ticks it instead. A `reading`
// ("1.048596") turns it into a divergence meter: the tubes re-lay as d.dddddd and show that instead.
const { part, live = false, reading } = defineProps<{ part: "glass" | "lit"; live?: boolean; reading?: string }>();
const time = ref("");
let id: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  if (!live || part !== "lit") return;
  const tick = () => (time.value = mauritiusTime());
  tick();
  id = setInterval(tick, 1000);
});
onBeforeUnmount(() => clearInterval(id));
const [x, y, w, h] = NIXIE_BOX;
const box = {
  left: `${(x / 384) * 100}%`,
  top: `${(y / 216) * 100}%`,
  width: `${(w / 384) * 100}%`,
  height: `${(h / 216) * 100}%`,
};
const viewBox = `${x} ${y} ${w} ${h}`;
const tubes = computed(() => (reading ? divergenceTubes : clockTubes));
const unlit = computed(() => unlitFor(tubes.value));
</script>
<template>
  <svg v-if="part === 'glass'" class="nixie nixie-glass-set" :style="box" :viewBox="viewBox" aria-hidden="true">
    <rect class="nixie-plinth" :x="NIXIE_X" :y="NIXIE_Y + 12" :width="plinthWidth(tubes)" height="3" />
    <rect class="nixie-plinth-top" :x="NIXIE_X" :y="NIXIE_Y + 12" :width="plinthWidth(tubes)" height="1" />
    <g v-for="t in tubes" :key="t.x">
      <rect class="nixie-glass" :x="t.x" :y="NIXIE_Y + 1" :width="t.w" height="9" />
      <rect class="nixie-glass" :x="t.x + 1" :y="NIXIE_Y" :width="t.w - 2" height="1" />
      <rect class="nixie-shine" :x="t.x" :y="NIXIE_Y + 1" width="1" height="8" />
      <rect class="nixie-socket" :x="t.x" :y="NIXIE_Y + 10" :width="t.w" height="2" />
    </g>
    <path class="nixie-unlit" :d="unlit" />
  </svg>
  <svg
    v-else
    class="nixie nixie-lit"
    :style="box"
    :viewBox="viewBox"
    role="img"
    :aria-label="reading ? `A divergence meter reading ${reading}` : clockLabel(time)"
    :data-nixie="live ? undefined : ''"
  >
    <path :d="reading ? readingPath(reading) : litPath(time)" />
  </svg>
</template>
