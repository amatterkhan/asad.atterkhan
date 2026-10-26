# Hand-off: finish the Vue/Go rebuild of Asad's site

> Completion update — 26 October 2026: the local API, exporter, rebuild workflow, site tests,
> dependency fixes and calendar/interaction comparisons below are implemented and verified.
> Start with [README.md](README.md) and [verification.md](verification.md) for current setup,
> results and limitations. Real Firebase/TOTP sign-in, GitHub dispatch, Docker image execution
> and Cloud Run/Hosting deployment still need external verification. Nothing was deployed.

Repo: `/Volumes/Vault/Workspace/Projects/asad.atterkhan`, branch `frontend-redesign` (stay on it).

## Rules
- `platform/` (Next.js 16) is the **read-only reference**. Never edit, move or delete anything in it. Another session works there.
- Touch only `site/`, `api/`, `docs/rebuild/`, and new top-level config you need.
- Never `git add -A`. Stage explicit paths, commit in logical steps, end messages with
  `Co-Authored-By: <your attribution>`. Do not deploy, create Firebase/GCP projects, or touch DNS. Ask before adding heavy deps.
- The old Vue site in `src/` (repo root) must keep working; don't touch root `package.json`/configs.

## Done so far (commit 5d277c9)
`site/`: Vue 3.5 + Vite 8 + Tailwind 4 + Vue Router 5, TypeScript strict, zod. Builds and prerenders every page.
- Architecture: Vue SSR prerender (`scripts/build.ts`) → static HTML in `site/dist/`. **Islands**: only
  `src/islands/*.vue` (Room, LabSearch, WorkbenchSearch, AchievementCollection, ShiftCalendar, AdminDesk
  [+ AdminCopy, AdminWriting, OwnerSignIn]) hydrate, via `island()` wrapper (`data-island`/`data-props`)
  and `src/entry-client.ts`. Everything else is vanilla TS in `src/behaviors/` (cursor, nav dialog,
  sprite play/pause, article code-copy/mermaid/progress/TOC, print, tab visibility). About page ships 3.3 KB gz JS.
- `src/routes.ts`: route table with `meta.load` loaders (content from `src/lib/content.server.ts`), head via `src/head.ts`.
- `src/styles/app.css`: Tailwind 4 (`theme.css` + `utilities.css`, no preflight), tokens in `@theme static`
  (`--color-*`, `--font-*`, `--container-measure`), day theme on `:root[data-theme=light]`, original rules in `@layer components`.
- `src/lib/markdown.ts`: unified/remark-gfm/rehype-sanitize/rehype-slug/flow+mermaid/rehype-pretty-code (Everforest). Output identical to Next.
- Content copied to `site/content/`, assets to `site/public/`. `CONTENT_SOURCE=firestore` reads `CONTENT_EXPORT_DIR` (default `.content-export/`: `articles/*.json`, `projects/*.json`, `site.json`, `achievements.json`) — to be written by the Go `export` command.
- Scripts: `npm run dev` (port 4190, SSR per request, proxies /api,/files,/media → `API_ORIGIN` default :8081),
  `npm run build`, `npm run preview` (port 4191, mimics Firebase Hosting from `site/firebase.json`), `tests/visual/compare.ts`
  (Playwright, system Chrome `channel:"chrome"`, compares REF=:4180 Next dev server vs NEW).
- `site/firebase.json`: hosting (cleanUrls, redirects, CSP with theme-script hash, rewrites `/api/**`,`/files/**`,`/media/**` → Cloud Run `asad-api`), rules in `site/firebase/`, emulator ports 9099/8080/9199.
- Visual parity verified: all pages × desktop 1280 / mobile 390 × dark/light: 0.000–0.003% pixel diff (dev and prod builds), except `/calendar` (needs API) and `/lab` in prod (Next reference runs in dev mode and shows the dev-only draft preview; expected).
- `npm run typecheck` passes.

## Original remaining work (implemented locally; retained as the specification)
1. **`api/` in Go** (module `github.com/amatterkhan/asad-exe/api`, `go mod init` + `go get firebase.google.com/go/v4 cloud.google.com/go/firestore cloud.google.com/go/storage github.com/yuin/goldmark github.com/alecthomas/chroma/v2` may have half-run; re-run). Stdlib `net/http` (Go 1.22+ patterns). Implement exactly `platform/docs/admin-contract.md` + `platform/docs/frontend-integration.md` §3, porting `platform/src/lib/admin.ts`, `platform/src/app/api/**`, `platform/src/lib/{calendar,document-policy,public-file}.ts`:
   - `requireOwner`: Bearer ID token verified with revocation check; uid == `FIREBASE_OWNER_UID`; claim `admin == true`; `firebase.sign_in_second_factor == "totp"` (skip only when `FIREBASE_AUTH_EMULATOR_HOST` set and project id starts `demo-`); `recent` (auth_time ≤ 300 s) for publish/unpublish/delete/archive; per-service flags `ENABLE_CONTENT_ADMIN`, `ENABLE_DOCUMENT_ADMIN`, `ENABLE_ACHIEVEMENT_ADMIN`, `ENABLE_PRIVATE_CALENDAR`, `ENABLE_PUBLIC_FILES` (503 when off). Errors `{"error":…}`, `Cache-Control: no-store`, same messages/status codes as the TS; unknown JSON keys → 400; body size limits (413); `_quotas` daily transactional quotas (sha256(key+day)).
   - Routes: `/api/admin/site` GET/PUT (fallback = embedded copy of `site/content/site.json`), `/api/admin/articles` GET/POST, `/{slug}` GET/PUT/DELETE, `/{slug}/publish`, `/{slug}/unpublish` (version checks 409, publishedVersion, publicArticles copy validated like ArticleSchema), `/api/admin/preview` → `{html,toc}`, `/api/admin/achievements` GET/PATCH, `/api/admin/documents` (+ `/{id}` PATCH/DELETE, `/{id}/publish`, `/{id}/download`; magic-byte check PDF/PNG/JPEG/WebP, 8 MiB, 25 uploads/day), `/files/{id}`, `/media/{id}` (64 MiB/day), `/api/owner/calendar` (port `platform/src/lib/calendar.ts` exactly; `APP_ENV=development` skips auth for calendar only, refuse if `K_SERVICE` set), `/api/healthz`. Security headers (nosniff, frame deny, referrer, CSP `default-src 'none'` for API).
   - **Rebuild hook** instead of Next revalidation (decision: rebuild, not request-time fetch): after site-copy save, publish/unpublish, achievements PATCH, call `REBUILD_HOOK` = GitHub `repository_dispatch` (`GITHUB_REPO`, `GITHUB_TOKEN`, event `content-published`) or generic webhook URL+secret, or log-only when unset. Add `.github/workflows/site-rebuild.yml` (triggers: repository_dispatch, workflow_dispatch only; concurrency group cancel-in-progress) running `go run ./cmd/export` then `CONTENT_SOURCE=firestore npm run build` and `firebase deploy --only hosting` — do NOT run it.
   - `cmd/export`: writes published `publicArticles`, `publicProjects`, `siteSettings/public`, `siteSettings/achievements` into `site/.content-export/` in the shape `content.server.ts` reads.
   - `internal/markdown`: goldmark + GFM + Chroma producing the same HTML as `site/src/lib/markdown.ts` (heading ids via github-slugger rules, `table-wrap` div, `flow-diagram`, `mermaid-diagram`, `<figure data-rehype-pretty-code-figure><pre … data-language data-theme="everforest-dark everforest-light"><code …><span data-line>` with `--shiki-dark/--shiki-light` colors mapped from Everforest, raw HTML dropped, unsafe URLs removed, images `loading="lazy" decoding="async"`). Add `site/scripts/markdown-golden.ts` (`npm run markdown:golden`) writing `site/tests/fixtures/markdown/*.md → *.html` and a Go test comparing (exact outside code blocks; code text equal inside).
   - Embed `site.json`/`achievements.json`/`achievement-settings.json` via a copy in `api/internal/content/data/` + a test that they equal `site/content/` files.
   - `go vet` + `go test` with emulators for **every route** (401/403/400/409/404/413/503 paths, publish visibility, quotas, rebuild hook called). Emulator command: `firebase emulators:exec --config ../site/firebase.json --only auth,firestore,storage --project demo-asad-exe 'go test ./...'`. firebase CLI: `../platform/node_modules/.bin/firebase` or global; Java 21: `JAVA_HOME=/private/tmp/asad-temurin21/jdk-21.0.13+9-jre/Contents/Home`. Reference test flow: `platform/tests/content.integration.ts`, `documents.integration.ts` (sign up via Auth emulator REST, set `admin` claim).
   - `Dockerfile` for Cloud Run (distroless, non-root).
2. **Site tests**: Vitest unit tests (`site/tests/unit`: schemas, experience grouping, markdown output incl. flow/mermaid/table, icons vs pixelarticons package, head tags, content loader with firestore export fixture). Playwright + `@axe-core/playwright` (`site/playwright.config.ts`, webServer = build + `npm run preview`, projects desktop+mobile Chrome, both themes): no horizontal overflow, axe wcag2a/aa clean, nav/mobile menu Escape+focus return, room (pet → `storm-says` + asad-happy, lamp toggle, window toggles theme), Lab/Workbench/Achievement searches (port `platform/tests/browser/site.spec.ts`; drop its `.ambient-dots`/motion-button checks — that feature no longer exists in Next either), calendar with `page.route` mocking `/api/owner/calendar` in dev (`open`), no hydration-mismatch console warnings (build with `HYDRATION_DETAILS=true`), redirects, 404 status. Install `@playwright/test` browsers not needed: use `channel: "chrome"`.
3. Visual check `/calendar` once the Go API runs (`APP_ENV=development go run ./cmd/server` on :8081, then `cd site && npm run dev`, then `npx tsx tests/visual/compare.ts` with `PATHS=/calendar`). Also check hover/menu-open states.
4. `npm audit`: add `overrides` like platform (`@grpc/grpc-js` 1.14.6 etc.).
5. **`docs/rebuild/README.md`**: run locally (site + api + emulators), deploy (Firebase Hosting + Cloud Run, env vars, secrets, region `europe-west1` placeholder), the rebuild-hook decision and why, and what changed vs Next: islands/MPA navigation (full page loads, no client router), OG images at `/opengraph-image.png` and `/lab/<slug>/opengraph-image.png` (build-time satori+resvg), `/api/revalidate` removed (rebuild hook), admin notes now say "goes live after rebuild", `/manage`, `/review`, `/api/dev/axe` dev tools not ported (say so), CSP now uses a hash instead of `unsafe-inline` scripts, Go preview highlighting uses Chroma (colors mapped; token boundaries may differ from Shiki).
6. Final report: what's done, what differs, what's unverified (real Firebase/TOTP sign-in, Cloud Run deploy, GitHub dispatch).

Dev servers may still be running from the previous session: site dev on :4190, dist preview on :4191 (kill with `lsof -ti:4190,4191 | xargs kill`). Next reference dev server on :4180 belongs to the other session — leave it alone.
