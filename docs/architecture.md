# Architecture

```text
site/   Vue 3 + Vite site, prerendered to static HTML; only interactive islands hydrate
api/    Go owner API (Cloud Run) and the content exporter
art/    Pixel-art sources and scripts that export sprites, room layers and outfits into site/public
docs/   This documentation
```

## Request paths

- **Visitors** get static files from Firebase Hosting. Pages are prerendered at build time from
  Git content (`site/content/`) or from a snapshot of published Firestore content. Only the
  interactive islands (room, searches, calendar, admin) ship JavaScript.
- **The owner** signs in with Google and a TOTP second factor in the browser (Firebase Auth) and
  calls the Go API on `/api/**` with the ID token. Hosting rewrites `/api`, `/files` and `/media`
  to the Cloud Run service `asad-api`.
- **Firestore and Storage are never touched by browsers.** Rules are default-deny; only the API
  (Admin SDK) reads and writes. `/files` and `/media` stream published documents through the API.

## Publishing is a rebuild

Public pages are static, so changes the owner makes in `/admin` go live after a rebuild: the API
commits to Firestore, then asks GitHub to run the deploy workflow, which exports published content
(`go run ./cmd/export`), builds the site and deploys Hosting. See "Rebuild hook" below and
[ci-cd.md](ci-cd.md).

## Content and API behavior

Public pages use Git content by default. To build from published Firestore content:

```sh
cd api
# Supply the Firebase environment above, or production ADC and configuration.
go run ./cmd/export
cd ../site
CONTENT_SOURCE=firestore npm run build
```

The exporter writes `site/.content-export/{articles,projects}/*.json`, `site.json`,
`achievements.json`, `lab.json` (the Lab map), `thumbnails/` (the thumbnails published articles
name, checked against their SHA-256; a missing one is dropped with a log line) and `wardrobe.json` (Asad's active outfit; an id missing from
`site/public/art/outfits/index.json` falls back to the default). `CONTENT_EXPORT_DIR` overrides its output directory; it is relative to the
exporter's working directory. On the site build it is relative to `site/`. Use one absolute path
for both if overriding. A marker prevents replacing an unrelated non-empty directory. Complete snapshots replace previous snapshots so unpublished articles
cannot linger. Exported document IDs must equal their slugs. The site validates the exported
content with the same schemas as Git content. Missing site settings use embedded/Git defaults;
an empty project export retains Git projects, matching the existing content loader.

Every owner endpoint verifies the Firebase ID token with revocation/disabled-user checks,
the owner UID, the boolean `admin` claim, and TOTP. Publishing, unpublishing, deleting and
archiving require authentication within the last 300 seconds. Service flags default off:

| Variable | Enables |
| --- | --- |
| `ENABLE_CONTENT_ADMIN` | Site copy, article drafts, publication, Markdown preview, the Lab map, thumbnails and the wardrobe (Asad's outfit) |
| `ENABLE_DOCUMENT_ADMIN` | Private uploads, metadata, publication, downloads and archive |
| `ENABLE_ACHIEVEMENT_ADMIN` | Featured achievement selection |
| `ENABLE_PUBLIC_FILES` | Published `/files/{id}` and image-only `/media/{id}` |

Disabled admin services return 503; disabled public files return 404, as the API's own
policy. Errors and private responses are never cached. JSON input rejects unknown fields,
invalid types and over-limit bodies. Daily Firestore transaction quotas are stored in `_quotas`
under SHA-256 of the quota key plus UTC day. See [api.md](api.md) and
`api/internal/server/` for routes, limits and messages.

Draft changes increment `version` and require the previous version. Publication atomically
creates a validated `publicArticles` snapshot and records `publishedVersion`; saving later edits
leaves that snapshot unchanged. Unpublishing removes the snapshot. A published article must be
unpublished before deletion. Projects remain read/export-only for this release.

Documents accept PDF, PNG, JPEG and WebP signatures, up to 8 MiB, with 25 uploads per owner/day.
Publication uses a new object path, verifies the source size/digest, and checks the document's
update time again inside a transaction. The bounded copy works with GCS and the Storage emulator.
Failed publication removes its unused copy. Archive removes public access and retains the private
original. Public delivery has a shared 64 MiB/day byte quota and never uses public bucket ACLs.

## Rebuild hook

Published pages are static. Site-copy saves, article publish/unpublish, Lab map, wardrobe and
achievement changes request a new build. They become visible **after that build has deployed**. Article draft saves
and preview requests do not trigger builds. Published documents are served through the API and
change visibility immediately.

Configure one delivery mode on the API:

- Unset `REBUILD_HOOK`: log `rebuild_requested` for local development.
- `REBUILD_HOOK=github`: set `GITHUB_REPO=owner/repository` and secret `GITHUB_TOKEN`. The API
  sends `repository_dispatch` with event type `content-published`. Grant the token permission
  to dispatch events only to the intended repository.
- `REBUILD_HOOK=https://…`: set secret `REBUILD_HOOK_SECRET`. The API POSTs
  `{ "event": "content-published", "reason": "…" }` with Bearer authentication. Redirects are
  refused, the timeout is ten seconds, and HTTPS is required.

Content commits happen before hook delivery. A failed hook logs `rebuild_hook_failed`; it does
not roll back the content or report a failed save. There is no background retry queue. Operators
must monitor those events and run a manual rebuild when delivery fails.

`.github/workflows/site-deploy.yml` handles the `content-published` dispatch: it exports content,
checks and builds the site, and deploys Hosting from the deploy branch. GitHub delivers the dispatch
only to workflows on the default branch. See [ci-cd.md](ci-cd.md) for the full CI/CD setup.
