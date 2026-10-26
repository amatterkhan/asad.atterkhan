# Vue + Go rebuild

The rebuilt site lives in `site/`; the owner API and publication exporter live in `api/`.
Stay on `frontend-redesign`. `platform/` is a read-only Next.js reference maintained by another
session. The old root Vue app and its package/configuration files are unchanged.

## Run locally

Prerequisites: Node 24+, npm, the Go version in `api/go.mod`, system Google Chrome, Java 21,
and Firebase CLI. No cloud project or credentials are needed for the demo emulators.
Install site dependencies with `cd site && npm ci`. The Go dependencies are locked in `api/go.sum`.

For public pages, start these in separate terminals:

```sh
cd api
APP_ENV=development go run ./cmd/server
```

```sh
cd site
npm run dev
```

Open `http://127.0.0.1:4190`. The site proxies `/api`, `/files`, and `/media` to port 8081.
`API_ORIGIN`, `PORT`, and `HMR_PORT` can select other local ports. The API defaults to 8081;
set `PORT=8080` for Cloud Run. `APP_ENV=development` bypasses authentication **only for the
calendar**. The server refuses to start with that value when `K_SERVICE` is set.
The development API binds to loopback. All other owner routes still require their service flag and owner authentication.

For a production build with Git content:

```sh
cd site
npm run typecheck
npm test
npm run build
npm run preview
```

Preview serves `http://127.0.0.1:4191`, including Hosting redirects, security headers, API proxy,
and 404 status. The preview server is local tooling; Firebase Hosting serves production files.
Copy `site/.env.example` for site configuration and use `api/.env.example` as the API environment
reference. The Go executable does not automatically load `.env` files: supply variables through
the shell or the runtime environment.

### Demo Firebase services

From `api/`, the reference checkout's installed CLI can run the full integration suite:

```sh
JAVA_HOME=/private/tmp/asad-temurin21/jdk-21.0.13+9-jre/Contents/Home \
  ../platform/node_modules/.bin/firebase emulators:exec \
  --config ../site/firebase.json --only auth,firestore,storage \
  --project demo-asad-exe 'go test ./... -count=1'
```

Use your Java 21 installation if that temporary runtime is unavailable. A global `firebase`
CLI can replace the reference binary. The commands only read the reference installation.
Emulators use Auth 9099, Firestore 8080 and Storage 9199. They bind locally; do not expose them.
The tests create demo users, grant the `admin` claim, obtain ID tokens, and exercise real HTTP
routes. They never use a real Firebase project.

To use the admin interface interactively, start `firebase emulators:start` with the same config,
services and demo project; configure the API process with:

```sh
export FIREBASE_PROJECT_ID=demo-asad-exe
export FIREBASE_STORAGE_BUCKET=demo-asad-exe.appspot.com
export FIREBASE_OWNER_UID='<UID of the demo owner>'
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
export ENABLE_CONTENT_ADMIN=true
export ENABLE_DOCUMENT_ADMIN=true
export ENABLE_ACHIEVEMENT_ADMIN=true
export ENABLE_PRIVATE_CALENDAR=true
export ENABLE_PUBLIC_FILES=true
```

Create that demo user and set its custom `admin: true` claim through the Admin SDK, as the
integration test does. Configure the site's `VITE_FIREBASE_*` values and
`VITE_FIREBASE_AUTH_EMULATOR=http://127.0.0.1:9099`. The emulator exception to TOTP applies only
when the Auth emulator is configured **and** the project ID starts with `demo-`.
An Auth emulator paired with any other project ID is refused.

## Content and API behavior

Public pages use Git content by default. To build from published Firestore content:

```sh
cd api
# Supply the Firebase environment above, or production ADC and configuration.
go run ./cmd/export
cd ../site
CONTENT_SOURCE=firestore npm run build
```

The exporter writes `site/.content-export/{articles,projects}/*.json`, `site.json`, and
`achievements.json`. `CONTENT_EXPORT_DIR` overrides its output directory; it is relative to the
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
| `ENABLE_CONTENT_ADMIN` | Site copy, article drafts, publication and Markdown preview |
| `ENABLE_DOCUMENT_ADMIN` | Private uploads, metadata, publication, downloads and archive |
| `ENABLE_ACHIEVEMENT_ADMIN` | Featured achievement selection |
| `ENABLE_PRIVATE_CALENDAR` | Authenticated calendar |
| `ENABLE_PUBLIC_FILES` | Published `/files/{id}` and image-only `/media/{id}` |

Disabled admin/calendar services return 503; disabled public files return 404, matching the
reference. Errors and private responses are never cached. JSON input rejects unknown fields,
invalid types and over-limit bodies. Daily Firestore transaction quotas are stored in `_quotas`
under SHA-256 of the quota key plus UTC day. See the reference contracts and
`api/internal/server/` for route limits and messages.

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

Published pages are static. Site-copy saves, article publish/unpublish, and achievement changes
request a new build. They become visible **after that build has deployed**. Article draft saves
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

The new `.github/workflows/site-rebuild.yml` listens only for `repository_dispatch` and
`workflow_dispatch`. Its concurrency group cancels older builds. It exports content, checks/builds
the site and deploys Hosting only. It deliberately checks out `frontend-redesign`. Before enabling
it, review the target ref; GitHub must have the dispatch workflow on the repository's default
branch. No workflow was dispatched during this rebuild.

## Deployment reference — not executed

No Firebase/GCP resources, DNS entries, or existing services were changed. Region
`europe-west1` and service name `asad-api` in `site/firebase.json` are placeholders to confirm
before deployment. Do not use `APP_ENV=development` in a deployed environment.

1. Select an existing approved Firebase/GCP project, Hosting site and private Storage bucket.
   Review `site/firebase/{firestore.rules,storage.rules}` and the index file. Client access to
   owner content must remain denied; the API uses the Admin SDK.
2. Build `api/Dockerfile` with `api/` as the build context. It produces a static Go executable
   in a distroless image running as a non-root user. Docker build and Cloud Run deployment have
   not been verified here.
3. Configure Cloud Run's managed identity with access to the intended Firestore database,
   private bucket and Firebase user verification. Supply `FIREBASE_PROJECT_ID`,
   `FIREBASE_STORAGE_BUCKET`, `FIREBASE_OWNER_UID`, `APP_ENV=production`, and the required flags.
   Store rebuild credentials in the deployment's secret manager. Do not set emulator variables.
4. Configure Firebase Google sign-in, the authorized domain, the owner account, its `admin`
   claim and TOTP enrollment. Supply the public web configuration in the site's
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID` at build time.
   Confirm `SITE_URL` and set `INDEX_SITE=true` only for the approved production host.
5. For the workflow's `site-production` environment, configure
   `SITE_WORKLOAD_IDENTITY_PROVIDER` and `SITE_BUILD_SERVICE_ACCOUNT` secrets for workload
   identity, plus `FIREBASE_OWNER_UID`; configure Firebase project/bucket and web config variables
   as named in the workflow. Scope the build identity to reading published content and deploying
   the selected Hosting site. Review IAM separately from the API's write permissions.
6. After approval, deploy the API, review the Hosting rewrite region/service, export/build the
   static site and deploy with `firebase deploy --only hosting --config firebase.json --project
   <approved-project>` from `site/`. Do not deploy the root app or `platform/` as part of this flow.
7. Verify real owner/TOTP sign-in, stale/revoked sessions, publication/rebuild delivery, upload
   and archive, private/public files, the calendar, headers, redirects and 404s on the real host.

## Checks and differences from Next.js

```sh
cd api
go vet ./...
go test ./... -count=1
cd ../site
npm run typecheck
npm test
npm audit
npm run test:e2e
```

Plain `go test` skips Firebase integration when the three emulator variables are absent; use the
emulator command above for the full route/export suite. Browser tests build with
`HYDRATION_DETAILS=true`, start isolated preview/dev servers on 4192/4193, and use installed Chrome.
They cover desktop/mobile in both themes, accessibility, overflow, hydration, search, room
interactions, mobile menu focus/Escape, mocked development calendar navigation, redirects and 404s.

`npm run markdown:golden` regenerates reviewed fixtures from the site renderer. Commit the Markdown,
HTML and TOC files together. Go checks exact HTML outside highlighted code blocks and equal code
text inside them. The Go preview uses Goldmark/GFM and Chroma with Everforest colors; Chroma token
boundaries and token classification can differ from Shiki. This is an intentional preview difference.
Raw HTML is dropped and unsafe URLs are removed in both renderers.
Heading IDs use a generated filter from github-slugger. After upgrading that package, run
`npx tsx scripts/slugger-table.ts` from `site/` and format the generated Go file.

For visual comparisons, leave the reference server on 4180 alone:

```sh
cd site
PATHS=/calendar npx tsx tests/visual/compare.ts
PATHS=/ STATE=hover npx tsx tests/visual/compare.ts
PATHS=/ STATE=menu npx tsx tests/visual/compare.ts
```

Screenshots/diffs and `summary-{normal,hover,menu}.txt` are local ignored artifacts in
`site/tests/visual/out/`. The API must be running in local development for calendar parity.

Architectural differences:

- Vue SSR prerenders every public page; only interactive islands hydrate. Navigation uses
  full page loads. Vue Router is used on the server, without a browser-wide client router.
- Open Graph images are built with Satori/Resvg at `/opengraph-image.png` and
  `/lab/<slug>/opengraph-image.png`.
- `/api/revalidate` is replaced by the rebuild hook. Unknown article slugs appear only after
  export/build/deployment, rather than on a first request. Admin messaging explains the delay.
- `/manage`, `/review`, and `/api/dev/axe` development tools were not ported. `/admin` is the
  owner interface. Development article previews remain local only.
- Executable inline scripts use the theme script's CSP hash instead of `unsafe-inline`.
  Inline styles remain allowed for sprites, highlighting and generated diagrams.
- The light-theme “Current” badge uses white text to meet WCAG AA contrast.

See [verification.md](verification.md) for recorded results and remaining external checks.
