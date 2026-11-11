<script setup lang="ts">
import RoomVignette from "../components/RoomVignette.vue";
import At from "../components/At.vue";
import Sprite from "../components/Sprite.vue";
import PathLine from "../components/PathLine.vue";
import FilterTabs from "../components/FilterTabs.vue";
import { LabSearch } from "../islands";
import { subtitles } from "../lib/site";
import type { LabEntry, TagCount } from "../lib/lab-index";
import type { LabMapSection } from "../routes";
// The Lab index (docs/decisions/0006): a dated ledger with the whole row as the link. Sections,
// categories and tags are filters, each a link to its own prerendered page, so they work without
// JavaScript and have URLs. Only the search hydrates.
const { intro, sections, active, entries, tags, devPreview } = defineProps<{
  intro: string;
  sections: LabMapSection[];
  active?: { section?: string; category?: string; tag?: string };
  entries: LabEntry[];
  tags: TagCount[];
  devPreview: boolean;
}>();
const section = active?.section ? sections.find((s) => s.id === active.section) : undefined;
const category = section && active?.category ? section.categories.find((c) => c.id === active.category) : undefined;
const tag = active?.tag ? tags.find((t) => t.slug === active.tag) : undefined;
const total = sections.reduce((n, s) => n + s.count, 0);
const sectionHref = (id: string) => `/lab/section/${id}`;
const path = [
  { label: "lab", href: "/lab" },
  ...(section ? [{ label: section.id, href: sectionHref(section.id) }] : []),
  ...(section && category ? [{ label: category.id, href: `${sectionHref(section.id)}/${category.id}` }] : []),
  ...(active?.tag ? [{ label: `tag/${active.tag}`, href: `/lab/tag/${active.tag}` }] : []),
];
const heading = category?.name ?? section?.name ?? (active?.tag ? `Tagged ${tag?.label ?? active.tag}` : "The Lab");
const sectionTabs = [
  { label: "All", href: "/lab", count: total, current: !active?.section && !active?.tag },
  ...sections.map((s) => ({ label: s.name, href: sectionHref(s.id), count: s.count, current: s.id === section?.id && !category })),
];
const categoryTabs = section?.categories.length
  ? [
      { label: `All ${section.name}`, href: sectionHref(section.id), count: section.count, current: !category },
      ...section.categories.map((c) => ({ label: c.name, href: `${sectionHref(section.id)}/${c.id}`, count: c.count, current: c.id === category?.id })),
    ]
  : [];
const tagTabs = tags.map((t) => ({ label: t.label, href: `/lab/tag/${t.slug}`, count: t.count, current: t.slug === active?.tag }));
</script>
<template>
  <PathLine :segments="path" />
  <div class="lab-heading">
    <div>
      <h1>{{ heading }}</h1>
      <p v-if="!active" class="page-subtitle">{{ subtitles.lab }}</p>
      <p v-if="!active">{{ intro }}</p>
      <p v-else-if="section && !category">{{ section.blurb }}</p>
    </div>
  </div>
  <RoomVignette v-if="!active" corner="lab">
    <At :x="159" :y="111">
      <div class="storm">
        <Sprite state="storm-nap" :size="40" />
        <span class="sleep-mark">z Z</span>
      </div>
    </At>
  </RoomVignette>
  <FilterTabs label="Sections" :tabs="sectionTabs" />
  <FilterTabs v-if="categoryTabs.length" label="Categories" :tabs="categoryTabs" />
  <FilterTabs v-if="tagTabs.length" label="Tags" :tabs="tagTabs" />
  <LabSearch :entries="entries" :dev-preview="devPreview && !active" :scoped="!!active" />
</template>
