# Development

The site is in `site/` (Vue 3 + Vite, prerendered), the owner API and content exporter in `api/`,
and the pixel-art pipeline in `art/`. See [architecture.md](architecture.md) for how they fit together.

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

From `api/`, a Firebase CLI (global, or `npx firebase-tools`) can run the full integration suite:

```sh
JAVA_HOME=/private/tmp/asad-temurin21/jdk-21.0.13+9-jre/Contents/Home \
  firebase emulators:exec \
  --config ../site/firebase.json --only auth,firestore,storage \
  --project demo-asad-exe 'go test ./... -count=1'
```

Use your Java 21 installation if that temporary runtime is unavailable. Emulators use Auth 9099, Firestore 8080 and Storage 9199. They bind locally; do not expose them.
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

## Checks

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
