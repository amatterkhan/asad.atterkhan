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
- Real Google sign-in/TOTP enrollment, real Firebase/Storage IAM and rules, GitHub dispatch,
  workload identity and Cloud Run/Hosting deployment remain unverified.
- The Docker daemon was unavailable, so the distroless image was not built or run locally.
  No attempt was made to start or reconfigure Docker.
- Automated accessibility checks do not replace a manual assistive-technology review.

The deployment workflow is present but has not been invoked. Review its checkout ref, project,
region, identities and environment configuration before enabling it.
