// Owner-only pages load the Firebase client SDK on demand; public pages never do.
export async function ownerAuth() {
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth, setPersistence, inMemoryPersistence } = await import("firebase/auth");
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  };
  if (!config.apiKey || !config.authDomain)
    throw new Error("Firebase is not configured. Follow docs/rebuild/README.md before enabling services.");
  const app = getApps()[0] || initializeApp(config);
  const auth = getAuth(app);
  const emulator = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR as string | undefined;
  if (emulator && !auth.emulatorConfig) {
    const { connectAuthEmulator } = await import("firebase/auth");
    connectAuthEmulator(auth, emulator, { disableWarnings: true });
  }
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}
