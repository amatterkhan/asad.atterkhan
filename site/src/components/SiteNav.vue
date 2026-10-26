<script setup lang="ts">
import { site } from "../lib/site";
import Brand from "./Brand.vue";
import PixelIcon from "./PixelIcon.vue";
// Rendered once at build time; behaviors/nav.ts opens and closes the dialog.
const { path } = defineProps<{ path: string }>();
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
  <nav class="desktop-nav" aria-label="Main navigation">
    <a v-for="[href, label] in links" :key="href" :href="href" :aria-current="current(href)">{{ label }}</a>
  </nav>
  <button class="menu-trigger" aria-label="Open navigation menu" aria-haspopup="dialog" data-menu-open>
    <span aria-hidden="true">Menu</span>
  </button>
  <dialog aria-label="Navigation menu" class="mobile-menu" data-menu>
    <div class="mobile-menu-head">
      <Brand />
      <button aria-label="Close navigation menu" data-menu-close>×</button>
    </div>
    <nav aria-label="Mobile navigation">
      <a v-for="[href, label] in links" :key="href" :href="href" :aria-current="current(href)">{{ label }}</a>
    </nav>
    <div class="mobile-menu-links">
      <a :href="site.github"><PixelIcon name="github" /> <span>GitHub</span></a>
      <a :href="site.linkedin"><PixelIcon name="linkedin" /> <span>LinkedIn</span></a>
      <a :href="`mailto:${site.email}`"><PixelIcon name="mail" /> <span>Email</span></a>
    </div>
  </dialog>
  <noscript>
    <nav class="noscript-nav" aria-label="Navigation without JavaScript">
      <a v-for="[href, label] in links" :key="href" :href="href">{{ label }}</a>
    </nav>
  </noscript>
</template>
