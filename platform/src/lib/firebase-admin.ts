import "server-only";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
export function firebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (
    process.env.FIREBASE_AUTH_EMULATOR_HOST &&
    !projectId?.startsWith("demo-")
  )
    throw new Error(
      "Authentication emulator is only allowed for demo projects",
    );
  if (!projectId || !storageBucket || !process.env.FIREBASE_OWNER_UID)
    throw new Error("Content service is not configured");
  const app =
    getApps()[0] ||
    initializeApp({
      projectId,
      storageBucket,
      ...(process.env.FIREBASE_AUTH_EMULATOR_HOST
        ? {}
        : { credential: applicationDefault() }),
    });
  return {
    auth: getAuth(app),
    db: getFirestore(app),
    bucket: getStorage(app).bucket(),
  };
}
