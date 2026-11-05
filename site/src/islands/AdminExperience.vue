<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import PixelIcon from "../components/PixelIcon.vue";
import type { Api, ExperienceState } from "./admin-types";
// The Experience page: roles (oldest first, as on the page's timeline source), education and
// skills. Saving rebuilds the site. Responsibilities are one per line; the first is the summary.
const { api } = defineProps<{ api: Api }>();
type EditRole = { id: number; title: string; company: string; dateRange: string; duties: string; promotionFrom: number | ""; isCurrent: boolean };
const roles = ref<EditRole[] | null>(null);
const education = ref<ExperienceState["education"]>([]);
const skills = ref<ExperienceState["skills"]>([]);
const updatedAt = ref<string>();
const note = ref("");
const dirty = ref(false);
const touch = () => (dirty.value = true);

const load = (s: ExperienceState) => {
  roles.value = s.work.map((r) => ({ id: r.id, title: r.title, company: r.company, dateRange: r.dateRange, duties: r.responsibilities.join("\n"), promotionFrom: r.promotionFrom ?? "", isCurrent: !!r.isCurrent }));
  education.value = s.education.map((e) => ({ ...e }));
  skills.value = s.skills.map((k) => ({ ...k }));
  updatedAt.value = s.updatedAt;
  dirty.value = false;
};
onMounted(() => api<ExperienceState>("/api/admin/experience").then(load, (e: Error) => (note.value = e.message)));

const move = (list: unknown[], i: number, by: number) => {
  const j = i + by;
  if (j < 0 || j >= list.length) return;
  list.splice(j, 0, ...list.splice(i, 1));
  touch();
};
const addRole = () => {
  const id = Math.max(-1, ...roles.value!.map((r) => r.id)) + 1;
  roles.value!.push({ id, title: "", company: "", dateRange: "", duties: "", promotionFrom: "", isCurrent: false });
  touch();
};
const removeRole = (i: number) => {
  const gone = roles.value![i].id;
  roles.value!.splice(i, 1);
  for (const r of roles.value!) if (r.promotionFrom === gone) r.promotionFrom = "";
  touch();
};
const addEducation = () => {
  education.value.push({ degree: "", field: "", university: "", classification: "", degreeLink: "https://", graduationDate: "", isGraduated: false });
  touch();
};
const addSkill = () => {
  skills.value.push({ category: "", items: "" });
  touch();
};
const splice = (list: unknown[], i: number) => {
  list.splice(i, 1);
  touch();
};
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const problem = computed(() => {
  for (const r of roles.value ?? []) if (!r.title.trim() || !r.company.trim() || !r.dateRange.trim() || !lines(r.duties).length) return "Every role needs a title, company, dates and at least one line.";
  for (const e of education.value) if (!e.degree.trim() || !e.field.trim() || !e.university.trim() || !/^https:\/\//.test(e.degreeLink)) return "Every degree needs a name, field, university and an https link.";
  for (const k of skills.value) if (!k.category.trim() || !k.items.trim()) return "Every skill group needs a name and items.";
  return "";
});
const save = async () => {
  if (problem.value) return void (note.value = problem.value);
  note.value = "Saving…";
  try {
    const body: ExperienceState = {
      work: roles.value!.map((r) => ({
        id: r.id,
        title: r.title.trim(),
        company: r.company.trim(),
        dateRange: r.dateRange.trim(),
        responsibilities: lines(r.duties),
        ...(r.promotionFrom !== "" ? { promotionFrom: r.promotionFrom } : {}),
        ...(r.isCurrent ? { isCurrent: true } : {}),
      })),
      education: education.value,
      skills: skills.value,
    };
    load(await api<ExperienceState>("/api/admin/experience", { method: "PUT", body: JSON.stringify(body) }));
    note.value = "Saved. The Experience page updates once the site rebuild finishes.";
  } catch (e) {
    note.value = (e as Error).message;
  }
};
</script>
<template>
  <p v-if="!roles" class="admin-status" role="status">{{ note || "Loading Experience…" }}</p>
  <form v-else class="admin-form" @submit.prevent="save">
    <p class="admin-lede">The Experience page. Roles run oldest first; the page groups consecutive roles at one company. One line per bullet: the first is the summary shown on the page.</p>
    <fieldset v-for="(r, i) in roles" :key="r.id">
      <legend>Role {{ i + 1 }}{{ r.title ? ` · ${r.title}` : "" }}</legend>
      <label class="line"><span>Title</span><input v-model="r.title" maxlength="100" @input="touch" /></label>
      <label class="line"><span>Company</span><input v-model="r.company" maxlength="100" @input="touch" /></label>
      <label class="line"><span>Dates (e.g. May 2025 - August 2025)</span><input v-model="r.dateRange" maxlength="60" @input="touch" /></label>
      <label class="text"><span>Bullets (one per line)</span><textarea v-model="r.duties" rows="6" @input="touch" /></label>
      <label class="line">
        <span>Internal move from</span>
        <select v-model="r.promotionFrom" @change="touch">
          <option value="">Not an internal move</option>
          <option v-for="o in roles.filter((x) => x.id !== r.id)" :key="o.id" :value="o.id">{{ o.title || `Role ${o.id}` }}</option>
        </select>
      </label>
      <label class="admin-check"><input v-model="r.isCurrent" type="checkbox" @change="touch" /><span>Current role</span></label>
      <div class="admin-actions">
        <button type="button" :disabled="i === 0" @click="move(roles, i, -1)">Move up</button>
        <button type="button" :disabled="i === roles.length - 1" @click="move(roles, i, 1)">Move down</button>
        <button type="button" :aria-label="`Remove ${r.title || 'role'}`" @click="removeRole(i)"><PixelIcon name="close" /></button>
      </div>
    </fieldset>
    <button type="button" :disabled="roles.length >= 12" @click="addRole">Add role</button>

    <fieldset v-for="(e, i) in education" :key="i">
      <legend>Education {{ i + 1 }}{{ e.degree ? ` · ${e.degree}` : "" }}</legend>
      <label class="line"><span>Degree</span><input v-model="e.degree" maxlength="100" @input="touch" /></label>
      <label class="line"><span>Field</span><input v-model="e.field" maxlength="100" @input="touch" /></label>
      <label class="line"><span>University</span><input v-model="e.university" maxlength="100" @input="touch" /></label>
      <label class="line"><span>Link (https://…)</span><input v-model="e.degreeLink" maxlength="500" @input="touch" /></label>
      <label class="line"><span>Classification</span><input v-model="e.classification" maxlength="60" @input="touch" /></label>
      <label class="line"><span>Graduation date</span><input v-model="e.graduationDate" maxlength="40" @input="touch" /></label>
      <label class="admin-check"><input v-model="e.isGraduated" type="checkbox" @change="touch" /><span>Graduated</span></label>
      <div class="admin-actions">
        <button type="button" :disabled="i === 0" @click="move(education, i, -1)">Move up</button>
        <button type="button" :disabled="i === education.length - 1" @click="move(education, i, 1)">Move down</button>
        <button type="button" :aria-label="`Remove ${e.degree || 'degree'}`" @click="splice(education, i)"><PixelIcon name="close" /></button>
      </div>
    </fieldset>
    <button type="button" :disabled="education.length >= 6" @click="addEducation">Add degree</button>

    <fieldset v-for="(k, i) in skills" :key="i">
      <legend>Skills {{ i + 1 }}{{ k.category ? ` · ${k.category}` : "" }}</legend>
      <label class="line"><span>Group</span><input v-model="k.category" maxlength="60" @input="touch" /></label>
      <label class="text"><span>Items (comma separated)</span><textarea v-model="k.items" rows="3" maxlength="500" @input="touch" /></label>
      <div class="admin-actions">
        <button type="button" :disabled="i === 0" @click="move(skills, i, -1)">Move up</button>
        <button type="button" :disabled="i === skills.length - 1" @click="move(skills, i, 1)">Move down</button>
        <button type="button" :aria-label="`Remove ${k.category || 'group'}`" @click="splice(skills, i)"><PixelIcon name="close" /></button>
      </div>
    </fieldset>
    <button type="button" :disabled="skills.length >= 10" @click="addSkill">Add skill group</button>

    <div class="admin-actions">
      <button class="primary" :disabled="!dirty">Save Experience</button>
      <span class="admin-status" role="status">{{ note || problem || (dirty ? "Unsaved changes." : updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Showing the starting set.") }}</span>
    </div>
  </form>
</template>
