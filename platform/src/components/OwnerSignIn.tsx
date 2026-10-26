"use client";
import { useEffect, useId, useState } from "react";
import type { User, MultiFactorResolver, MultiFactorError, TotpSecret } from "firebase/auth";
import { authenticatorQrCode } from "@/lib/authenticator-qr";
import { USER_ERRORS, UserFacingError, userErrorMessage } from "@/lib/user-errors";

export function OwnerSignIn({ user, onUser, onStatus }: {
  user: User | null;
  onUser: (user: User | null) => void;
  onStatus: (message: string) => void;
}) {
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [canEnroll, setCanEnroll] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const errorId = useId();

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) onStatus(""); });
    return () => { active = false; };
  }, [onStatus]);

  useEffect(() => {
    let active = true;
    if (user) import("firebase/auth").then(({ multiFactor }) => {
      if (active) setCanEnroll(!multiFactor(user).enrolledFactors.some((f) => f.factorId === "totp"));
    });
    return () => { active = false; };
  }, [user]);

  function clearSetup() {
    setSecret(null);
    setQrCode(null);
    setCode("");
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErrorMessage("");
    onStatus("");
    try { await fn(); }
    catch (error) {
      setCode("");
      setErrorMessage(userErrorMessage(error, "sign_in_failed"));
      const code = error && typeof error === "object" ? (error as { code?: string }).code : undefined;
      if (code && ["auth/invalid-multi-factor-session", "auth/missing-multi-factor-session", "auth/session-expired", "auth/requires-recent-login", "auth/user-token-expired", "auth/invalid-user-token"].includes(code)) {
        setResolver(null);
        clearSetup();
        setCanEnroll(false);
      }
    }
    finally { setBusy(false); }
  }
  async function signIn() {
    await run(async () => {
      clearSetup();
      setResolver(null);
      setCanEnroll(null);
      onStatus("");
      const { initializeApp, getApps } = await import("firebase/app");
      const { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, inMemoryPersistence, getMultiFactorResolver, multiFactor } = await import("firebase/auth");
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      if (!config.apiKey || !config.authDomain)
        throw new UserFacingError("service_unavailable");
      const app = getApps()[0] || initializeApp(config);
      const auth = getAuth(app);
      await setPersistence(auth, inMemoryPersistence);
      try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        setCanEnroll(!multiFactor(result.user).enrolledFactors.some((factor) => factor.factorId === "totp"));
        onUser(result.user);
        onStatus("Google sign-in complete.");
      } catch (error) {
        if ((error as { code?: string }).code === "auth/multi-factor-auth-required") {
          setResolver(getMultiFactorResolver(auth, error as MultiFactorError));
          onStatus("Enter the six-digit code from your authenticator.");
          return;
        }
        throw error;
      }
    });
  }

  return (
    <div className="owner-auth" aria-busy={busy}>
      {!resolver && !secret && (!user || canEnroll === false) && (
        <button onClick={signIn} disabled={busy}>
          {busy ? "Opening Google…" : user ? "Sign in again" : "Continue with Google"}
        </button>
      )}
      {!resolver && !secret && user && canEnroll === null && (
        <p role="status">Checking your authenticator…</p>
      )}
      {resolver && (
        <form className="owner-form" onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const { TotpMultiFactorGenerator } = await import("firebase/auth");
            const hint = resolver.hints.find((factor) => factor.factorId === "totp");
            if (!hint) throw new UserFacingError("authenticator_required");
            const result = await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code));
            setResolver(null);
            setCode("");
            onUser(result.user);
            onStatus("Authenticator verified. Checking owner access…");
          });
        }}>
          <label>
            Authenticator code
            <input autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required
              aria-invalid={errorMessage === USER_ERRORS.verify_code} aria-describedby={errorMessage ? errorId : undefined}
              value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} />
          </label>
          <button disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify sign-in"}</button>
          <button className="owner-secondary" type="button" disabled={busy} onClick={() => {
            setResolver(null); setCode(""); onStatus("Sign-in cancelled.");
          }}>Back to Google sign-in</button>
        </form>
      )}
      {!resolver && user && canEnroll && !secret && (
        <>
          <p className="owner-account">Signed in as {user.email}.</p>
          <button disabled={busy} onClick={() => void run(async () => {
            const { multiFactor, TotpMultiFactorGenerator } = await import("firebase/auth");
            const nextSecret = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());
            const image = await authenticatorQrCode(nextSecret, user.email || user.uid);
            setSecret(nextSecret);
            setQrCode(image);
            setCode("");
            onStatus("Scan the QR code, then enter the code from your authenticator.");
          })}>{busy ? "Creating QR code…" : "Set up authenticator"}</button>
          <div className="owner-alternate">
            <button className="owner-secondary" disabled={busy} onClick={() => void run(async () => {
              const { getAuth, signOut } = await import("firebase/auth");
              await signOut(getAuth());
              clearSetup();
              setCanEnroll(null);
              onUser(null);
              onStatus("");
            })}>Use another Google account</button>
          </div>
        </>
      )}
      {user && secret && qrCode && !resolver && (
        <form className="owner-form" onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const { multiFactor, TotpMultiFactorGenerator, getAuth, signOut } = await import("firebase/auth");
            await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code), "Owner authenticator");
            clearSetup();
            setCanEnroll(null);
            await signOut(getAuth());
            onUser(null);
            onStatus("Authenticator added. Sign in with Google, then enter a fresh authenticator code.");
          });
        }}>
          <p className="owner-account">Scan with your authenticator app.</p>
          <div className="owner-qr">
            {/* The in-memory credential must never pass through an image optimizer or external QR service. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} width={240} height={240} alt="Authenticator setup QR code. Scan privately with your authenticator app." />
          </div>
          <details className="owner-manual-key">
            <summary>Can’t scan? Enter a setup key instead</summary>
            <code className="setup-key">{secret.secretKey}</code>
          </details>
          <label>
            Six-digit authenticator code
            <input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6}
              aria-invalid={errorMessage === USER_ERRORS.verify_code} aria-describedby={errorMessage ? errorId : undefined}
              value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
          </label>
          <button disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify and finish setup"}</button>
          <button className="owner-secondary" type="button" disabled={busy} onClick={() => {
            clearSetup(); onStatus("Authenticator setup cancelled.");
          }}>Cancel setup</button>
        </form>
      )}
      {errorMessage && <p id={errorId} className="owner-error" role="alert">{errorMessage}</p>}
    </div>
  );
}
