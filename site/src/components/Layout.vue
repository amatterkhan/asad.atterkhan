<script setup lang="ts">
import Brand from "./Brand.vue";
import Cursor from "./Cursor.vue";
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
    </footer>
  </div>
</template>
