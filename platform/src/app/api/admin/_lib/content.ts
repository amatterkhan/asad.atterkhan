import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, HttpError } from "@/lib/admin";
import { ArticleSchema, SiteCopySchema } from "@/lib/content";
import { isOutfit } from "@/lib/outfits";

// Shared by the content admin routes (docs/admin-contract.md). `_lib` is a private folder, so
// nothing here is routable.

export const noStore = { "Cache-Control": "no-store" };
export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: noStore });

/** Regenerates the public pages that show the changed content. */
export function revalidate(paths: string[]) {
  for (const p of paths) revalidatePath(p);
  audit("content_revalidated", paths.join(","));
}
export const SITE_PATHS = ["/", "/lab", "/workbench", "/experience", "/achievements", "/about"];
export const articlePaths = (slug: string) => [
  "/",
  "/lab",
  `/lab/${slug}`,
  "/rss.xml",
  "/sitemap.xml",
  "/search.json",
];

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/** PUT /api/admin/site body: the public reader's schema (lengths included), stricter. Unknown keys
 *  and control characters are rejected; updatedAt may be sent back and is ignored. */
export const SiteCopyInputSchema = SiteCopySchema.extend({ updatedAt: z.string().optional() })
  .strict()
  .refine(
    (copy) => Object.values(copy).every((v) => typeof v !== "string" || !CONTROL.test(v)),
    "Control characters are not allowed",
  );

/** PUT /api/admin/wardrobe body: an outfit id from public/art/outfits/index.json. */
export const WardrobeInputSchema = z
  .object({
    activeOutfit: z.string().max(60).refine(isOutfit, "Unknown outfit"),
    updatedAt: z.string().optional(),
  })
  .strict();
export const WARDROBE_PATHS = ["/", "/about"];

export const SlugSchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const title = z.string().trim().min(1).max(160);
const description = z.string().trim().min(1).max(300);
export const MAX_BODY = 200_000;

export const ArticleCreateSchema = z
  .object({ slug: SlugSchema, title, description })
  .strict();

/** PUT /api/admin/articles/{slug} body. status, publishedAt and updatedAt are server-managed: they
 *  may be sent back unchanged and are ignored. */
export const ArticleUpdateSchema = z
  .object({
    slug: SlugSchema,
    title,
    description,
    body: z.string().max(MAX_BODY),
    tags: z.array(z.string().trim().min(1).max(40)).max(12),
    category: z.string().trim().max(50).optional(),
    featured: z.boolean(),
    version: z.number().int().min(1),
    status: z.enum(["draft", "published"]).optional(),
    publishedAt: z.string().optional(),
    updatedAt: z.string().optional(),
    modifiedAt: z.string().optional(),
    publishedVersion: z.number().optional(),
  })
  .strict()
  .refine((a) => new Set(a.tags).size === a.tags.length, "Tags must be unique");

export const PreviewSchema = z.object({ body: z.string().max(MAX_BODY) }).strict();

export type ArticleDraft = {
  slug: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  category?: string;
  featured: boolean;
  status: "draft" | "published";
  publishedAt?: string;
  updatedAt?: string;
  version: number;
  /** ISO time of the last change to the draft (sort key; not in the public copy). */
  modifiedAt: string;
  /** The draft version the public copy was made from, while published. */
  publishedVersion?: number;
};

/** Maps a stored `articles/{slug}` document to the API shape (drops ownerUid). */
export function toDraft(data: FirebaseFirestore.DocumentData): ArticleDraft {
  const draft: ArticleDraft = {
    slug: data.slug,
    title: data.title,
    description: data.description,
    body: data.body ?? "",
    tags: data.tags ?? [],
    featured: data.featured === true,
    status: data.status === "published" ? "published" : "draft",
    version: data.version,
    modifiedAt: data.modifiedAt,
  };
  for (const key of ["category", "publishedAt", "updatedAt", "publishedVersion"] as const)
    if (data[key] !== undefined && data[key] !== null) Object.assign(draft, { [key]: data[key] });
  return draft;
}

/** Firestore rejects undefined values; drop them before writing. */
export const defined = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export const today = () => new Date().toISOString().slice(0, 10);

/** The validated `publicArticles/{slug}` record for a draft being published. */
export function publicCopy(draft: ArticleDraft, publishedAt: string, updatedAt?: string) {
  if (!draft.body.trim()) throw new HttpError(400, "Write the article before publishing it");
  const meta = ArticleSchema.parse(
    defined({
      title: draft.title,
      description: draft.description,
      slug: draft.slug,
      status: "published" as const,
      publishedAt,
      updatedAt,
      tags: draft.tags,
      category: draft.category || undefined,
      featured: draft.featured,
    }),
  );
  return defined({ ...meta, body: draft.body });
}

/** Reads an owned draft inside a transaction, or throws 404. */
export async function ownedDraft(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  uid: string,
) {
  const doc = await tx.get(ref);
  if (!doc.exists || doc.get("ownerUid") !== uid)
    throw new HttpError(404, "Article not found");
  return toDraft(doc.data()!);
}
