<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import type { User } from "firebase/auth";
import PixelIcon from "../components/PixelIcon.vue";
import OwnerSignIn from "./OwnerSignIn.vue";
import AdminCopy from "./AdminCopy.vue";
import AdminWriting from "./AdminWriting.vue";
import AdminWardrobe from "./AdminWardrobe.vue";
import AdminLab from "./AdminLab.vue";
import AdminThoughts from "./AdminThoughts.vue";
import { syncTheme } from "../behaviors/theme";
import { ownerAuth } from "../lib/firebase-client";
import type { Api, Authed } from "./admin-types";

// Owner-only writing desk. Talks to /api/admin/* (the Go API, docs/admin-contract.md) with the
// Firebase ID token.
const user = shallowRef<User | null>(null);
const status = ref("");
// the console's theme button appears when the user signs in
watch(user, () => nextTick(syncTheme));
const SECTIONS = [
  { id: "writing", label: "Writing", hint: "Notes for The Lab", icon: "note" },
  { id: "lab", label: "Lab map", hint: "Sections and categories of The Lab", icon: "map" },
  { id: "copy", label: "Site copy", hint: "The words on the site", icon: "article" },
  { id: "wardrobe", label: "Wardrobe", hint: "What Asad is wearing", icon: "shirt" },
  { id: "thoughts", label: "Thoughts", hint: "What Asad says in the room", icon: "comment" },
] as const;
type Section = (typeof SECTIONS)[number]["id"];
const tab = ref<Section>("writing");
const section = computed(() => SECTIONS.find((s) => s.id === tab.value)!);

// The section lives in the hash, so a reload (or a link) lands where you were.
onMounted(() => {
  const fromHash = () => {
    const id = location.hash.slice(1);
    if (SECTIONS.some((s) => s.id === id)) tab.value = id as Section;
  };
  fromHash();
  addEventListener("hashchange", fromHash);
});

// The sidebar collapses to icons; the choice is remembered in this browser.
const collapsed = ref(false);
const menuOpen = ref(false);
const profile = ref<HTMLElement | null>(null);
onMounted(() => {
  try {
    collapsed.value = localStorage.getItem("console-collapsed") === "1";
  } catch {}
  addEventListener("click", (e) => {
    if (menuOpen.value && !profile.value?.contains(e.target as Node)) menuOpen.value = false;
  });
});
const toggleSide = () => {
  collapsed.value = !collapsed.value;
  menuOpen.value = false;
  try {
    localStorage.setItem("console-collapsed", collapsed.value ? "1" : "0");
  } catch {}
};
const go = (id: Section) => {
  tab.value = id;
  history.replaceState(null, "", `#${id}`);
};
const signOut = async () => {
  const { signOut } = await import("firebase/auth");
  await signOut(await ownerAuth());
  menuOpen.value = false;
  user.value = null;
  status.value = "Signed out.";
};

const authed: Authed = async (path, init = {}) => {
  if (!user.value) throw new Error("Sign in first");
  return fetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await user.value.getIdToken()}` }, cache: "no-store" });
};
const api: Api = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await authed(path, { ...init, headers: { ...init.headers, "Content-Type": "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  if (body === null) throw new Error(`The admin API did not answer (${path} returned something that is not JSON). Is the Go API running and proxied?`);
  return body as T;
};
</script>
<template>
  <section v-if="!user" class="admin-locked">
    <p class="eyebrow">Owner only</p>
    <h1>Admin console</h1>
    <p>Google sign-in with the owner account, then your authenticator code.</p>
    <OwnerSignIn :user="user" @user="(u) => (user = u)" @status="(s) => (status = s)" />
    <p v-if="status" class="admin-status" role="status">{{ status }}</p>
  </section>
  <div v-else :class="['console', { 'is-collapsed': collapsed }]">
    <aside class="console-side" aria-label="Console">
      <div class="console-side-head">
        <a class="brand" href="/" :aria-label="collapsed ? 'Asad.exe, home' : undefined">{{ collapsed ? "A" : "Asad" }}<span>{{ collapsed ? "" : ".exe" }}</span></a>
        <button
          type="button"
          class="console-collapse"
          :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-expanded="!collapsed"
          @click="toggleSide"
        >
          <PixelIcon :name="collapsed ? 'chevronRight' : 'chevronLeft'" />
        </button>
      </div>
      <p class="console-label">Console</p>
      <nav aria-label="Admin sections">
        <a
          v-for="s in SECTIONS"
          :key="s.id"
          :href="`#${s.id}`"
          :title="collapsed ? s.label : undefined"
          :aria-current="tab === s.id ? 'page' : undefined"
          @click.prevent="go(s.id)"
        >
          <PixelIcon :name="s.icon" />
          <span class="console-text">{{ s.label }}</span>
        </a>
      </nav>
      <div class="console-side-foot">
        <a href="/lab" class="console-site" :title="collapsed ? 'View site' : undefined">
          <PixelIcon name="external" /><span class="console-text">View site</span>
        </a>
        <div ref="profile" class="console-profile">
          <button
            type="button"
            class="console-profile-btn"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            :aria-label="`Account: ${user.email ?? 'owner'}`"
            @click="menuOpen = !menuOpen"
            @keydown.esc="menuOpen = false"
          >
            <span class="console-avatar"><PixelIcon name="user" /></span>
          </button>
          <div v-if="menuOpen" class="console-menu" role="menu" @keydown.esc="menuOpen = false">
            <p class="console-menu-who">Signed in as<br /><strong>{{ user.email }}</strong></p>
            <button type="button" role="menuitem" @click="signOut"><PixelIcon name="logout" /> Sign out</button>
          </div>
        </div>
      </div>
    </aside>
    <div class="console-main">
      <header class="console-bar">
        <div class="console-title">
          <h1>{{ section.label }}</h1>
          <p>{{ section.hint }}</p>
        </div>
        <div class="console-tools">
          <button class="theme-toggle" type="button" aria-label="Switch colour theme" aria-pressed="false" data-theme-toggle hidden>
            <PixelIcon name="sun" extra="icon-sun" />
            <PixelIcon name="moon" extra="icon-moon" />
          </button>
        </div>
      </header>
      <div class="console-body">
        <AdminCopy v-if="tab === 'copy'" :api="api" />
        <AdminWardrobe v-else-if="tab === 'wardrobe'" :api="api" />
        <AdminLab v-else-if="tab === 'lab'" :api="api" />
        <AdminThoughts v-else-if="tab === 'thoughts'" :api="api" />
        <AdminWriting v-else :api="api" :authed="authed" />
      </div>
    </div>
  </div>
</template>
