<script setup lang="ts">
import RoomVignette from "../components/RoomVignette.vue";
import { groupExperience } from "../lib/experience";
import type { Achievement, Education, Role } from "../lib/schemas";
const { intro, work, education, skills, featured } = defineProps<{
  intro: string;
  work: Role[];
  education: Education[];
  skills: { category: string; items: string }[];
  featured: Achievement[];
}>();
const groups = groupExperience(work);
</script>
<template>
  <p class="eyebrow">Work &amp; education</p>
  <div class="section-head">
    <h1>Experience</h1>
    <button class="print-button" data-print>Print / save PDF</button>
  </div>
  <p class="page-intro">{{ intro }}</p>
  <RoomVignette corner="cv" />
  <section class="career-section">
    <h2>Where I’ve worked</h2>
    <article v-for="group in groups" :key="group.roles[0].id" class="company-group">
      <header>
        <h3>{{ group.company }}</h3>
        <p class="meta">{{ group.dates }}</p>
      </header>
      <ol class="role-timeline">
        <li v-for="role in group.roles" :key="role.id" :class="role.isCurrent ? 'current-role' : ''">
          <div class="role-heading">
            <h4>{{ role.title }}</h4>
            <span v-if="role.isCurrent" class="current-label">Current</span>
          </div>
          <p class="meta">
            {{ role.dateRange }}<span v-if="role.promotionFrom !== undefined" class="progression-note"> · Internal move</span>
          </p>
          <p class="role-summary">{{ role.responsibilities[0] }}</p>
          <details class="role-details">
            <summary>More about this role</summary>
            <ul>
              <li v-for="r in role.responsibilities.slice(1)" :key="r">{{ r }}</li>
            </ul>
          </details>
        </li>
      </ol>
    </article>
  </section>
  <section class="resume-section education-section">
    <h2>Education</h2>
    <article v-for="e in education" :key="e.degree" class="education-entry">
      <div>
        <h3>{{ e.degree }} · {{ e.field }}</h3>
        <p><a :href="e.degreeLink">{{ e.university }} ↗</a></p>
      </div>
      <div>
        <p class="meta">{{ e.isGraduated ? e.graduationDate : "In progress" }}</p>
        <p>{{ e.classification }}</p>
      </div>
    </article>
  </section>
  <section class="resume-section">
    <div class="section-head">
      <h2>Certifications</h2>
      <a href="/achievements">All achievements →</a>
    </div>
    <ul v-if="featured.length" class="featured-credentials">
      <li v-for="c in featured" :key="c.id">
        <a :href="c.link">{{ c.title }} ↗</a>
        <span>{{ c.issuer }}</span>
      </li>
    </ul>
    <p v-else class="quiet-note">The full collection is on the achievements page.</p>
  </section>
  <section class="resume-section">
    <h2>Technical experience</h2>
    <dl class="skills">
      <div v-for="s in skills" :key="s.category">
        <dt>{{ s.category }}</dt>
        <dd>{{ s.items }}</dd>
      </div>
    </dl>
  </section>
</template>
