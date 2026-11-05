<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Api, ExperienceState } from "./admin-types";
// The Experience page: roles (oldest first), education and skills. The description is one line per
// bullet; the first line is the summary shown on the page.
const { api } = defineProps<{ api: Api }>();
// Dates are stored as "May 2025 - August 2025" (or "… - Present") and edited as months.
type EditRole = { id: number; title: string; company: string; from: string; to: string; duties: string; promotionFrom: number | ""; isCurrent: boolean };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const toMonth = (text: string) => {
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(text.trim());
  const i = m ? MONTHS.findIndex((n) => n.slice(0, 3).toLowerCase() === m[1].slice(0, 3).toLowerCase()) : -1;
  return i < 0 ? "" : `${m![2]}-${String(i + 1).padStart(2, "0")}`;
};
const fromMonth = (v: string) => (/^\d{4}-\d{2}$/.test(v) ? `${MONTHS[Number(v.slice(5)) - 1]} ${v.slice(0, 4)}` : "");
const roles = ref<EditRole[] | null>(null);
const education = ref<ExperienceState["education"]>([]);
const skills = ref<ExperienceState["skills"]>([]);
const updatedAt = ref<string>();
const note = ref("");
const dirty = ref(false);
const touch = () => (dirty.value = true);

const load = (s: ExperienceState) => {
  roles.value = s.work.map((r) => ({ id: r.id, title: r.title, company: r.company, from: toMonth(r.dateRange.split(" - ")[0]), to: toMonth(r.dateRange.split(" - ")[1] ?? ""), duties: r.responsibilities.join("\n"), promotionFrom: r.promotionFrom ?? "", isCurrent: !!r.isCurrent }));
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
  roles.value!.push({ id, title: "", company: "", from: "", to: "", duties: "", promotionFrom: "", isCurrent: false });
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
  for (const r of roles.value ?? []) if (!r.title.trim() || !r.company.trim() || !r.from || (!r.isCurrent && !r.to) || !lines(r.duties).length) return "Every role needs a title, company, dates and a description.";
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
        dateRange: `${fromMonth(r.from)} - ${r.isCurrent ? "Present" : fromMonth(r.to)}`,
        responsibilities: lines(r.duties),
        ...(r.promotionFrom !== "" ? { promotionFrom: r.promotionFrom } : {}),
        ...(r.isCurrent ? { isCurrent: true } : {}),
      })),
      education: education.value,
      skills: skills.value,
    };
    load(await api<ExperienceState>("/api/admin/experience", { method: "PUT", body: JSON.stringify(body) }));
    note.value = "Saved.";
  } catch (e) {
    note.value = (e as Error).message;
  }
};
</script>
<template>
  <p v-if="!roles" class="admin-status" role="status">{{ note || "Loading…" }}</p>
  <form v-else class="admin-form admin-experience" @submit.prevent="save">
    <fieldset v-for="(r, i) in roles" :key="r.id" class="admin-lab-section">
      <legend>{{ r.title || "New role" }}</legend>
      <div class="admin-lab-order">
        <button type="button" :disabled="i === 0" aria-label="Move role up" @click="move(roles, i, -1)">↑</button>
        <button type="button" :disabled="i === roles.length - 1" aria-label="Move role down" @click="move(roles, i, 1)">↓</button>
        <button type="button" class="danger" @click="removeRole(i)">Remove</button>
      </div>
      <div class="admin-row">
        <label class="grow"><span>Title</span><input v-model="r.title" maxlength="100" @input="touch" /></label>
        <label class="grow"><span>Company</span><input v-model="r.company" maxlength="100" @input="touch" /></label>
      </div>
      <div class="admin-row">
        <label class="grow"><span>From</span><input v-model="r.from" type="month" @input="touch" /></label>
        <label class="grow"><span>To</span><input v-if="r.isCurrent" value="Present" disabled aria-label="To: Present" />
          <input v-else v-model="r.to" type="month" @input="touch" /></label>
        <label class="grow">
          <span>Internal move from</span>
          <select v-model="r.promotionFrom" @change="touch">
            <option value="">None</option>
            <option v-for="o in roles.filter((x) => x.id !== r.id)" :key="o.id" :value="o.id">{{ o.title || `Role ${o.id}` }}</option>
          </select>
        </label>
      </div>
      <label class="admin-check"><input v-model="r.isCurrent" type="checkbox" @change="touch" /><span>Current role</span></label>
      <label class="text"><span>Description</span><textarea v-model="r.duties" rows="6" @input="touch" /></label>
    </fieldset>
    <button type="button" class="admin-add" :disabled="roles.length >= 12" @click="addRole">+ Add role</button>

    <fieldset v-for="(e, i) in education" :key="i" class="admin-lab-section">
      <legend>{{ e.degree || "New degree" }}</legend>
      <div class="admin-lab-order">
        <button type="button" :disabled="i === 0" aria-label="Move degree up" @click="move(education, i, -1)">↑</button>
        <button type="button" :disabled="i === education.length - 1" aria-label="Move degree down" @click="move(education, i, 1)">↓</button>
        <button type="button" class="danger" @click="splice(education, i)">Remove</button>
      </div>
      <div class="admin-row">
        <label class="grow"><span>Degree</span><input v-model="e.degree" maxlength="100" @input="touch" /></label>
        <label class="grow"><span>Field</span><input v-model="e.field" maxlength="100" @input="touch" /></label>
      </div>
      <div class="admin-row">
        <label class="grow"><span>University</span><input v-model="e.university" maxlength="100" @input="touch" /></label>
        <label class="grow"><span>Link</span><input v-model="e.degreeLink" type="url" maxlength="500" @input="touch" /></label>
      </div>
      <div class="admin-row">
        <label class="grow"><span>Classification</span><input v-model="e.classification" maxlength="60" @input="touch" /></label>
        <label class="grow"><span>Graduation</span><input v-model="e.graduationDate" maxlength="40" @input="touch" /></label>
      </div>
      <label class="admin-check"><input v-model="e.isGraduated" type="checkbox" @change="touch" /><span>Graduated</span></label>
    </fieldset>
    <button type="button" class="admin-add" :disabled="education.length >= 6" @click="addEducation">+ Add degree</button>

    <fieldset v-for="(k, i) in skills" :key="i" class="admin-lab-section">
      <legend>{{ k.category || "New group" }}</legend>
      <div class="admin-lab-order">
        <button type="button" :disabled="i === 0" aria-label="Move group up" @click="move(skills, i, -1)">↑</button>
        <button type="button" :disabled="i === skills.length - 1" aria-label="Move group down" @click="move(skills, i, 1)">↓</button>
        <button type="button" class="danger" @click="splice(skills, i)">Remove</button>
      </div>
      <label class="line"><span>Group</span><input v-model="k.category" maxlength="60" @input="touch" /></label>
      <label class="text"><span>Skills</span><textarea v-model="k.items" rows="3" maxlength="500" @input="touch" /></label>
    </fieldset>
    <button type="button" class="admin-add" :disabled="skills.length >= 10" @click="addSkill">+ Add skill group</button>

    <div class="admin-actions">
      <button class="primary" :disabled="!dirty">Save</button>
      <span class="admin-status" role="status">{{ note || (dirty ? "Unsaved changes." : updatedAt ? `Saved ${new Date(updatedAt).toLocaleString()}` : "") }}</span>
    </div>
  </form>
</template>
