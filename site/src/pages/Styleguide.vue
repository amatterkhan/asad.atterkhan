<script setup lang="ts">
import EntryNav from "../components/EntryNav.vue";
import FilterTabs from "../components/FilterTabs.vue";
import Ledger from "../components/Ledger.vue";
import PathLine from "../components/PathLine.vue";
import type { LedgerEntry } from "../lib/ledger";
// Development only (routes.ts): every design-system piece on one page, in whichever theme is on.
// All content here is sample text; none of it is published.
const { html } = defineProps<{ html: string }>();
const colours = [
  { name: "bg", cls: "bg-bg", use: "Page background" },
  { name: "bg-2", cls: "bg-bg-2", use: "Raised surface, row hover" },
  { name: "ink", cls: "bg-ink", use: "Text" },
  { name: "ink-strong", cls: "bg-ink-strong", use: "Headings" },
  { name: "muted", cls: "bg-muted", use: "Secondary text" },
  { name: "faint", cls: "bg-faint", use: "Rules and borders" },
  { name: "accent", cls: "bg-accent", use: "Mint: current, focus" },
  { name: "sky", cls: "bg-sky", use: "Links" },
  { name: "peach", cls: "bg-peach", use: "Tags and kinds" },
];
const tabs = [
  { label: "All", href: "#all", count: 4, current: true },
  { label: "Writeups", href: "#writeups", count: 2 },
  { label: "Tooling", href: "#tooling", count: 1 },
  { label: "Notes", href: "#notes", count: 1 },
];
const entries: LedgerEntry[] = [
  { href: "#one", date: "2026-10-12", title: "Sample entry with a title long enough to wrap on a phone", summary: "A one-line summary of a sample entry.", kind: "Writeups / Sample category", minutes: 14 },
  { href: "#two", date: "2026-09-30", title: "Sample entry", summary: "A one-line summary of a sample entry.", kind: "Tooling", minutes: 6 },
  { href: "#three", date: "2026-01-04", title: "Sample entry without a summary", kind: "Notes", minutes: 1 },
  { href: "#four", date: "2025-12-19", title: "Sample entry from the year before", summary: "A one-line summary of a sample entry.", kind: "Writeups", minutes: 9, flag: "Archived" },
];
</script>
<template>
  <PathLine :segments="[{ label: 'styleguide', href: '/styleguide' }]" />
  <h1>Components</h1>
  <p class="page-subtitle">Every piece, in one place.</p>
  <p class="sg-note">Development only. Sample text throughout. Switch the theme in the header to check the other palette.</p>

  <section class="sg-section" aria-labelledby="sg-colour">
    <h2 id="sg-colour">Colour</h2>
    <ul class="sg-swatches">
      <li v-for="c in colours" :key="c.name"><i :class="c.cls" />{{ c.name }}<br />{{ c.use }}</li>
    </ul>
  </section>

  <section class="sg-section sg-type" aria-labelledby="sg-type">
    <h2 id="sg-type">Type</h2>
    <h1>Heading one</h1>
    <h2>Heading two</h2>
    <h3>Heading three</h3>
    <p class="page-subtitle">A page subtitle, in italic serif.</p>
    <p class="page-intro">A page introduction, in the serif, a step below the heading.</p>
    <p>Interface text in the system sans, with <a href="#sg-type">a link</a>.</p>
    <p class="meta">Metadata in Departure Mono</p>
    <div class="tag-list"><span>sample-tag</span><span>another-tag</span></div>
  </section>

  <section class="sg-section" aria-labelledby="sg-path">
    <h2 id="sg-path">Path line</h2>
    <PathLine
      :segments="[
        { label: 'lab', href: '#lab' },
        { label: 'writeups', href: '#writeups' },
        { label: 'sample-category', href: '#category' },
      ]"
    />
  </section>

  <section class="sg-section" aria-labelledby="sg-filters">
    <h2 id="sg-filters">Filter tabs and ledger</h2>
    <FilterTabs label="Sample filters" :tabs="tabs" />
    <Ledger :entries="entries" />
  </section>

  <section class="sg-section" aria-labelledby="sg-nav">
    <h2 id="sg-nav">Entry navigation</h2>
    <EntryNav :newer="{ href: '#newer', title: 'Sample newer entry' }" :older="{ href: '#older', title: 'Sample older entry' }" />
  </section>

  <section class="sg-section" aria-labelledby="sg-entry">
    <h2 id="sg-entry">Entry header pieces</h2>
    <p class="disclosure-line"><a href="#disclosure"><b>No vulnerability described</b></a><span>This entry describes no finding.</span></p>
    <nav class="series-nav" aria-label="Series">
      <p>Part of the series <b>sample series</b></p>
      <ol>
        <li><a href="#part-1">1. Sample first part</a></li>
        <li><span aria-current="page">2. Sample second part</span></li>
      </ol>
    </nav>
  </section>

  <section class="sg-section" aria-labelledby="sg-prose">
    <h2 id="sg-prose">Prose</h2>
    <p class="sg-note">The reading fixture from tests/fixtures/article.md, through the real Markdown pipeline.</p>
    <article class="prose" data-article><div v-html="html" /></article>
  </section>
</template>
