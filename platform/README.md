# ASAD.EXE

A separate Next.js/TypeScript implementation of Asad's personal website. The original Vue application, earlier design studies, live GitHub Pages site, and Cloudflare DNS are preserved.

```sh
cd /Volumes/Vault/Workspace/Projects/amatterkhan.github.io/platform
npm ci
npm run dev
```

Open http://127.0.0.1:4180. No Firebase configuration is needed to read the website.

- `/`: personal introduction, selected projects, recent published writing and achievement highlights.
- `/lab`: published articles, search, categories/tags.
- `/workbench`: searchable source-backed projects and detail pages; old `/projects` URLs redirect.
- `/experience`: career progression grouped by employer, education, selected achievements and print view.
- `/achievements`: searchable full credential grid, also linked from the primary navigation and previewed on Home.
- `/calendar`: the original shift rotation, month navigation and summaries in Mauritius time.
- `/about`: personal introduction and the paired Asad/Storm sprites.
- `/preview/reading-layout`: **development-only**, explicitly unpublished article fixture.
- `/review`: **development-only**, responsive and automated accessibility review.
- `/manage`: **development-only**, owner content desk for document management and the Experience achievement selection; Firebase configuration required.
- `/sprite-review/index.html`: live sprite animation/alpha/fallback inspection.

The public Lab intentionally contains no invented articles. The old About post's metadata and body did not match; it is represented by the About page instead. Dummy posts are excluded. Project records use existing descriptions and links; no screenshots, outcomes, or measurements have been invented.

## Content

See [authoring](docs/authoring.md). Articles use sanitized Markdown, with GFM tables, highlighted code, images, quotes/callouts, internal links, small `flow` diagrams, TOC, reading time, publication/update dates, related articles, JSON-LD, canonical URLs and generated Open Graph images. Executable MDX is deliberately not enabled; ordinary Markdown meets V1 authoring needs without evaluating article code.

## Sprites

See [sprite production](art/README.md). Actual transparent PNG sheets, source frames, shared palette, manifest and export script are included. The flattened reference board stays outside the public directory. Runtime sheets are about 13–17 KiB each. Home uses typing Asad with the dedicated Storm Sit pose; About uses coffee Asad with sitting Storm.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm audit
npm run build
npm run test:rules      # Java 21+ required
npm run test:documents  # Java 21+ and a .next-production build required
npm run test:e2e        # install Playwright browsers first; CI covers four projects
```

For the HTTP document integration test, first build with `NEXT_DIST_DIR=.next-production npm run build`. This keeps production output separate from the development server. Firebase tests always use `demo-asad-exe` and local emulators; they do not require or provision a real project.

CI and a protected, manual staging rollout workflow are provided under the repository's `.github/workflows/`. They have not been pushed or run on GitHub. The existing production Pages workflow is unchanged.

## Deployment status

**Local implementation; not deployed.** Firebase project creation, Blaze billing, owner access setup, App Hosting deployment/adapter verification, and a real staging URL await approval. No existing Firebase project is reused. See [Firebase](docs/firebase.md), [architecture](docs/architecture.md), [migration/rollback](docs/migration.md), and [verification](docs/verification.md).

The background uses slow CSS pixel-field layers, with small entrance/hover interactions. A footer control disables motion; reduced-motion settings and hidden tabs stop animation automatically. Search and other text inputs use square inset focus edges. Custom selection colours follow the pastel palette. The previous footer terminal is archived and no longer loaded.
