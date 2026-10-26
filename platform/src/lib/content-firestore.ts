import "server-only";
import { firebaseAdmin } from "./firebase-admin";
import {
  ArticleSchema,
  ProjectSchema,
  SiteCopySchema,
  withDerived,
  type Article,
  type Project,
  type SiteCopy,
} from "./content";

// Opt-in content source (CONTENT_SOURCE=firestore). Reads public, already-reviewed records and
// validates them with the same schemas as the Git content, so a bad document fails the build or
// request instead of reaching the page. Collections are owned by the backend:
//   publicArticles/{slug}  ArticleSchema fields + body (Markdown string)
//   publicProjects/{slug}  ProjectSchema fields (+ optional writeupBody Markdown)
//   siteSettings/public    SiteCopySchema fields (+ updatedAt, ownerUid), written by /api/admin/site
//   siteSettings/wardrobe  { activeOutfit, updatedAt, ownerUid }, written by /api/admin/wardrobe
// Only server code imports this file; visitors never load the Firebase SDK.

export async function firestoreArticles(): Promise<Article[]> {
  const { db } = firebaseAdmin();
  const snap = await db.collection("publicArticles").where("status", "==", "published").get();
  return snap.docs.map((doc) => {
    const { body, ...meta } = doc.data();
    if (typeof body !== "string") throw new Error(`publicArticles/${doc.id} has no Markdown body`);
    return withDerived(ArticleSchema.parse(meta), body);
  });
}

export async function firestoreProjects(): Promise<(Project & { writeupBody?: string })[]> {
  const { db } = firebaseAdmin();
  const snap = await db.collection("publicProjects").get();
  return snap.docs.map((doc) => {
    const { writeupBody, ...meta } = doc.data();
    return { ...ProjectSchema.parse(meta), ...(typeof writeupBody === "string" ? { writeupBody } : {}) };
  });
}

/** Stored site copy, or null when the owner has not saved any yet (getSiteCopy falls back to
 *  content/site.json). Unknown fields such as ownerUid are dropped; bad values throw. */
export async function firestoreSiteCopy(): Promise<Partial<SiteCopy> | null> {
  const { db } = firebaseAdmin();
  const snap = await db.collection("siteSettings").doc("public").get();
  if (!snap.exists) return null;
  return SiteCopySchema.partial().parse(snap.data());
}

/** The stored active outfit id (siteSettings/wardrobe), or null when none is saved. Validation
 *  against the outfit index happens in getActiveOutfit. */
export async function firestoreActiveOutfit(): Promise<unknown> {
  const { db } = firebaseAdmin();
  const snap = await db.collection("siteSettings").doc("wardrobe").get();
  return snap.exists ? snap.get("activeOutfit") : null;
}
