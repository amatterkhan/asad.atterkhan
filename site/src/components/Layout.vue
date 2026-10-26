<script setup lang="ts">
import { site } from "../lib/site";
import Brand from "./Brand.vue";
import Cursor from "./Cursor.vue";
import PixelIcon from "./PixelIcon.vue";
import SiteNav from "./SiteNav.vue";
const { path } = defineProps<{ path: string }>();
const year = new Date().getFullYear();
</script>
<template>
  <Cursor />
  <a href="#main" class="skip">Skip to content</a>
  <div class="wrap">
    <header class="site-header">
      <Brand />
      <SiteNav :path="path" />
    </header>
    <main id="main"><slot /></main>
    <footer class="site-footer">
      <p>© {{ year }} Asad Atterkhan</p>
      <div class="footer-meta">
        <a :href="`mailto:${site.email}`"><PixelIcon name="mail" /> Email</a>
        <a :href="site.github"><PixelIcon name="github" /> GitHub</a>
        <a :href="site.linkedin"><PixelIcon name="linkedin" /> LinkedIn</a>
      </div>
    </footer>
  </div>
</template>
