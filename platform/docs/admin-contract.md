# Admin + content contract (frontend ⇄ backend)

Firebase becomes the store for editable content. The frontend owns pages and the `/admin` UI;
the backend owns Firestore/Storage, rules, the Admin SDK routes below, and tests. Both sides build
to this contract. Existing contracts in `docs/frontend-integration.md` still apply.

## Auth

Every `/api/admin/*` route calls `requireOwner(request, { service })` from `src/lib/admin.ts`
(Google sign-in, owner UID, `admin` claim, TOTP; `recent: true` for publish/delete). The client
sends `Authorization: Bearer <Firebase ID token>`. Services: `content` (new, flag
`ENABLE_CONTENT_ADMIN`), plus the existing `documents`, `achievements`, `calendar`.

Errors are JSON `{ "error": string }` with the status from `HttpError` (401, 403, 404, 409, 413,
429, 503). Responses carry `Cache-Control: no-store`.

## 1. Site copy: `siteSettings/public` (one document)

Editable text currently hard-coded in pages. All strings are plain text (no HTML/Markdown) unless
noted; the frontend falls back to `content/site.json` when the document is missing.

```ts
type SiteCopy = {
  role: string;            // "Security Analyst"           (eyebrow + hero)
  company: string;         // "Checkout.com"
  location: string;        // "Mauritius"
  heroTitle: string;       // "Hey, I'm Asad."
  heroLede: string;        // one sentence under the title
  heroBody: string;        // short paragraph, plain text
  roomHint: string;        // caption under the room
  closingTitle: string;    // "Say hello"
  closingBody: string;     // text before the email link
  labIntro: string; workbenchIntro: string; experienceIntro: string;
  achievementsIntro: string; aboutBody: string; // aboutBody: Markdown (sanitised like articles)
  updatedAt?: string;      // ISO, set by the server
};
```

- `GET /api/admin/site` → `SiteCopy` (stored fields over `content/site.json`; no `updatedAt` until
  the first save, so the editor always starts from what the site shows)
- `PUT /api/admin/site` body `SiteCopy` (validated with zod, each string ≤ 600 chars, aboutBody
  ≤ 8000, same lengths as `SiteCopySchema`; unknown keys or control characters → 400; a sent
  `updatedAt` is ignored) → `SiteCopy`; then revalidates `/`, `/lab`, `/workbench`, `/experience`,
  `/achievements`, `/about`.
- Public read (server only): `getSiteCopy()` in `src/lib/content.ts` reads the same document when
  `CONTENT_SOURCE=firestore`, else `content/site.json`.

## 2. Articles: `articles/{slug}` (owner) → `publicArticles/{slug}` (published copy)

Drafts live in `articles`; publishing copies a validated snapshot to `publicArticles` (the
collection the public site already reads; field list in `frontend-integration.md` §1).

```ts
type ArticleDraft = {
  slug: string; title: string; description: string;
  body: string;                 // Markdown
  tags: string[]; category?: string; featured: boolean;
  status: "draft" | "published";
  publishedAt?: string; updatedAt?: string;   // YYYY-MM-DD
  version: number;              // optimistic concurrency, incremented by the server
  modifiedAt: string;           // ISO time of the last change (list sort key; not public)
  publishedVersion?: number;    // version the public copy was made from, while published
};
```

- `GET /api/admin/articles` → `{ articles: (ArticleDraft without body)[] }` newest first
- `POST /api/admin/articles` body `{ slug, title, description }` → 201 `ArticleDraft` with an empty
  body, version 1 (409 if the slug exists as a draft or a public copy)
- `GET /api/admin/articles/{slug}` → `ArticleDraft`
- `PUT /api/admin/articles/{slug}` body `ArticleDraft` (must carry the current `version`, else 409)
  → `ArticleDraft`. `status`, `publishedAt`, `updatedAt`, `modifiedAt`, `publishedVersion` may be
  sent back and are ignored; a different `slug`, duplicate tags or unknown keys → 400; body ≤ 200,000
  characters. Saving never touches the public copy: `publishedVersion < version` means unpublished
  edits.
- `POST /api/admin/articles/{slug}/publish` (`recent`) → `ArticleDraft`; writes `publicArticles`,
  sets `publishedAt` (first time) / `updatedAt`, revalidates `/`, `/lab`, `/lab/{slug}`,
  `/rss.xml`, `/sitemap.xml`, `/search.json`. An empty body → 400; the snapshot must pass
  `ArticleSchema`. Republishing keeps the first `publishedAt` and sets `updatedAt` to today (UTC).
- `POST /api/admin/articles/{slug}/unpublish` (`recent`) → `ArticleDraft` (status `draft`,
  `publishedAt` kept); removes the public copy, revalidates the same paths; 409 if not published
- `DELETE /api/admin/articles/{slug}` (`recent`, drafts only) → `{ ok: true }`; 409 while published
- Every write (save, publish, unpublish) increments `version`: keep the returned draft.
- `POST /api/admin/preview` body `{ body: string }` (≤ 200,000 characters) → `{ html, toc }` rendered with the same
  `renderArticle()` the site uses (so the editor preview matches the page exactly)

Images in articles reuse the existing documents flow (`/api/admin/documents`, published images
served from `/media/{id}`).

## 3. Projects (later, same shape)

`projects/{slug}` → `publicProjects/{slug}`, same endpoints under `/api/admin/projects`. Not needed
for the first admin release.

## Done means

- Rules: default deny; no client reads/writes of these collections (Admin SDK only).
- Emulator tests for every route: auth (401/403), validation (400), version conflicts (409),
  publish/unpublish visibility, revalidation calls.
- `CONTENT_SOURCE=firestore` verified against the emulator with seeded data.
- `docs/firebase.md` updated with the new flags and collections.
