<script setup lang="ts">
import { markRaw, ref, shallowRef, watch } from "vue";
import type { MultiFactorResolver, MultiFactorError, TotpSecret, User } from "firebase/auth";
import { ownerAuth } from "../lib/firebase-client";

// Google sign-in for the owner, then the TOTP second factor (or enrolling one).
const { user } = defineProps<{ user: User | null }>();
const emit = defineEmits<{ user: [User | null]; status: [string] }>();
const resolver = shallowRef<MultiFactorResolver | null>(null);
const secret = shallowRef<TotpSecret | null>(null);
const code = ref("");
const canEnroll = ref(false);
const busy = ref(false);

watch(
  () => user,
  (u) => {
    if (u)
      import("firebase/auth").then(({ multiFactor }) => {
        canEnroll.value = !multiFactor(u).enrolledFactors.some((f) => f.factorId === "totp");
      });
  },
  { immediate: true },
);

async function run(fn: () => Promise<void>) {
  busy.value = true;
  try {
    await fn();
  } catch (e) {
    emit("status", e instanceof Error ? e.message : "Authentication failed");
  } finally {
    busy.value = false;
  }
}
const signIn = () =>
  run(async () => {
    const auth = await ownerAuth();
    const { GoogleAuthProvider, signInWithPopup, getMultiFactorResolver } = await import("firebase/auth");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      emit("user", markRaw(result.user));
      emit("status", "Signed in. Owner authorization and an authenticator factor are required for document access.");
    } catch (error) {
      if ((error as { code?: string }).code === "auth/multi-factor-auth-required") {
        resolver.value = markRaw(getMultiFactorResolver(auth, error as MultiFactorError));
        emit("status", "Enter a code from your authenticator.");
        return;
      }
      throw error;
    }
  });
const verify = () =>
  run(async () => {
    const { TotpMultiFactorGenerator } = await import("firebase/auth");
    const r = resolver.value!;
    const hint = r.hints.find((h) => h.factorId === "totp");
    if (!hint) throw new Error("This owner account needs a configured TOTP authenticator.");
    const result = await r.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.value));
    emit("user", markRaw(result.user));
    resolver.value = null;
    code.value = "";
    emit("status", "Two-factor sign-in complete. Load documents to verify owner authorization.");
  });
const startEnroll = () =>
  run(async () => {
    const { multiFactor, TotpMultiFactorGenerator } = await import("firebase/auth");
    secret.value = markRaw(await TotpMultiFactorGenerator.generateSecret(await multiFactor(user!).getSession()));
    emit(
      "status",
      "Add the setup key to your authenticator, then enter its current code. Keep this key out of website documents.",
    );
  });
const enroll = () =>
  run(async () => {
    const { multiFactor, TotpMultiFactorGenerator, signOut } = await import("firebase/auth");
    await multiFactor(user!).enroll(
      TotpMultiFactorGenerator.assertionForEnrollment(secret.value!, code.value),
      "Owner authenticator",
    );
    secret.value = null;
    code.value = "";
    await signOut(await ownerAuth());
    emit("user", null);
    emit("status", "Authenticator configured. Sign in again and verify a fresh code before managing documents.");
  });
const cancel = () => {
  secret.value = null;
  code.value = "";
};
</script>
<template>
  <div class="owner-auth">
    <button :disabled="busy" @click="signIn">Sign in / reauthenticate</button>
    <form v-if="resolver" class="owner-form" @submit.prevent="verify">
      <label>
        Authenticator code
        <input
          v-model="code"
          autocomplete="one-time-code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          required
          maxlength="6"
        />
      </label>
      <button :disabled="busy">Verify sign-in</button>
    </form>
    <button v-if="user && canEnroll && !secret" :disabled="busy" @click="startEnroll">Set up authenticator</button>
    <form v-if="user && secret" class="owner-form" @submit.prevent="enroll">
      <p class="callout">
        Store this setup key only in your authenticator app: <code class="setup-key">{{ secret.secretKey }}</code>
      </p>
      <label>
        Current authenticator code
        <input
          v-model="code"
          autocomplete="one-time-code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          required
          maxlength="6"
        />
      </label>
      <button :disabled="busy">Confirm authenticator setup</button>
      <button type="button" @click="cancel">Cancel setup</button>
    </form>
  </div>
</template>
