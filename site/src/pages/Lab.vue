<script setup lang="ts">
import RoomVignette from "../components/RoomVignette.vue";
import At from "../components/At.vue";
import Sprite from "../components/Sprite.vue";
import PixelIcon from "../components/PixelIcon.vue";
import { LabSearch } from "../islands";
import type { ArticleCard } from "../lib/content.server";
import type { LabMapSection } from "../routes";
// The Lab and each of its sections share this page. The overview (no `active`) shows the room and the
// map of sections; a section page shows the section tabs and its categories. All navigation is plain
// links between prerendered pages; only the search below hydrates.
const { intro, sections, active, articles, devPreview } = defineProps<{
  intro: string;
  sections: LabMapSection[];
  active?: { section: string; category?: string };
  articles: ArticleCard[];
  devPreview: boolean;
}>();
const current = active && sections.find((s) => s.id === active.section)!;
const total = sections.reduce((n, s) => n + s.count, 0);
const entries = (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`;
const sectionHref = (id: string) => `/lab/section/${id}`;
</script>
<template>
  <template v-if="!current">
    <div class="lab-heading">
      <div>
        <p class="eyebrow">Technical journal</p>
        <h1>The Lab</h1>
        <p>{{ intro }}</p>
      </div>
    </div>
    <RoomVignette corner="lab">
      <At :x="159" :y="111">
        <div class="storm">
          <Sprite state="storm-nap" :size="40" />
          <span class="sleep-mark">z Z</span>
        </div>
      </At>
    </RoomVignette>
    <nav class="lab-map" aria-label="Lab sections">
      <h2 class="lab-map-title"><PixelIcon name="map" /> Lab map <small>{{ entries(total) }}</small></h2>
      <ul>
        <li v-for="s in sections" :key="s.id" class="lab-room">
          <span class="lab-room-icon" aria-hidden="true"><PixelIcon :name="s.icon" /></span>
          <h3><a :href="sectionHref(s.id)">{{ s.name }}</a></h3>
          <p class="lab-room-count">{{ entries(s.count) }}</p>
          <p class="lab-room-blurb">{{ s.blurb }}</p>
          <p v-if="s.categories.length" class="lab-room-cats">
            <a v-for="c in s.categories" :key="c.id" :href="`${sectionHref(s.id)}/${c.id}`">{{ c.name }}</a>
          </p>
        </li>
      </ul>
    </nav>
    <h2 class="lab-list-title">Latest from the bench</h2>
  </template>

  <template v-else>
    <p class="eyebrow article-crumb">
      <a href="/lab">The Lab</a> <span aria-hidden="true">/</span>
      <template v-if="active!.category">
        <a :href="sectionHref(current.id)">{{ current.name }}</a> <span aria-hidden="true">/</span>
      </template>
      <span v-else>{{ current.name }}</span>
    </p>
    <nav class="lab-tabs" aria-label="Lab sections">
      <a href="/lab">All</a>
      <a
        v-for="s in sections"
        :key="s.id"
        :href="sectionHref(s.id)"
        :aria-current="s.id === current.id ? 'page' : undefined"
      ><PixelIcon :name="s.icon" />{{ s.name }} <small>{{ s.count }}</small></a>
    </nav>
    <div class="lab-section-head">
      <span class="lab-room-icon" aria-hidden="true"><PixelIcon :name="current.icon" /></span>
      <div>
        <h1>{{ active!.category ? current.categories.find((c) => c.id === active!.category)!.name : current.name }}</h1>
        <p>{{ current.blurb }}</p>
      </div>
    </div>
    <nav v-if="current.categories.length" class="filters lab-cats" aria-label="Categories">
      <a :href="sectionHref(current.id)" :aria-current="!active!.category ? 'page' : undefined">All <small>{{ current.count }}</small></a>
      <a
        v-for="c in current.categories"
        :key="c.id"
        :href="`${sectionHref(current.id)}/${c.id}`"
        :aria-current="c.id === active!.category ? 'page' : undefined"
      >{{ c.name }} <small>{{ c.count }}</small></a>
    </nav>
  </template>

  <LabSearch :articles="articles" :dev-preview="devPreview && !current" :scoped="!!current" />
</template>
