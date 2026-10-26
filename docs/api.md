# API reference

Firebase becomes the store for editable content. The frontend owns pages and the `/admin` UI;
the backend owns Firestore/Storage, rules, the Admin SDK routes below, and tests. Both sides build
to this contract. Existing contracts in `docs/frontend-integration.md` still apply.

## Auth

Every `/api/admin/*` route requires `Authorization: Bearer <Firebase ID token>`. The API verifies
the token with revocation checks, then the owner UID (`FIREBASE_OWNER_UID`), the `admin` claim and
a TOTP second factor (skipped only for the Auth emulator with a `demo-` project). Publish,
unpublish, delete and archive also need a sign-in within the last five minutes. Each service is
off unless its flag is `true`: `content` (`ENABLE_CONTENT_ADMIN`), `documents`
(`ENABLE_DOCUMENT_ADMIN`), `achievements` (`ENABLE_ACHIEVEMENT_ADMIN`), `calendar`
(`ENABLE_PRIVATE_CALENDAR`).

Errors are JSON `{ "error": string }` with status 400, 401, 403, 404, 409, 413, 415, 429, 500 or
503. Unexpected failures return a generic message; details go to structured logs only. Responses
carry `Cache-Control: no-store`. Unknown JSON keys are rejected with 400.

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
- `PUT /api/admin/site` body `SiteCopy` (each string ≤ 600 chars, aboutBody
  ≤ 8000, same lengths as `SiteCopySchema`; unknown keys or control characters → 400; a sent
  `updatedAt` is ignored) → `SiteCopy`; then requests a rebuild (the copy appears on every page).
- Public read: the exporter writes `siteSettings/public` into the build snapshot when
  `CONTENT_SOURCE=firestore`; otherwise the build uses `site/content/site.json`.

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
  sets `publishedAt` (first time) / `updatedAt`, then requests a rebuild. An empty body → 400; the snapshot must pass
  `ArticleSchema`. Republishing keeps the first `publishedAt` and sets `updatedAt` to today (UTC).
- `POST /api/admin/articles/{slug}/unpublish` (`recent`) → `ArticleDraft` (status `draft`,
  `publishedAt` kept); removes the public copy and requests a rebuild; 409 if not published
- `DELETE /api/admin/articles/{slug}` (`recent`, drafts only) → `{ ok: true }`; 409 while published
- Every write (save, publish, unpublish) increments `version`: keep the returned draft.
- `POST /api/admin/preview` body `{ body: string }` (≤ 200,000 characters) → `{ html, toc }` rendered with the same
  `renderArticle()` the site uses (so the editor preview matches the page exactly)

Images in articles reuse the existing documents flow (`/api/admin/documents`, published images
served from `/media/{id}`).

## 3. Projects (not yet editable)

Projects are read-only: the exporter copies `publicProjects/{slug}` when present, otherwise the
build uses `site/content/projects/`.

## 4. Wardrobe: `siteSettings/wardrobe` (one document)

Asad's outfits are files, one folder each in `site/public/art/outfits/<id>/` (sheets with the same frames
and timing as `site/public/sprites/manifest.json`, an `outfit.json`, a `preview.png`), listed in
`site/public/art/outfits/index.json` and built by `art/scripts/outfits.py`. Firestore only stores which one
he wears; adding an outfit is a commit, not an upload.

```ts
type Wardrobe = {
  activeOutfit: string;    // an id from public/art/outfits/index.json
  updatedAt?: string;      // ISO, set by the server
  ownerUid?: string;       // stored, never returned
};
```

- `GET /api/admin/wardrobe` (service `content`) → `{ outfits: Outfit[], defaultOutfit, activeOutfit,
  updatedAt? }` where `Outfit = { id, name, description, createdAt, preview }`. A missing document
  or an id no longer in the index reads as `defaultOutfit`.
- `PUT /api/admin/wardrobe` body `{ activeOutfit }` (an `updatedAt` sent back is ignored; an unknown
  id or unknown keys → 400) → `{ activeOutfit, updatedAt }`; then requests a rebuild.
- Public read: the exporter includes the active outfit in the build snapshot (`CONTENT_SOURCE=firestore`); otherwise the index default is used.

## Rebuild requests

Site-copy saves, article publish/unpublish, achievement and wardrobe changes ask GitHub to rebuild
the site (`repository_dispatch` `content-published`; see [architecture.md](architecture.md)).
Article draft saves and previews do not. Published documents change visibility immediately.
