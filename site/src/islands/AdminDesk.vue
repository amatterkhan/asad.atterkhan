<script setup lang="ts">
import { ref, shallowRef } from "vue";
import type { User } from "firebase/auth";
import OwnerSignIn from "./OwnerSignIn.vue";
import AdminCopy from "./AdminCopy.vue";
import AdminWriting from "./AdminWriting.vue";
import AdminWardrobe from "./AdminWardrobe.vue";
import type { Api } from "./admin-types";

// Owner-only writing desk. Talks to /api/admin/* (the Go API, docs/admin-contract.md) with the
// Firebase ID token.
const user = shallowRef<User | null>(null);
const status = ref("");
const tab = ref<"copy" | "writing" | "wardrobe">("writing");

const api: Api = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  if (!user.value) throw new Error("Sign in first");
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, "Content-Type": "application/json", Authorization: `Bearer ${await user.value.getIdToken()}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
};
</script>
<template>
  <section v-if="!user" class="admin-locked">
    <p class="eyebrow">Owner only</p>
    <h2>Sign in to write.</h2>
    <p>Google sign-in with the owner account, then your authenticator code.</p>
    <OwnerSignIn :user="user" @user="(u) => (user = u)" @status="(s) => (status = s)" />
    <p v-if="status" class="admin-status" role="status">{{ status }}</p>
  </section>
  <section v-else class="admin-desk">
    <div class="admin-tabs" role="tablist" aria-label="Admin sections">
      <button v-for="t in ['writing', 'copy', 'wardrobe'] as const" :key="t" role="tab" :aria-selected="tab === t" @click="tab = t">
        {{ { writing: "Writing", copy: "Site copy", wardrobe: "Wardrobe" }[t] }}
      </button>
      <span class="admin-who">{{ user.email }}</span>
    </div>
    <AdminCopy v-if="tab === 'copy'" :api="api" />
    <AdminWardrobe v-else-if="tab === 'wardrobe'" :api="api" />
    <AdminWriting v-else :api="api" />
  </section>
</template>
