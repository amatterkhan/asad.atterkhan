<script setup lang="ts">
import { computed, ref } from "vue";
import PixelIcon from "../components/PixelIcon.vue";
import { safeHref } from "../lib/safe-url";
import { date } from "../lib/site";
import type { Achievement } from "../lib/schemas";
const { records } = defineProps<{ records: Achievement[] }>();
const query = ref("");
const kind = ref("all");
const kinds = [...new Set(records.map((r) => r.kind))];
const label = (v: string) =>
  v === "all" ? "All" : v === "certification" ? "Certifications" : v === "badge" ? "Badges" : "Awards";
const one = (v: string) => (v === "certification" ? "Certification" : v === "badge" ? "Badge" : "Award");
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
  <div v-if="kinds.length > 1" class="filter-tabs" role="group" aria-label="Achievement types">
    <button v-for="v in ['all', ...kinds]" :key="v" type="button" :aria-pressed="kind === v" @click="kind = v">{{ label(v) }}</button>
  </div>
  <p class="sr-only" role="status">{{ found.length }} {{ found.length === 1 ? "achievement" : "achievements" }}</p>
  <!-- each credential is a card that opens in place: plain <details>, so it works before hydration too -->
  <ul v-if="found.length" class="credentials" role="list">
    <li v-for="r in found" :key="r.id">
      <details>
        <summary>
          <h3>{{ r.title }}</h3>
          <span class="credential-meta">{{ r.issuer }}</span>
        </summary>
        <dl>
          <div>
            <dt>Type</dt>
            <dd>{{ one(r.kind) }}</dd>
          </div>
          <div>
            <dt>Issued by</dt>
            <dd>{{ r.issuer }}</dd>
          </div>
          <div v-if="r.earnedAt">
            <dt>Earned</dt>
            <dd><time :datetime="r.earnedAt">{{ date(r.earnedAt) }}</time></dd>
          </div>
        </dl>
        <a :href="safeHref(r.link)" rel="noopener noreferrer">Verify with {{ r.issuer }}<PixelIcon name="external" extra="ext" /></a>
      </details>
    </li>
  </ul>
  <p class="ledger-count">{{ found.length }} {{ found.length === 1 ? "achievement" : "achievements" }}</p>
  <p v-if="!found.length" class="quiet-note">No matching achievements. Try a title or issuer.</p>
</template>
