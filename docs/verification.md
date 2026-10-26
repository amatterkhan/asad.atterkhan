# Rebuild verification — 26 October 2026

All checks below ran locally on `frontend-redesign`. No deployment, repository dispatch, DNS
change or Firebase/GCP resource creation was performed. The reference server on port 4180 was
left running and the then-current `platform/` reference app was not modified.

## Results

| Check | Result |
| --- | --- |
| Go build/tests and `go vet ./...` | Passed |
| Static Linux/amd64 API cross-build | Passed |
| Firebase Auth + Firestore + Storage emulator suite | Passed, using demo-asad-exe |
| Seeded Firestore → Go export → Vue static build | Passed; exported article HTML checked |
| Site TypeScript check | Passed |
| Vitest | 11 tests passed across 3 files |
| Chrome browser suite | 54 passed, 2 desktop-only mobile-menu tests skipped |
| npm audit | 0 reported vulnerabilities, including development dependencies |
| Markdown golden fixtures | Article layout, GFM/edge cases and feature fixtures passed in TypeScript and Go |

The emulator suite tests all owner routes for missing/invalid tokens and non-owner access. It
also covers owner/admin/TOTP policy, recent authentication, disabled users, service flags,
validation/unknown keys, oversized requests, version conflicts, published snapshots remaining
unchanged by draft edits, unpublish/delete visibility, preview sanitization, achievement selection,
file signatures, private download, publish/unpublish/archive, retained originals, missing records,
upload/download quotas, and rebuild-hook delivery to a local HTTPS receiver. Ten concurrent reads
with one quota unit remaining produce one success and nine 429 responses.

The exporter test checks snapshot content, stale publication removal, refusal to overwrite an
unrelated directory, and (with `VERIFY_SITE_BUILD=true`) an actual `CONTENT_SOURCE=firestore` build.
Run that extended check with the emulator command in README and `VERIFY_SITE_BUILD=true` on the
outer command. Ordinary Go tests skip emulator-dependent cases when emulators are absent.

Browser checks cover production prerenders, WCAG 2 A/AA axe checks, horizontal overflow,
hydration warnings/errors, room controls, collection searches, mobile menu Escape/focus return,
redirects, Hosting security headers and 404s. Calendar navigation uses a mocked API response on
the separate development server; the production calendar stays locked. A seeded component test
covers Lab search/clear because the Git source currently has no published notes.

Accessibility verification found a light-theme “Current” badge with contrast below AA. Its text
is now white. Accessibility checks wait until the entrance animation completes before measuring
contrast. The preview server now applies the checked-in Hosting security/cache headers.

## Visual comparisons

Reference: Next dev on 4180. Rebuild: Vue dev on 4190, with the Go API in development on 8081.
Viewports: 1280 × 900 and 390 × 844; dark and light themes; reduced motion.

| State | Desktop dark | Desktop light | Mobile dark | Mobile light |
| --- | --- | --- | --- | --- |
| Calendar | 0.000% | 0.000% | 0.000% | 0.000% |
| Homepage Lab hotspot hovered | 0.000% | 0.001% | 0.000% | 0.000% |
| Mobile navigation open | n/a | n/a | 0.000% | 0.000% |

Pixelmatch threshold: 0.1. Screenshots and difference images remain local under
`site/tests/visual/out/`, excluded from Git. Earlier broad visual parity results are recorded in
the rebuild hand-off notes (now in git history); this run specifically added the calendar, hover and open-menu checks above.

## Intentional differences and external checks

- Public copy and article/achievement changes go live after export, build and Hosting deployment.
  Hook delivery failure is logged and requires a manual retry; there is no durable rebuild queue.
- Go Markdown preview uses Chroma/Everforest. Code text matches the golden fixtures; token splits
  and classifications can differ from the site's Shiki highlighting. Go heading slugs use a
  generated filter from the site's github-slugger package, including Unicode cases.
- Real web.app owner/TOTP sign-in and GitHub dispatch remain unverified; the cloud rollout
  checks completed on 27 October are recorded below.
- The Docker daemon was unavailable, so the distroless image was not built or run locally.
  No attempt was made to start or reconfigure Docker.
- Automated accessibility checks do not replace a manual assistive-technology review.

Launch deployment results and remaining external checks are recorded below.

## Launch verification — 27 October 2026 (paused at owner sign-in)

All launch commands target `asad-atterkhan` and `amatterkhan/asad.atterkhan` explicitly.
No DNS changes, feature-flag enables, indexing enable or merge to `main` have been performed.

- `make check`: passed after deployment configuration changes (Go vet/tests, site typecheck,
  12 Vitest tests).
- `npm run test:e2e`: 54 passed, two expected desktop mobile-menu skips.
- Setup shell syntax and Git whitespace checks: passed.
- Project number, billing enabled, Firestore/bucket region: read back and matched.
- Budget API: project-scoped USD 5 budget with current-spend alerts at 20%, 60%, 100%.
- WIF provider condition: repository numeric ID `1045770351`; deployer policy uses the matching
  principal set. Two dedicated service accounts and `asad` Docker repository verified.
- Project IAM, runtime impersonation and bucket object role verified with read commands.
- GitHub environment branch policies and configuration variable/secret names read back.
- GitHub Actions WIF authentication and site build succeeded. First deploy found missing
  Firebase Storage metadata permission; Firebase and bucket-scoped GCS metadata viewer roles
  added and setup script corrected. Third attempt deployed Hosting and both rulesets successfully
  ([run 40393106963](https://github.com/amatterkhan/asad.atterkhan/actions/runs/40393106963)).

Concurrent frontend edits in the local working tree were excluded from deployment commits.
The globally installed Firebase executable could not run on this Mac; CLI reads use
`npx --yes firebase-tools@15.34.1`, matching the pinned deploy version.

Live static checks at `https://asad-atterkhan.web.app`:

- All 12 prerendered page routes returned 200; `/nope` returned 404.
- All nine configured legacy redirects returned 301 and their exact configured targets.
- CSP, nosniff, referrer policy, frame denial and permissions policy matched `site/firebase.json`
  on pages, public indexes and the 404 response.
- Hosting overrides the configured HSTS with `max-age=31556926; includeSubDomains; preload`.
  This meets/exceeds the configured one-year policy; record it as platform behavior.
- `/admin` and `/calendar`: `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`.
- `robots.txt`: `Disallow: /`; sitemap points to the web.app origin.
- `/rss.xml`, `/sitemap.xml` and `/search.json` returned 200. The initial check ran before adding the user-selected `Lab 000` article.
- Static-only deploy succeeded with Cloud Run rewrites removed, proving that configuration path.
- Temporary owner-to-deployer impersonation grants used for diagnosis were removed; the final
  deployer SA policy contains only the repository-scoped workload identity user binding.

The full demo Auth/Firestore/Storage emulator suite passed again with
`go test -race ./... -count=1` using the documented Java 21 runtime and pinned Firebase CLI.
Manual dispatch of `site-ci.yml` is not available before that workflow reaches the default
branch (GitHub returned 404); the PR/push workflow will supply hosted checks.

API deployment succeeded in
[run 40394130364](https://github.com/amatterkhan/asad.atterkhan/actions/runs/40394130364).
Live checks passed against both the direct Cloud Run URL and Hosting origin:

- `/api/healthz`: 200, `{"ok":true}`.
- `/api/admin/site`, `/api/admin/articles`, `/api/admin/achievements`, `/api/admin/documents`,
  `/api/owner/calendar`: 503 with no-store while all five runtime flags are false.
- `/files/launch-check`, `/media/launch-check`: 404 with no-store.
- Public invoker IAM binding succeeded (`allUsers`, `roles/run.invoker`).
- Runtime identity, max 2 instances, default/min 0, concurrency 8, CPU/memory limits read back.
- Auth authorized domains and enabled TOTP read back with explicit quota-project header.
- Browser API-key referrers updated for web.app while preserving the API restrictions.

Owner sign-in is a required human check. Missing-token 401 checks cannot be performed live
before feature enablement because disabled service flags return 503 first; emulator coverage
passed for enabled-service authentication. Content/document end-to-end tests, hook token,
repository dispatch, Firestore content source, PR previews, merge/main checks, DNS/TLS custom
domain and indexing are pending the corresponding owner actions and approvals.

The owner selected `Lab 000` with body “Welcome to the lab.” as the first launch article.
`make check` and the browser suite passed again after adding it (54 passed / two expected skips).
