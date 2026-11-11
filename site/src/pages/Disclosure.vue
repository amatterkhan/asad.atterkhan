<script setup lang="ts">
import PathLine from "../components/PathLine.vue";
import { DISCLOSURE_LABELS } from "../lib/lab-index";
import { site } from "../lib/site";
// How findings are disclosed in the Lab. The labels are the ones every entry is tagged with
// (schemas.ts DISCLOSURE_STATES); the build refuses an entry whose label is still "unresolved".
</script>
<template>
  <PathLine :segments="[{ label: 'disclosure', href: '/disclosure' }]" />
  <h1>Disclosure</h1>
  <p class="lede">
    Some of what I write about in the Lab touches real systems. This page says what I will and won't publish, and why.
  </p>

  <h2>Where I test</h2>
  <p>
    Only on things I own, on machines in my own lab, on training platforms and capture-the-flag events, and on targets whose
    owners have invited testing, such as a bug bounty or vulnerability disclosure programme. For those I stay inside the
    programme's scope and rules. If something isn't clearly in scope, I leave it alone.
  </p>

  <h2>When a finding is published</h2>
  <p>
    A write-up about a real vulnerability goes up only once it has been fixed and the programme's own disclosure rules allow
    it. If the programme says no, the write-up stays private, or is published with the programme and target removed. Anything
    from a private programme stays private. When I'm not sure, it waits.
  </p>

  <h2>What I leave out</h2>
  <ul>
    <li>Working steps for a problem that hasn't been fixed.</li>
    <li>Personal data, credentials, keys and customer information, even if I came across them while testing.</li>
    <li>Anything from my employer. Work I do there is not written about here.</li>
    <li>Answers to live capture-the-flag events, exams and certification tests.</li>
  </ul>

  <h2>The labels on each entry</h2>
  <p>Every Lab entry carries one of these near its title.</p>
  <dl class="disclosure-states">
    <template v-for="(d, id) in DISCLOSURE_LABELS" :key="id">
      <dt>{{ d.label }}</dt>
      <dd>{{ d.note }}</dd>
    </template>
  </dl>
  <p>An entry whose label isn't settled can't be published.</p>

  <h2>Using what you read here</h2>
  <p>
    The write-ups explain how things work and how they fail. They are not an invitation to test anyone's systems. Only test
    what you own or have permission to test, and read the rules of the programme and the law where you live first. This is how
    I work, not legal advice.
  </p>

  <h2>Something that shouldn't be here</h2>
  <p>
    If you run a programme or a system and think an entry should change or come down, write to
    <a :href="`mailto:${site.email}`">{{ site.email }}</a>. I'll take it offline while I look into it.
  </p>
</template>
