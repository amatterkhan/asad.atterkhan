<script setup lang="ts">
import Ledger from "../components/Ledger.vue";
import PixelIcon from "../components/PixelIcon.vue";
import { Room } from "../islands";
import { safeHref } from "../lib/safe-url";
import { site, subtitles } from "../lib/site";
import { profileView } from "../lib/profiles";
import type { Profile, SiteCopy, Project } from "../lib/schemas";
import type { LabEntry } from "../lib/lab-index";
import type { Achievement } from "../lib/schemas";
import type { PublicThought } from "../lib/thoughts";
const { copy, entries, credentials, projects, outfit, thoughts, profiles } = defineProps<{
  copy: SiteCopy;
  /** The latest Lab entries, as ledger rows. */
  entries: LabEntry[];
  /** The achievements pinned to Experience. */
  credentials: Achievement[];
  projects: Project[];
  outfit: string;
  thoughts: { thoughts: PublicThought[]; featured: string | null };
  profiles: Profile[];
}>();
const links = profiles.filter((p) => p.kind !== "email").map(profileView);
// the address the closing line ends on: the first email profile, else the site contact
const email = profiles.find((p) => p.kind === "email")?.value ?? site.email;
const name = copy.heroTitle.match(/Asad\.?$/)?.[0];
// the body is short paragraphs separated by blank lines in the copy
const body = copy.heroBody.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
</script>
<template>
  <section class="hero">
    <div>
      <h1>{{ copy.heroTitle.replace(/Asad\.?$/, "") }}<em>{{ name }}</em></h1>
      <p class="page-subtitle">{{ subtitles.home }}</p>
    </div>
    <div>
      <p class="lede">{{ copy.heroLede }}</p>
      <p v-for="(p, i) in body" :key="i" class="hero-sub">{{ p }}</p>
    </div>
  </section>

  <Room :hint="copy.roomHint" :outfit="outfit" :thoughts="thoughts.thoughts" :featured="thoughts.featured" />

  <section class="block">
    <header class="block-head">
      <h2>From The Lab</h2>
      <a href="/lab">All entries <PixelIcon name="arrowRight" extra="after" /></a>
    </header>
    <Ledger v-if="entries.length" :entries="entries" />
    <p v-else class="quiet-note">
      Nothing published yet. The first notes are on the bench: experiments, write-ups, and the occasional dead end
      worth keeping.
    </p>
  </section>

  <section v-if="credentials.length" class="block">
    <header class="block-head">
      <h2>Credentials</h2>
      <a href="/achievements">All achievements <PixelIcon name="arrowRight" extra="after" /></a>
    </header>
    <ul class="featured-credentials">
      <li v-for="c in credentials" :key="c.id">
        <a :href="safeHref(c.link)">{{ c.title }}<PixelIcon name="external" extra="ext" /></a>
        <span>{{ c.issuer }}</span>
      </li>
    </ul>
  </section>

  <section class="block">
    <header class="block-head">
      <h2>On the Workbench</h2>
      <a href="/workbench">All projects <PixelIcon name="arrowRight" extra="after" /></a>
    </header>
    <ul class="showcase">
      <li v-for="p in projects" :key="p.slug">
        <div>
          <h3><a :href="`/workbench/${p.slug}`">{{ p.title }}</a></h3>
          <p>{{ p.description }}</p>
          <p class="stack">{{ p.tags.join(" · ") }}</p>
        </div>
      </li>
    </ul>
  </section>

  <section class="block closing">
    <h2>{{ copy.closingTitle }}</h2>
    <p>{{ copy.closingBody }} <a :href="`mailto:${email}`">{{ email }}</a></p>
    <p class="closing-links">
      <a v-for="l in links" :key="l.id" :href="l.href"><PixelIcon :name="l.icon" /> {{ l.label }}<PixelIcon v-if="l.external" name="external" extra="ext" /></a>
      <a href="/experience"><PixelIcon name="briefcase" /> Experience</a>
    </p>
  </section>
</template>
