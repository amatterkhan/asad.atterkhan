"use client";
import { useEffect, useState } from "react";
import type {
  User,
  MultiFactorResolver,
  MultiFactorError,
  TotpSecret,
} from "firebase/auth";
export function OwnerSignIn({
  user,
  onUser,
  onStatus,
}: {
  user: User | null;
  onUser: (user: User | null) => void;
  onStatus: (message: string) => void;
}) {
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [code, setCode] = useState("");
  const [canEnroll, setCanEnroll] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user)
      import("firebase/auth").then(({ multiFactor }) =>
        setCanEnroll(
          !multiFactor(user).enrolledFactors.some((f) => f.factorId === "totp"),
        ),
      );
  }, [user]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onStatus(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }
  async function signIn() {
    await run(async () => {
      const { initializeApp, getApps } = await import("firebase/app");
      const {
        getAuth,
        GoogleAuthProvider,
        signInWithPopup,
        setPersistence,
        inMemoryPersistence,
        getMultiFactorResolver,
      } = await import("firebase/auth");
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      if (!config.apiKey || !config.authDomain)
        throw new Error(
          "Firebase is not configured. Follow platform/docs/firebase.md before enabling services.",
        );
      const app = getApps()[0] || initializeApp(config);
      const auth = getAuth(app);
      await setPersistence(auth, inMemoryPersistence);
      try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        onUser(result.user);
        onStatus(
          "Signed in. Owner authorization and an authenticator factor are required for document access.",
        );
      } catch (error) {
        if (
          (error as { code?: string }).code ===
          "auth/multi-factor-auth-required"
        ) {
          setResolver(getMultiFactorResolver(auth, error as MultiFactorError));
          onStatus("Enter a code from your authenticator.");
          return;
        }
        throw error;
      }
    });
  }
  return (
    <div className="owner-auth">
      <button onClick={signIn} disabled={busy}>
        Sign in / reauthenticate
      </button>
      {resolver && (
        <form
          className="owner-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const { TotpMultiFactorGenerator } = await import(
                "firebase/auth"
              );
              const hint = resolver.hints.find((h) => h.factorId === "totp");
              if (!hint)
                throw new Error(
                  "This owner account needs a configured TOTP authenticator.",
                );
              const result = await resolver.resolveSignIn(
                TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code),
              );
              onUser(result.user);
              setResolver(null);
              setCode("");
              onStatus(
                "Two-factor sign-in complete. Load documents to verify owner authorization.",
              );
            });
          }}
        >
          <label>
            Authenticator code
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />
          </label>
          <button disabled={busy}>Verify sign-in</button>
        </form>
      )}
      {user && canEnroll && !secret && (
        <button
          onClick={() =>
            run(async () => {
              const { multiFactor, TotpMultiFactorGenerator } = await import(
                "firebase/auth"
              );
              setSecret(
                await TotpMultiFactorGenerator.generateSecret(
                  await multiFactor(user).getSession(),
                ),
              );
              onStatus(
                "Add the setup key to your authenticator, then enter its current code. Keep this key out of website documents.",
              );
            })
          }
          disabled={busy}
        >
          Set up authenticator
        </button>
      )}
      {user && secret && (
        <form
          className="owner-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const {
                multiFactor,
                TotpMultiFactorGenerator,
                getAuth,
                signOut,
              } = await import("firebase/auth");
              await multiFactor(user).enroll(
                TotpMultiFactorGenerator.assertionForEnrollment(secret, code),
                "Owner authenticator",
              );
              setSecret(null);
              setCode("");
              await signOut(getAuth());
              onUser(null);
              onStatus(
                "Authenticator configured. Sign in again and verify a fresh code before managing documents.",
              );
            });
          }}
        >
          <p className="callout">
            Store this setup key only in your authenticator app:{" "}
            <code className="setup-key">{secret.secretKey}</code>
          </p>
          <label>
            Current authenticator code
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button disabled={busy}>Confirm authenticator setup</button>
          <button
            type="button"
            onClick={() => {
              setSecret(null);
              setCode("");
            }}
          >
            Cancel setup
          </button>
        </form>
      )}
    </div>
  );
}
