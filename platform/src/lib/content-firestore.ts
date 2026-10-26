import "server-only";
import { firebaseAdmin } from "./firebase-admin";
import { ArticleSchema, ProjectSchema, withDerived, type Article, type Project } from "./content";

// Opt-in content source (CONTENT_SOURCE=firestore). Reads public, already-reviewed records and
// validates them with the same schemas as the Git content, so a bad document fails the build or
// request instead of reaching the page. Collections are owned by the backend:
//   publicArticles/{slug}  ArticleSchema fields + body (Markdown string)
//   publicProjects/{slug}  ProjectSchema fields (+ optional writeupBody Markdown)
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
