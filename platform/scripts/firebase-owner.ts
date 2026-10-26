import nextEnv from "@next/env";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

nextEnv.loadEnvConfig(process.cwd());
const projectId = "asad-atterkhan";
const ownerEmail = "dev@asad.atterkhan.com";
if (process.env.FIREBASE_PROJECT_ID !== projectId ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_STORAGE_EMULATOR_HOST)
  throw new Error("Use the real asad-atterkhan local configuration without emulators.");

const credential = applicationDefault();
const app = initializeApp({ projectId, credential });
const auth = getAuth(app);
const envPath = resolve(".env.local");
const sleep = () => new Promise((resolve) => setTimeout(resolve, 3000));

async function signups(enabled: boolean) {
  const { access_token } = await credential.getAccessToken();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=client.permissions.disabledUserSignup,client.permissions.disabledUserDeletion`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "X-Goog-User-Project": projectId,
      },
      body: JSON.stringify({ client: { permissions: {
        disabledUserSignup: !enabled, disabledUserDeletion: true,
      } } }),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`Could not secure Auth account creation (${response.status}): ${body.error?.message || response.statusText}`);
  }
}

async function owner() {
  try {
    const user = await auth.getUserByEmail(ownerEmail);
    if (!user.emailVerified || user.disabled || !user.providerData.some((p) => p.providerId === "google.com"))
      throw new Error("The owner must sign in using their verified Google account.");
    return user;
  } catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") return null;
    throw error;
  }
}

async function updateEnv(values: Record<string, string>) {
  const pending = { ...values };
  const lines = (await readFile(envPath, "utf8")).split("\n").map((line) => {
    const key = line.split("=", 1)[0];
    if (!(key in pending)) return line;
    const value = pending[key];
    delete pending[key];
    return `${key}=${value}`;
  });
  await writeFile(envPath, [...lines, ...Object.entries(pending).map(([k, v]) => `${k}=${v}`)].join("\n"));
  await chmod(envPath, 0o600);
}

async function run() {
  // Resolve ADC before temporarily opening first-user onboarding.
  await credential.getAccessToken();
  if (process.argv.includes("--check")) {
    const user = await owner();
    console.log(JSON.stringify({ projectId, ownerExists: !!user, ownerConfigured: !!user?.customClaims?.admin,
      totpEnrolled: !!user?.multiFactor?.enrolledFactors.some((f) => f.factorId === "totp") }));
    return;
  }
  let user = await owner();
  if (!user) {
    console.log(`Sign in as ${ownerEmail} at http://127.0.0.1:4180/admin within five minutes.`);
    try {
      await signups(true);
      const deadline = Date.now() + 300_000;
      while (!user && Date.now() < deadline) { await sleep(); user = await owner(); }
      if (!user) throw new Error("No owner sign-in received. New account creation is closed again.");
    } finally {
      await signups(false);
    }
  } else {
    await signups(false);
  }
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
  await updateEnv({ FIREBASE_OWNER_UID: user.uid });
  console.log("Owner UID and admin claim configured. New account creation is closed.");
  if (!user.multiFactor?.enrolledFactors.some((f) => f.factorId === "totp"))
    console.log("Choose Set up authenticator in the local sign-in screen, then sign in again with TOTP.");
  const deadline = Date.now() + 300_000;
  while (!user.multiFactor?.enrolledFactors.some((f) => f.factorId === "totp") && Date.now() < deadline) {
    await sleep();
    user = await auth.getUser(user.uid);
  }
  if (!user.multiFactor?.enrolledFactors.some((f) => f.factorId === "totp"))
    throw new Error("TOTP enrollment is pending. Admin features stay disabled; rerun after enrolling.");
  await updateEnv({ ENABLE_DOCUMENT_ADMIN: "true", ENABLE_ACHIEVEMENT_ADMIN: "true", ENABLE_CONTENT_ADMIN: "true" });
  console.log("TOTP enrolled. Local admin features enabled; complete a fresh Google + TOTP sign-in.");
}

for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => { void signups(false).finally(() => process.exit(1)); });

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Owner onboarding failed");
  process.exitCode = 1;
});
