<script setup lang="ts">
import PathLine from "../components/PathLine.vue";
import { DISCLOSURE_LABELS } from "../lib/lab-index";
// How findings are disclosed in the Lab. The states are the ones every entry is tagged with
// (schemas.ts DISCLOSURE_STATES). The wording below is placeholder copy until the owner writes it.
</script>
<template>
  <PathLine :segments="[{ label: 'disclosure', href: '/disclosure' }]" />
  <h1>Disclosure</h1>
  <aside class="callout draft">
    <strong>PLACEHOLDER COPY</strong>
    <br />
    The owner writes this page. The wording below only describes how the labels work; it is not a statement of policy.
  </aside>
  <p>Every Lab entry carries one of these labels near its title.</p>
  <dl class="disclosure-states">
    <template v-for="(d, id) in DISCLOSURE_LABELS" :key="id">
      <dt>{{ d.label }}</dt>
      <dd>{{ d.note }}</dd>
    </template>
  </dl>
  <p>An entry is not published until its disclosure is decided.</p>
</template>
