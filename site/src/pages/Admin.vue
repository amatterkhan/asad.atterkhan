<script setup lang="ts">
import { AdminDesk } from "../islands";
// Owner-only writing desk: unlinked, not indexed. All data goes through /api/admin/* after sign-in.
</script>
<template>
  <p class="eyebrow">Private</p>
  <h1>Writing desk</h1>
  <p class="page-intro">Write notes for The Lab and edit the words on the site.</p>
  <AdminDesk />
</template>
