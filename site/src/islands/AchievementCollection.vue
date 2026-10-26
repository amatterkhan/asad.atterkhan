<script setup lang="ts">
import { computed, ref } from "vue";
import type { Achievement } from "../lib/schemas";
const { records } = defineProps<{ records: Achievement[] }>();
const query = ref("");
const kind = ref("all");
const kinds = [...new Set(records.map((r) => r.kind))];
const label = (v: string) =>
  v === "all" ? "All" : v === "certification" ? "Certifications" : v === "badge" ? "Badges" : "Awards";
const found = computed(() =>
  records.filter(
    (r) =>
      (kind.value === "all" || r.kind === kind.value) &&
      `${r.title} ${r.issuer}`.toLowerCase().includes(query.value.toLowerCase()),
  ),
);
</script>
<template>
  <div class="search notebook-search">
    <label class="sr-only" for="achievement-search">Find an achievement</label>
    <input id="achievement-search" v-model="query" type="search" placeholder="Search credentials…" />
  </div>
  <div v-if="kinds.length > 1" class="filters" role="group" aria-label="Achievement types">
    <button v-for="v in ['all', ...kinds]" :key="v" :aria-pressed="kind === v" @click="kind = v">{{ label(v) }}</button>
  </div>
  <p class="collection-count" role="status">
    {{ found.length }} {{ found.length === 1 ? "achievement" : "achievements" }}
  </p>
  <ul class="achievement-collection" role="list">
    <li v-for="r in found" :key="r.id">
      <span class="credential-symbol" aria-hidden="true">{{ r.kind === "badge" ? "✧" : "◇" }}</span>
      <div>
        <p class="meta">{{ r.issuer }} · {{ r.kind }}</p>
        <h2><a :href="r.link">{{ r.title }} ↗</a></h2>
        <p v-if="r.earnedAt" class="meta"><time :datetime="r.earnedAt">{{ r.earnedAt }}</time></p>
      </div>
    </li>
  </ul>
  <p v-if="!found.length" class="quiet-note">No matching achievements. Try a title or issuer.</p>
</template>
