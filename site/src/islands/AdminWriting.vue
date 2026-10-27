<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import PixelIcon from "../components/PixelIcon.vue";
import { slugify, type Api, type Authed, type Draft, type LabMap, type Summary } from "./admin-types";
import { thumbnailPrompt } from "../lib/thumbnail-prompt";
const { api, authed } = defineProps<{ api: Api; authed: Authed }>();
const list = ref<Summary[] | null>(null);
const draft = ref<Draft | null>(null);
const preview = ref<string | null>(null);
const note = ref("");
const creating = ref({ title: "", description: "" });
const filter = ref<"all" | "draft" | "published">("all");
const count = (f: "draft" | "published") => (list.value ?? []).filter((a) => a.status === f).length;
const visible = computed(() => (list.value ?? []).filter((a) => filter.value === "all" || a.status === filter.value));

const refresh = () =>
  api<{ articles: Summary[] }>("/api/admin/articles").then(
    (r) => (list.value = r.articles),
    (e: Error) => (note.value = e.message),
  );
// The Lab map feeds the section and category pickers.
const lab = ref<LabMap>({ sections: [] });
onMounted(() => {
  refresh();
  api<LabMap>("/api/admin/lab").then(
    (m) => (lab.value = m),
    () => {},
  );
});
const sectionOf = (d: Pick<Draft, "section">) => lab.value.sections.find((s) => s.id === d.section);
const categoryOf = (d: Pick<Draft, "section" | "category">) => sectionOf(d)?.categories.find((c) => c.id === d.category);
const shelfName = (a: Summary) => [sectionOf(a)?.name, categoryOf(a)?.name].filter(Boolean).join(" · ");
// Drafts from before the Lab map may carry a free-text category; send only ids the map knows.
const filed = (d: Draft): Draft => (lab.value.sections.length && !categoryOf(d) ? { ...d, category: undefined } : d);
const setSection = (id: string) => {
  draft.value!.section = id || undefined;
  if (!categoryOf(draft.value!)) draft.value!.category = undefined;
};

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
    thumbNote.value = "";
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
    draft.value = await api<Draft>(`/api/admin/articles/${draft.value.slug}`, { method: "PUT", body: JSON.stringify(filed(draft.value)) });
    await refresh();
    note.value = "Draft saved.";
  });
const act = (verb: "publish" | "unpublish") =>
  run(verb === "publish" ? "Publishing…" : "Unpublishing…", async () => {
    if (!draft.value) return;
    const slug = draft.value.slug;
    draft.value = await api<Draft>(`/api/admin/articles/${slug}`, { method: "PUT", body: JSON.stringify(filed(draft.value)) });
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
// Live preview: re-render shortly after typing stops; a counter drops answers that arrive out of order.
const live = ref(false);
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const render = async () => {
  if (!draft.value) return;
  const mine = ++seq;
  try {
    const r = await api<{ html: string }>("/api/admin/preview", { method: "POST", body: JSON.stringify({ body: draft.value.body }) });
    if (mine === seq) preview.value = r.html;
  } catch (e) {
    if (mine === seq) note.value = (e as Error).message;
  }
};
watch(
  () => [live.value, draft.value?.slug, draft.value?.body] as const,
  ([on]) => {
    clearTimeout(timer);
    if (!on) {
      seq++;
      preview.value = null;
    } else if (draft.value) timer = setTimeout(render, preview.value === null ? 0 : 350);
  },
);
onBeforeUnmount(() => {
  clearTimeout(timer);
  if (thumbUrl.value) URL.revokeObjectURL(thumbUrl.value);
});
// Thumbnail: the image is cropped and compressed here (lib/thumbnail-image.ts), stored by the API
// under its hash, and attached by saving the draft. Drafts' thumbnails are private, so the preview
// is fetched with the owner's token.
const thumbUrl = ref<string | null>(null);
const crisp = ref(false);
const thumbNote = ref("");
const showThumb = async (name?: string) => {
  if (thumbUrl.value) URL.revokeObjectURL(thumbUrl.value);
  thumbUrl.value = null;
  if (!name) return;
  const res = await authed(`/api/admin/thumbnails/${name}`);
  if (res.ok && draft.value?.thumbnail === name) thumbUrl.value = URL.createObjectURL(await res.blob());
};
watch(
  () => draft.value?.thumbnail,
  (name) => showThumb(name).catch(() => (thumbNote.value = "Could not load the thumbnail.")),
);
const pickThumb = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !draft.value) return;
  thumbNote.value = "Resizing…";
  try {
    const { makeThumbnail } = await import("../lib/thumbnail-image");
    const blob = await makeThumbnail(file, crisp.value);
    thumbNote.value = `Uploading ${Math.round(blob.size / 1024)} KB…`;
    const form = new FormData();
    form.append("file", blob, `thumbnail.${blob.type === "image/webp" ? "webp" : "jpg"}`);
    const res = await authed("/api/admin/thumbnails", { method: "POST", body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || `Upload failed (${res.status})`);
    draft.value.thumbnail = body.thumbnail;
    thumbNote.value = `${Math.round(body.size / 1024)} KB, 640×360. Save the draft to keep it.`;
  } catch (err) {
    thumbNote.value = (err as Error).message;
  }
};
const removeThumb = () => {
  draft.value!.thumbnail = undefined;
  thumbNote.value = "Removed. Save the draft to keep this.";
};
const copied = ref(false);
const copyPrompt = async () => {
  const d = draft.value!;
  const section = sectionOf(d);
  const category = categoryOf(d);
  await navigator.clipboard.writeText(
    thumbnailPrompt({ title: d.title, description: d.description, tags: d.tags, section, category }),
  );
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};
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
      <details class="admin-new" :open="list !== null && !list.length">
        <summary><PixelIcon name="note" /> New note</summary>
        <form @submit.prevent="create">
          <input v-model="creating.title" placeholder="Title" aria-label="Title" required />
          <input v-model="creating.description" placeholder="One-line description" aria-label="One-line description" required />
          <small>{{ creating.title && `/lab/${slugify(creating.title)}` }}</small>
          <button class="primary" :disabled="!creating.title || !creating.description">Create draft</button>
        </form>
      </details>
      <div class="admin-filter" role="group" aria-label="Filter notes">
        <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">All <small>{{ list?.length ?? 0 }}</small></button>
        <button type="button" :aria-pressed="filter === 'draft'" @click="filter = 'draft'">Drafts <small>{{ count("draft") }}</small></button>
        <button type="button" :aria-pressed="filter === 'published'" @click="filter = 'published'">Live <small>{{ count("published") }}</small></button>
      </div>
      <p v-if="!list" class="admin-status">{{ note || "Loading…" }}</p>
      <p v-else-if="!list.length" class="admin-status">No notes yet.</p>
      <p v-else-if="!visible.length" class="admin-status">Nothing here.</p>
      <ul>
        <li v-for="a in visible" :key="a.slug">
          <button :class="draft?.slug === a.slug ? 'is-open' : ''" :aria-current="draft?.slug === a.slug ? 'true' : undefined" @click="open(a.slug)">
            <strong>{{ a.title }}</strong>
            <small v-if="shelfName(a)" class="admin-list-shelf">{{ shelfName(a) }}</small>
            <span class="admin-list-meta">
              <span :class="`badge ${a.status}`">{{ a.status }}</span>
              <small>{{ new Date(a.modifiedAt).toLocaleDateString() }}</small>
            </span>
          </button>
        </li>
      </ul>
    </aside>

    <form v-if="draft" class="admin-editor" @submit.prevent="save">
      <label><span>Title</span><input v-model="draft.title" /></label>
      <label><span>Description</span><input v-model="draft.description" /></label>
      <div class="admin-row">
        <label class="grow">
          <span>Section</span>
          <select :value="draft.section ?? ''" @change="setSection(($event.target as HTMLSelectElement).value)">
            <option value="">{{ lab.sections.length ? `None (shows in ${lab.sections.at(-1)!.name})` : "None" }}</option>
            <option v-for="sec in lab.sections" :key="sec.id" :value="sec.id">{{ sec.name }}</option>
            <option v-if="draft.section && !sectionOf(draft)" :value="draft.section">{{ draft.section }} (removed)</option>
          </select>
        </label>
        <label class="grow">
          <span>Category</span>
          <select
            :value="categoryOf(draft) ? draft.category : ''"
            :disabled="!sectionOf(draft)?.categories.length"
            @change="draft.category = ($event.target as HTMLSelectElement).value || undefined"
          >
            <option value="">None</option>
            <option v-for="c in sectionOf(draft)?.categories ?? []" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
      </div>
      <div class="admin-thumb">
        <div class="admin-thumb-frame">
          <img v-if="thumbUrl" :src="thumbUrl" alt="Thumbnail preview" width="640" height="360" />
          <span v-else><PixelIcon name="image" /> No thumbnail</span>
        </div>
        <div class="admin-thumb-tools">
          <span class="admin-lab-label">Thumbnail <small>16:9, resized to 640×360 in your browser</small></span>
          <div class="admin-thumb-buttons">
            <label class="admin-file">
              <input type="file" accept="image/png,image/jpeg,image/webp" @change="pickThumb" />
              <span>{{ draft.thumbnail ? "Replace image" : "Upload image" }}</span>
            </label>
            <button v-if="draft.thumbnail" type="button" @click="removeThumb">Remove</button>
            <button type="button" @click="copyPrompt">{{ copied ? "Copied" : "Copy AI prompt" }}</button>
          </div>
          <label class="check"><input v-model="crisp" type="checkbox" /> <span>Crisp pixels (nearest-neighbour scaling)</span></label>
          <small class="admin-status" role="status">{{ thumbNote }}</small>
        </div>
      </div>
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
        <label class="check"><input v-model="live" type="checkbox" /> <span>Live preview</span></label>
        <button type="button" @click="act('publish')">{{ draft.status === "draft" ? "Publish" : "Publish changes" }}</button>
        <button v-if="draft.status === 'published'" type="button" @click="act('unpublish')">Unpublish</button>
        <button v-if="draft.status === 'draft'" type="button" class="danger" @click="remove">Delete</button>
        <span class="admin-status" role="status">{{ note || statusLine(draft) }}</span>
      </div>
    </form>
    <div v-else class="admin-empty">
      <p>Pick a note on the left, or start a new one.</p>
      <p v-if="note && list" class="admin-status" role="status">{{ note }}</p>
    </div>
  </div>
</template>
