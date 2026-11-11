<script setup lang="ts">
import Brand from "./Brand.vue";
import Cursor from "./Cursor.vue";
import SiteNav from "./SiteNav.vue";
import { site } from "../lib/site";
import type { Profile } from "../lib/schemas";
const { path, profiles } = defineProps<{ path: string; profiles: Profile[] }>();
const year = new Date().getFullYear();
</script>
<template>
  <Cursor />
  <a href="#main" class="skip">Skip to content</a>
  <div class="wrap">
    <header class="site-header">
      <Brand />
      <SiteNav :path="path" :profiles="profiles" />
    </header>
    <main id="main"><slot /></main>
    <footer class="site-footer">
      <p class="footer-sign"><em>{{ site.description }}</em></p>
      <p>© {{ year }} Asad Atterkhan</p>
    </footer>
  </div>
</template>
