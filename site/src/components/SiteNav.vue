<script setup lang="ts">
import { profileView } from "../lib/profiles";
import type { Profile } from "../lib/schemas";
import Brand from "./Brand.vue";
import PixelIcon from "./PixelIcon.vue";
// Rendered once at build time; behaviors/nav.ts opens and closes the dialog.
const { path, profiles } = defineProps<{ path: string; profiles: Profile[] }>();
const profileLinks = profiles.map(profileView);
const links = [
  ["/lab", "The Lab"],
  ["/workbench", "Workbench"],
  ["/experience", "Experience"],
  ["/achievements", "Achievements"],
  ["/about", "About"],
] as const;
const current = (href: string) =>
  path.startsWith(href) || (href === "/lab" && path.startsWith("/preview/")) ? "page" : undefined;
</script>
<template>
  <div class="header-end">
    <nav class="desktop-nav" aria-label="Main navigation">
      <a v-for="[href, label] in links" :key="href" :href="href" :aria-current="current(href)">{{ label }}</a>
    </nav>
    <!-- shown by behaviors/theme.ts; without JavaScript it cannot do anything -->
    <button class="theme-toggle" type="button" aria-label="Switch colour theme" aria-pressed="false" data-theme-toggle hidden>
      <PixelIcon name="sun" extra="icon-sun" />
      <PixelIcon name="moon" extra="icon-moon" />
    </button>
    <button class="menu-trigger" aria-label="Open navigation menu" aria-haspopup="dialog" data-menu-open>
      <span aria-hidden="true">Menu</span>
    </button>
  </div>
  <dialog aria-label="Navigation menu" class="mobile-menu" data-menu>
    <div class="mobile-menu-head">
      <Brand />
      <button aria-label="Close navigation menu" data-menu-close><PixelIcon name="close" /></button>
    </div>
    <nav aria-label="Mobile navigation">
      <a v-for="[href, label] in links" :key="href" :href="href" :aria-current="current(href)">{{ label }}</a>
    </nav>
    <div v-if="profileLinks.length" class="mobile-menu-links">
      <a v-for="l in profileLinks" :key="l.id" :href="l.href"><PixelIcon :name="l.icon" /> <span>{{ l.label }}</span></a>
    </div>
  </dialog>
  <noscript>
    <nav class="noscript-nav" aria-label="Navigation without JavaScript">
      <a v-for="[href, label] in links" :key="href" :href="href">{{ label }}</a>
    </nav>
  </noscript>
</template>
