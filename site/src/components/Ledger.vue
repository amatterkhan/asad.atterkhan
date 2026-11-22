<script setup lang="ts">
import { computed } from "vue";
import { groupByYear, type LedgerEntry } from "../lib/ledger";
// A dated list, newest first, grouped by year. The whole row is one link. Rows without a date
// (Workbench projects, credentials) sit in a list of their own with no date column.
const { entries, noun = ["entry", "entries"] } = defineProps<{ entries: LedgerEntry[]; noun?: [string, string] }>();
const years = computed(() => groupByYear(entries));
</script>
<template>
  <template v-for="y in years" :key="y.year ?? 'undated'">
    <p v-if="y.year !== null" class="ledger-year">{{ y.year }}</p>
    <ul :class="y.year === null ? 'ledger undated' : 'ledger'">
      <li v-for="e in y.entries" :key="e.href">
        <a :href="e.href">
          <time v-if="e.date" :datetime="e.date">{{ e.day }}</time>
          <div>
            <h3>{{ e.title }}</h3>
            <p v-if="e.summary">{{ e.summary }}</p>
            <p v-if="e.tags?.length" class="tag-list"><span v-for="t in e.tags" :key="t">{{ t }}</span></p>
          </div>
          <div class="ledger-meta">
            <b v-if="e.kind">{{ e.kind }}<em v-if="e.flag" class="ledger-flag"> · {{ e.flag }}</em></b>
            <b v-else-if="e.flag"><em class="ledger-flag">{{ e.flag }}</em></b>
            <span v-if="e.minutes">{{ e.minutes }} min read</span>
          </div>
        </a>
      </li>
    </ul>
  </template>
  <p class="ledger-count">{{ entries.length }} {{ entries.length === 1 ? noun[0] : noun[1] }}</p>
</template>
