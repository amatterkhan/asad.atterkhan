<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Api, WardrobeState } from "./admin-types";
// Asad's outfits live as files in public/art/outfits/ (platform/scripts/outfits.py); this picks the
// one the room and the About vignette show.
const { api } = defineProps<{ api: Api }>();
const state = ref<WardrobeState | null>(null);
const picked = ref("");
const note = ref("");
onMounted(() =>
  api<WardrobeState>("/api/admin/wardrobe").then(
    (w) => (Array.isArray(w.outfits) ? ((state.value = w), (picked.value = w.activeOutfit)) : (note.value = "The wardrobe response was malformed.")),
    (e: Error) => (note.value = e.message),
  ),
);
const save = async () => {
  note.value = "Saving…";
  try {
    const saved = await api<{ activeOutfit: string; updatedAt: string }>("/api/admin/wardrobe", {
      method: "PUT",
      body: JSON.stringify({ activeOutfit: picked.value }),
    });
    state.value = { ...state.value!, ...saved };
    note.value = "Saved. The site rebuilds with it in a minute or two.";
  } catch (e) {
    note.value = (e as Error).message;
  }
};
</script>
<template>
  <p v-if="!state" class="admin-status" role="status">{{ note || "Loading the wardrobe…" }}</p>
  <p v-else-if="!state.outfits.length" class="admin-status" role="status">No outfits found in public/art/outfits.</p>
  <form v-else class="admin-form" @submit.prevent="save">
    <fieldset>
      <legend>What Asad is wearing</legend>
      <div class="wardrobe" role="radiogroup" aria-label="Outfits">
        <label v-for="o in state.outfits" :key="o.id" :class="['wardrobe-item', { 'is-picked': picked === o.id }]">
          <input v-model="picked" type="radio" name="outfit" :value="o.id" />
          <img :src="o.preview" alt="" width="128" height="152" />
          <strong>{{ o.name }}</strong>
          <small>{{ o.description }}</small>
          <small class="wardrobe-tags">
            <span v-if="o.id === state.activeOutfit" class="badge published">on the site</span>
            <span v-if="o.id === state.defaultOutfit" class="badge draft">default</span>
          </small>
        </label>
      </div>
    </fieldset>
    <div class="admin-actions">
      <button class="primary" :disabled="picked === state.activeOutfit">Wear this outfit</button>
      <span class="admin-status" role="status">{{ note }}{{ state.updatedAt ? ` · last changed ${new Date(state.updatedAt).toLocaleString()}` : "" }}</span>
    </div>
  </form>
</template>
