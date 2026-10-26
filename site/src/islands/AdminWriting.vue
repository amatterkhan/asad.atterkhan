<script setup lang="ts">
import { onMounted, ref } from "vue";
import { slugify, type Api, type Draft, type Summary } from "./admin-types";
const { api } = defineProps<{ api: Api }>();
const list = ref<Summary[] | null>(null);
const draft = ref<Draft | null>(null);
const preview = ref<string | null>(null);
const note = ref("");
const creating = ref({ title: "", description: "" });

const refresh = () =>
  api<{ articles: Summary[] }>("/api/admin/articles").then(
    (r) => (list.value = r.articles),
    (e: Error) => (note.value = e.message),
  );
onMounted(refresh);

const run = async (label: string, fn: () => Promise<void>) => {
  note.value = label;
  try {
    await fn();
  } catch (e) {
    note.value = (e as Error).message;
  }
};
const open = (slug: string) =>
  run("Opening…", async () => {
    draft.value = await api<Draft>(`/api/admin/articles/${slug}`);
    preview.value = null;
    note.value = "";
  });
const create = () =>
  run("Creating…", async () => {
    const slug = slugify(creating.value.title);
    const d = await api<Draft>("/api/admin/articles", { method: "POST", body: JSON.stringify({ ...creating.value, slug }) });
    creating.value = { title: "", description: "" };
    draft.value = d;
    await refresh();
    note.value = "New draft created.";
  });
const save = () =>
  run("Saving…", async () => {
    if (!draft.value) return;
    draft.value = await api<Draft>(`/api/admin/articles/${draft.value.slug}`, { method: "PUT", body: JSON.stringify(draft.value) });
    await refresh();
    note.value = "Draft saved.";
  });
const act = (verb: "publish" | "unpublish") =>
  run(verb === "publish" ? "Publishing…" : "Unpublishing…", async () => {
    if (!draft.value) return;
    const slug = draft.value.slug;
    draft.value = await api<Draft>(`/api/admin/articles/${slug}`, { method: "PUT", body: JSON.stringify(draft.value) });
    draft.value = await api<Draft>(`/api/admin/articles/${slug}/${verb}`, { method: "POST" });
    await refresh();
    note.value =
      verb === "publish" ? `Published. /lab/${slug} goes live when the site rebuild finishes.` : "Unpublished. The rebuild removes it from the site.";
  });
const remove = () =>
  run("Deleting…", async () => {
    if (!draft.value || !confirm(`Delete the draft “${draft.value.title}”? This can't be undone.`)) {
      note.value = "";
      return;
    }
    await api(`/api/admin/articles/${draft.value.slug}`, { method: "DELETE" });
    draft.value = null;
    await refresh();
    note.value = "Draft deleted.";
  });
const showPreview = () =>
  run("Rendering preview…", async () => {
    if (!draft.value) return;
    const r = await api<{ html: string }>("/api/admin/preview", { method: "POST", body: JSON.stringify({ body: draft.value.body }) });
    preview.value = r.html;
    note.value = "";
  });
const tagsText = (d: Draft) => d.tags.join(", ");
const setTags = (value: string) => {
  draft.value!.tags = value.split(",").map((t) => t.trim()).filter(Boolean);
};
const statusLine = (d: Draft) =>
  `/lab/${d.slug} · ${d.status}${d.status === "published" && (d.publishedVersion ?? d.version) < d.version ? " · edits not yet published" : ""}`;
</script>
<template>
  <div class="admin-writing">
    <aside class="admin-list">
      <form class="admin-new" @submit.prevent="create">
        <p class="eyebrow">New note</p>
        <input v-model="creating.title" placeholder="Title" required />
        <input v-model="creating.description" placeholder="One-line description" required />
        <small>{{ creating.title && `/lab/${slugify(creating.title)}` }}</small>
        <button :disabled="!creating.title || !creating.description">Create draft</button>
      </form>
      <p class="eyebrow">Notes</p>
      <p v-if="!list" class="admin-status">Loading…</p>
      <p v-else-if="!list.length" class="admin-status">No notes yet.</p>
      <ul>
        <li v-for="a in list ?? []" :key="a.slug">
          <button :class="draft?.slug === a.slug ? 'is-open' : ''" @click="open(a.slug)">
            <span :class="`badge ${a.status}`">{{ a.status }}</span>
            <strong>{{ a.title }}</strong>
            <small>{{ new Date(a.modifiedAt).toLocaleDateString() }}</small>
          </button>
        </li>
      </ul>
    </aside>

    <form v-if="draft" class="admin-editor" @submit.prevent="save">
      <div class="admin-row">
        <label class="grow"><span>Title</span><input v-model="draft.title" /></label>
        <label><span>Category</span><input :value="draft.category ?? ''" @input="draft.category = ($event.target as HTMLInputElement).value || undefined" /></label>
      </div>
      <label><span>Description</span><input v-model="draft.description" /></label>
      <div class="admin-row">
        <label class="grow">
          <span>Tags (comma separated)</span>
          <input :value="tagsText(draft)" @input="setTags(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="check"><input v-model="draft.featured" type="checkbox" /> <span>Featured</span></label>
      </div>
      <div class="admin-body">
        <label class="markdown">
          <span>Body (Markdown, ```mermaid and ```flow supported)</span>
          <textarea v-model="draft.body" rows="24" spellcheck="true" />
        </label>
        <div v-if="preview !== null" class="admin-preview">
          <span>Preview</span>
          <div class="prose" v-html="preview" />
        </div>
      </div>
      <div class="admin-actions">
        <button class="primary">Save draft</button>
        <button type="button" @click="showPreview">Preview</button>
        <button type="button" @click="act('publish')">{{ draft.status === "draft" ? "Publish" : "Publish changes" }}</button>
        <button v-if="draft.status === 'published'" type="button" @click="act('unpublish')">Unpublish</button>
        <button v-if="draft.status === 'draft'" type="button" class="danger" @click="remove">Delete</button>
        <span class="admin-status" role="status">{{ note || statusLine(draft) }}</span>
      </div>
    </form>
    <div v-else class="admin-empty">
      <p>Pick a note on the left, or start a new one.</p>
      <p v-if="note" class="admin-status">{{ note }}</p>
    </div>
  </div>
</template>
