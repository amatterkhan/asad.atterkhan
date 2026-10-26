<script setup lang="ts">
import { manifest } from "../lib/manifest";
// A close-up of one corner of the homepage room (same LibreSprite layers), used as the header art of
// the page that corner leads to. Crops are in room pixels (the room is 384x216). `front` re-draws
// parts of the room (x, y, w, h) over the children, for depth.
const CROPS = {
  lab: [96, 90, 288, 72],
  bench: [128, 62, 256, 64],
  awards: [144, 4, 240, 60],
  cv: [144, 20, 240, 60],
  about: [0, 118, 384, 96],
  calendar: [0, 8, 192, 48],
} as const;
export type Corner = keyof typeof CROPS;
type Rect = [number, number, number, number];
const { corner, front = [] } = defineProps<{ corner: Corner; front?: Rect[] }>();
const [x, y, w, h] = CROPS[corner];
const v = manifest.version;
const bg = (n: string) => ({ backgroundImage: `url(/room/${n}.png?v=${v})` });
const clip = ([fx, fy, fw, fh]: Rect) =>
  `inset(${(fy / 216) * 100}% ${100 - ((fx + fw) / 384) * 100}% ${100 - ((fy + fh) / 216) * 100}% ${(fx / 384) * 100}%)`;
</script>
<template>
  <div class="vignette" aria-hidden="true" :style="{ '--cw': w, '--ch': h, '--cx': x, '--cy': y }">
    <div class="vignette-room">
      <div v-for="n in ['sky-night', 'sky-day', 'room', 'sunbeam']" :key="n" :class="`layer layer-${n}`" :style="bg(n)" />
      <slot />
      <div
        v-for="r in front"
        :key="`${r[0]}-${r[1]}`"
        class="layer layer-room"
        :style="{ ...bg('room'), clipPath: clip(r) }"
      />
      <div v-for="n in ['night', 'glow', 'bulb']" :key="n" :class="`layer layer-${n}`" :style="bg(n)" />
    </div>
  </div>
</template>
