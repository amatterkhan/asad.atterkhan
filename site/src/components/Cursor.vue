<script setup lang="ts">
// A pixel circle on a 13x13 grid: matches the dotted-notebook background. behaviors/cursor.ts moves
// it; over a link it snaps into a bracket box around the link.
const N = 13;
const cells: [number, number][] = [];
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 6, y - 6);
    if (d > 4.9 && d < 6.1) cells.push([x, y]); // a one-pixel ring
  }
</script>
<template>
  <div class="cursor" aria-hidden="true">
    <div class="cursor-box" />
    <div class="cursor-ring">
      <svg :viewBox="`0 0 ${N} ${N}`" shape-rendering="crispEdges">
        <rect v-for="[x, y] in cells" :key="`${x}-${y}`" :x="x" :y="y" width="1" height="1" />
      </svg>
    </div>
    <div class="cursor-dot"><span /></div>
  </div>
</template>
