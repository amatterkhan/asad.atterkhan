# Frontend ↔ backend integration

Contract between the redesigned frontend (branch `frontend-redesign`) and the backend/Firebase work.
The frontend does not change Firebase rules, auth, schemas in Firestore, hosting or DNS. It reads
public content through one gateway (`src/lib/content.ts`) and exposes one hook for refreshing pages.

## 1. Content source

`CONTENT_SOURCE` selects where public Lab and Workbench content comes from:

| Value | Reads | Notes |
| --- | --- | --- |
| `git` (default) | `content/articles/*.md`, `content/projects/*.json`, `content/case-studies/*.md` | Current behaviour; matches docs/architecture.md |
| `firestore` | `publicArticles`, `publicProjects` collections via Admin SDK (`src/lib/content-firestore.ts`) | Opt-in. Server-only; visitors never load the Firebase SDK |

Either way every record passes the same zod schemas (`ArticleSchema`, `ProjectSchema` in
`src/lib/content.ts`). An invalid record throws rather than rendering half-broken.

> docs/architecture.md currently keeps article bodies in Git, not Firestore. The Firestore reader is
> a prepared seam, not a decision: it stays off unless the backend owner chooses to store public
> content there. Nothing reads these collections until `CONTENT_SOURCE=firestore` is set.

### `publicArticles/{slug}`

| Field | Type | Rule |
| --- | --- | --- |
| `title` | string | 1–160 chars |
| `description` | string | 1–300 chars |
| `slug` | string | `a-z0-9` words joined by `-`; equals the document ID |
| `status` | `"draft"` \| `"published"` | only `published` is queried |
| `publishedAt` | `YYYY-MM-DD` | required when published; not in the future |
| `updatedAt` | `YYYY-MM-DD` | optional; not before `publishedAt` |
| `tags` | string[] | ≤ 12, each ≤ 40 chars |
| `category` | string | optional, ≤ 50 chars |
| `featured` | boolean | default false |
| `body` | string | Markdown (GFM). Rendered with raw HTML stripped and sanitised |

Reading time and search text are derived by the frontend; don't store them.

### `publicProjects/{slug}`

`id` (number), `title`, `slug` (`a-z0-9-`), `description`, `date` (`YYYY-MM-DD`), `categories` (string[]),
`tags` (string[]), `featured` (boolean), `links` ([{ `type`, `url` (https only) }]), optional
`writeupBody` (Markdown case study). `writeup` (a file name) is only used by the Git source.

Rules for both collections are the backend's: the Admin SDK bypasses them, and the frontend only
ever reads. Public reads by browsers are not needed and should stay denied.

Environment needed for `firestore`: the existing `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`,
`FIREBASE_OWNER_UID` (required by `firebaseAdmin()`), and ADC / managed identity on the host.

## 2. Refreshing pages after content changes

Pages are generated ahead of time. When content changes, the backend calls:

```http
POST /api/revalidate
Authorization: Bearer <REVALIDATE_SECRET>
Content-Type: application/json

{ "paths": ["/", "/lab", "/lab/new-note", "/rss.xml", "/sitemap.xml", "/search.json"] }
```

- Disabled (503) unless `REVALIDATE_SECRET` (≥ 32 chars) is set on the frontend host.
- Wrong or missing secret → 401 (constant-time comparison).
- Only public page paths are accepted (`/`, `/lab`, `/lab/<slug>`, `/workbench`, `/workbench/<slug>`,
  `/experience`, `/achievements`, `/about`, `/calendar`, `/rss.xml`, `/search.json`, `/sitemap.xml`);
  anything else → 400 listing the rejected paths. Max 50 per call.
- Response: `{ "revalidated": [...], "at": "<ISO time>" }`. Regeneration is stale-while-revalidate.

Which paths to send: a new or edited article → `/`, `/lab`, `/lab/<slug>`, `/rss.xml`, `/sitemap.xml`,
`/search.json`; a project → `/`, `/workbench`, `/workbench/<slug>`; achievements → `/achievements`,
`/experience`.

`/lab/[slug]` and `/workbench/[slug]` render unknown-at-build slugs on first request
(`dynamicParams = true`) and still return 404 for slugs the source doesn't have.

## 3. Private shift calendar

`/calendar` is owner-only: unlinked, not in the sitemap, `noindex`. The page holds no schedule;
it loads `GET /api/owner/calendar?year=YYYY&month=0-11` after the existing owner sign-in
(Google + TOTP, `requireOwner` with the new `calendar` service).

- Needs `ENABLE_PRIVATE_CALENDAR=true` on the host (otherwise 503), plus the existing Firebase
  owner configuration. Response: `{ year, month, today, cells, upcoming }`, `Cache-Control: no-store`.
- `src/lib/admin.ts` gained only the `"calendar"` service name and its env flag.
- On the local dev server (`NODE_ENV=development`) the route skips sign-in so the page can be
  previewed; production always requires the owner.

## 4. Unchanged integrations

- `/manage`, `/api/admin/*`, `/files/[id]`, `/media/[id]`: untouched by the redesign.
- Experience reads the featured-achievement selection exactly as before.
- No client-side Firebase in public pages.

## 5. Verified locally

- Default (`git`) source: all public routes 200, unknown article slug 404.
- `/api/revalidate`: 503 without a secret; with one, 401 for missing/wrong tokens, 400 for
  `/manage` and traversal paths, 200 for public paths.
- Not verified: `CONTENT_SOURCE=firestore` against an emulator or real project (no seeded
  collections exist yet). Do that when the backend creates them.
