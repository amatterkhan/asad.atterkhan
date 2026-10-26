# ASAD.EXE website rebuild: discovery and proposal

**Prepared:** 25 October 2026  
**Status:** Both the schematic compositions and the artwork-led homepage review were rejected. Preserve them as exploration only. Frontend expansion, animation production, and Firebase setup remain paused while the design is simplified around Asad's existing identity and actual content.  
**Scope:** This document records the current site and proposes an architecture and staged implementation. It does not authorize production deployment, billing changes, DNS changes, or disclosure of additional personal information.

### Latest user direction — 25 October 2026

The site should be simple, personal, comfortable on desktop and mobile, and well suited to the content Asad will publish. The large slogan, prominent call-to-action buttons, and decorative room image produced a generic portfolio composition and are rejected. The existing terminal, cat, colors, and direct tone are the starting point for further exploration. Pixel art remains an interest, but its role must serve the personal site and its content. No replacement composition has been approved. Retain TypeScript and the strict $0 Firebase constraint.

The generated illustrations and their palette-reduced exports are design studies. Palette reduction and nearest-neighbor scaling establish a pixel grid; they do not establish deliberate pixel-level craftsmanship or production readiness.

The earlier multi-route schematic study at [design-compositions.html](./design-compositions.html) is retained for history and is superseded. The current artwork-first deliverable is [home-art-review.html](./home-art-review.html), with the artwork and export workflow in [home-art-animation-plan.md](./home-art-animation-plan.md). It includes separate desktop and mobile scenes, quantized to a 64-color logical grid and exported at nearest-neighbor 2×. The detailed still artwork is ready for review; animation layers are planned but not produced. Broader frontend implementation remains paused pending the user's artwork and composition approval.

## 1. Discovery findings

### Live site and domain

- `https://asad.atterkhan.com/` returned HTTP 200 during review on 25 October 2026.
- The visible site is a dark terminal portfolio. Its header contains Home, Resume, Projects, and Blog. The home page types a short introduction, then offers a command field, contact links, GitHub, and LinkedIn. Project search and filters are present; the résumé has expandable sections; the blog has search and filters.
- The `/projects`, `/resume`, and `/blog` routes load and expose their page titles and principal content. The blog currently lists an About Me entry and two explicitly named dummy posts. Dummy entries are not publishable content.
- The existing interface uses a small ASCII cat and green/cyan terminal colors. The live homepage has a large mostly empty terminal area after its introductory text; the projects page uses two-column bordered cards at the reviewed viewport.
- A public `/calendar` route also exists outside the primary navigation. Its source exposes a personal shift pattern. Treat this as a privacy review item and do not carry it into the new public site without an explicit decision.
- The site already has useful metadata: description, canonical URL, Open Graph and Twitter cards, and Person JSON-LD. These should be preserved and improved per route.
- Public DNS returns Cloudflare anycast addresses. The response is served through Cloudflare and includes GitHub Pages response headers/request identifiers. The domain is proxied, so public DNS does not reveal the origin records or the current Cloudflare SSL, cache, redirect, and rule settings.

### Repository and deployment

- The available checkout is the public GitHub repository [`amatterkhan/asad.atterkhan`](https://github.com/amatterkhan/asad.atterkhan), default branch `main`, with GitHub Pages enabled.
- Its `.github/workflows/deploy.yml` builds with Node 20 and `npm ci`, then publishes `dist` to GitHub Pages on pushes to `main` and manual dispatch. `public/CNAME` contains `asad.atterkhan.com`; `public/_redirects`, `public/404.html`, `public/robots.txt`, and `public/sitemap.xml` are also present.
- The checkout has no Git remote configured. Git history is present locally. The GitHub account is available through `gh`; the website repository is public. The repository inventory includes distinct private projects, including `crowsnest`. The website should remain in its dedicated website repository and should not absorb Crowsnest or other projects.
- **Existing local edits are preserved:** `src/App.vue` and `src/views/HomeView.vue` are modified, while `src/assets/fonts/` and `src/components/prototype/` are untracked. These include a local Pixel Quest experiment. No discovery work has changed those paths.

### Current source architecture

- Vue 3 single-page application using Vite 5, Vue Router 4, Tailwind CSS 3, JavaScript, npm, Font Awesome, and the Tailwind typography plugin.
- The router defines `/`, `/blog`, `/post/:id`, `/resume`, `/projects`, `/project/:id`, `/calendar`, and a 404 route. History-mode routing relies on the GitHub Pages 404 redirect.
- Profile, project, post, education, certification, and work-history data live in JSON under `src/data/`. Article bodies are separate HTML files fetched client-side from `public/data/posts/`. This splits article metadata from body content and renders article content with `v-html`.
- The home terminal is a client-side command switch, not a server shell. It supports commands such as `help`, `about`, `skills`, `projects`, `resume`, `blog`, `contact`, `history`, `date`, `clear`, and `refresh`. Navigation and output are implemented explicitly. The rebuild can retain this as an optional, bounded interface.
- Core reusable pieces include terminal layout/output/commands, theme switcher, project/blog listings and filters, project/article detail views, and résumé sections. Existing portfolio data and career details are source material, subject to a factual and privacy review before republishing.
- Existing art includes a 1200×630 pixel-avatar banner, a 128×128 portrait GIF, and a 20×20 cat GIF. There is no existing detailed room environment in the inspected public asset folders. The local Pixel Quest experiment adds CSS-drawn decorative elements; it is not production environment pixel art.
- A Firebase CLI executable is present but cannot run on this machine (`bad CPU type in executable`). The Firebase console redirects to Google sign-in, so no Firebase project, billing plan, App Hosting backend, or connected GitHub repository could be inspected. No Firebase resource has been created or modified.

### Reuse and gaps

**Reuse as verified source material:** factual résumé sections and credentials, current role, confirmed project titles/descriptions/links, contact and social links, pixel avatar, cat sprites, and the terminal's bounded command concept.

**Rebuild rather than port directly:** page shell, navigation, visual system, content routing, article storage/rendering, metadata generation, search/filter behavior, and project detail templates.

**Known gaps to resolve during implementation:** placeholder posts, incomplete project case studies and outcomes, no validated long-form MDX pipeline, no site-level documented accessibility/performance checks, homepage content hierarchy, the `/calendar` privacy decision, and the deployment/DNS details hidden behind the Cloudflare account.

## 2. Approved visual direction

### Direction: “Night Shift Fieldstation”

A quiet, modern engineering portfolio set around an original, warmly lit pixel-art workspace after dark. The site should read first as a credible professional portfolio; the room, cat, tiny lab IDs, and terminal affordance add character around the real content.

- **Homepage composition:** a clear left-aligned HTML introduction (“Hey, I'm Asad.” / “I build, break, and secure systems.”) with a concise security/software/cloud summary and primary links. A single original room scene occupies the adjacent visual region on desktop. The art is a background illustration only; text and all controls remain semantic, responsive HTML.
- **Environment:** a carefully shaded room with moonlit window, desk, one or two monitors showing abstract code, shelves, plant, notes, warm lamp pool, and a cat resting near the desk. Use foreground/background layers to separate room architecture from small movement. No game HUD, fake desktop OS, oversized pixel cursor, or decorative obstacle course.
- **Palette proposal:** deep navy `#0B1020`, indigo panel `#171A30`, muted violet `#292744`, lavender `#B9A4E8`, soft cyan `#8CCFE5`, warm amber `#F2B872`, and readable warm-white `#EEEAF5`. Green is an occasional status cue, not the main text color. Recheck contrast once applied to real components.
- **Type:** a readable modern sans for body copy; a local pixel font for short headings, section markers, and labels only. Keep code in a legible monospace. Avoid remote font requests in the initial render.
- **Interface:** modern spacing and content grids, with small pixel dividers, a few square-corner panels, and restrained terminal chrome. Use familiar article/project cards, ordinary navigation, visible focus, and clear CTA labels.
- **The Lab:** a distinct but related research room banner, then a calm reading surface. Sidebar cat companion is small and non-fixed on desktop; on mobile it becomes a compact inline illustration away from the reading controls. Articles remain central, with categories, search, dates, reading time, TOC, related pieces, and next/previous links.
- **Other pages:** project pages use workshop details and case-study structure; Experience uses a clean reverse-chronological timeline; About is warmer and more personal. Each page uses one restrained art motif at most.
- **Desktop / tablet / mobile:** desktop gets the full environment and two-column compositions. Tablet uses a simplified crop and tighter grids. Mobile gets an intentionally composed narrow scene or separate crop above/beside the introduction, single-column reading, compact navigation, minimum 44 px controls, and fewer/no ambient effects. Do not scale a desktop room down until its details are illegible.
- **Motion:** CSS sprite layers or small original sprite sheets for lamp glow, monitor flicker, occasional star, and cat breathing/blink. Add no always-moving global background. Pause offscreen decoration where practical, and fully honor `prefers-reduced-motion`.

### Art production boundary

After the desktop/mobile compositions are reviewed, create original concept studies first, then clean/pixel-refine the selected composition at a defined logical resolution and palette. Separate room layers from the cat and screen/lamp overlays, inspect at native size and integer scaling, and export optimized WebP/AVIF alternatives only where sharp pixel edges remain intact. Do not use generated concept imagery as final pixel art without manual cleanup and review. Do not bake copy, buttons, or text into the artwork.

The current checkout contains a local game-like prototype, but its pixel-RPG/player-card direction is not being treated as approved. The proposal intentionally keeps its palette/character experimentation separate from the more editorial, professional composition above. Earlier mockups were not found among the inspected repository assets.

## 3. Proposed architecture

### Frontend and content

- Migrate the dedicated site repository to Next.js App Router + TypeScript + Tailwind. Use small accessible primitives where they save work; avoid a large component library for a mostly editorial site.
- Use static generation for the home, projects, experience, about, and MDX article routes. The site does not need per-request rendering for the initial feature set.
- Store Lab articles as version-controlled MDX with validated frontmatter (`title`, `description`, `slug`, `category`, `tags`, `publishedAt`, optional `updatedAt`, `status`, `featured`, optional `labId`). Only `published` content enters listings, search, RSS, sitemap, and related links. Drafts stay out of public builds.
- Generate a local search index at build time. Add code syntax highlighting and a copy button, callouts, responsive tables, images/diagrams with alt text, an in-page TOC, reading time, related articles, and previous/next navigation.
- Generate canonical metadata, Article/Person structured data, Open Graph data, sitemap, robots file, and RSS from the same validated content model.
- Keep project and career facts in typed local content. Create case-study templates but leave missing sections blank until verified; do not invent impact metrics, outcomes, or confidential employer detail.

### Routes and continuity

Proposed canonical routes: `/`, `/lab`, `/lab/[slug]`, `/projects`, `/projects/[slug]`, `/experience`, `/about`.

Preserve incoming links with permanent redirects or aliases: `/blog` to `/lab`; `/post/<legacy-id>` to a reviewed article slug where a genuine article exists; `/project/<legacy-id>` to a matching project slug; `/resume` to the new experience/profile destination or a dedicated printable résumé route. Retain canonical URLs and old live/demo links where valid. Decide the fate of `/calendar` only after a privacy review; do not migrate its shift pattern as public content by default.

### Runtime and Firebase

- Recommendation: static content and no Firebase client SDK in the initial public visitor path. Do not introduce Firestore, Authentication, Storage, an admin dashboard, or a custom backend until a real dynamic feature justifies its cost and threat model.
- Cost requirement: Firebase spending stays at $0. Use Next.js static export on Firebase Hosting under the Spark plan, with no billing account linked. Firebase Hosting's published no-cost quota includes 10 GB storage and 10 GB monthly data transfer; on Spark, reaching the transfer limit can disable the site until the next month rather than silently creating a paid overage. Keep the project free of App Hosting, Cloud Run, Cloud Functions, billable extensions, and paid add-ons. [Firebase Hosting quotas](https://firebase.google.com/docs/hosting/usage-quotas-pricing) · [Next.js static export](https://nextjs.org/docs/app/guides/static-exports).
- Static export generates the HTML per route at build time and has no Next.js server at request time. Article/project slugs must be fully generated during the build; server actions, request-time redirects/headers, draft mode, and dynamic APIs are out. Use `firebase.json` for static rewrites, redirects, and response headers, and a checked-in generated search index/RSS/sitemap. The initial content and terminal fit this model.
- The static site should use a Firebase Hosting preview channel or the free `web.app` subdomain for review, with production DNS unchanged. Keep `main` and the existing GitHub Pages deployment untouched until production review and explicit authorization.
- The preliminary Firebase estimate is $0/month because this architecture avoids billable services and does not link billing. The trade-off is free-tier quotas and possible service interruption at quota exhaustion. Verify current project plan and existing project usage before setup; do not upgrade or attach a billing account.
- No dynamic Firebase features are included under the $0 cost constraint. If a future feature requires a paid service or billing-plan change, stop and return for a separate architecture and cost decision; never attach billing or switch plans automatically.

### Security and delivery

- Keep secrets out of source and previews; use managed secrets only if a server capability actually needs them. Do not ship privileged service credentials to the browser.
- Set CSP, HSTS (after TLS/domain validation), `X-Content-Type-Options`, `Referrer-Policy`, and a restrictive frame policy. Avoid unsafe HTML; treat MDX as trusted code-reviewed repository content and sanitize/validate embedded content.
- Add CI for formatting/lint, TypeScript, build, unit/integration checks for routes/content validation, and dependency/security scanning. Use minimal GitHub workflow permissions and pin third-party actions to reviewed versions.
- Keep GitHub Pages as a rollback source. Introduce Firebase staging on a feature branch and Firebase's preview hostname first. Do not point Cloudflare DNS or a production custom domain until staging is accepted and a migration window is approved.
- Before any production cutover, record existing Cloudflare DNS/proxy/TLS/redirect settings, verify Firebase domain ownership and TLS, test redirects and direct route loads, set an appropriate DNS TTL, and document how to restore the old Cloudflare target. The current public DNS lookup cannot reveal proxied origin settings.

## 4. Implementation sequence after direction approval

1. **Close discovery items:** inspect current Cloudflare rules and DNS in the authorized account; inspect Firebase projects/billing after Google console access or a working CLI; resolve `/calendar`; confirm which résumé/project facts and links may be public. No resources are created in this step.
2. **Establish an isolated code path:** preserve all current local edits, create a separate feature worktree/branch from the website repository history, and retain the current GitHub Pages workflow as rollback. The checkout currently has no remote, so restore/verify the intended `origin` before any push.
3. **Artwork-first review:** review the desktop and mobile homepage art and text/art composition using the artwork review page. Get approval before separating animation layers or producing The Lab environment. The Lab's distinct environment remains pending.
4. **Asset production:** make and inspect original pixel environments and cat sprites; define palette, logical grid, layers, export sizes, reduced-motion fallbacks, and asset notes.
5. **Frontend and Lab:** implement routes, shared design system, MDX validation/rendering, project/career content, RSS/search/SEO, accessible optional terminal, and cat component. Use only verified content.
6. **Verification:** run requested CI-quality checks and review responsive rendering, keyboard/screen reader behavior, motion preferences, route continuity, headers/content security, asset size, and performance. Fix issues before staging.
7. **Staging:** after confirming the Firebase project is on Spark and no billing account is linked, configure static Firebase Hosting preview from the feature branch. Share the preview URL for review. Production domain remains unchanged.
8. **Production migration:** proceed only with explicit approval at that time; change DNS/config, verify TLS, route redirects, feeds, metadata, and rollback readiness.

## 5. Current blockers and decisions

1. **Visual direction needs artwork approval:** “Night Shift Fieldstation,” editorial layout, proposed palette, restrained motion, and non-game UI remain working direction, with TypeScript implementation and a strict $0 Firebase requirement. The earlier schematic board did not meet the art brief and is superseded. Original desktop/mobile pixel-grid illustrations and an artwork-first hero review are now available; hold all wider frontend work, animation sprite production, and The Lab art until the user reviews these deliverables.
2. **Firebase access:** the Firebase CLI cannot run on this machine and the console requires Google sign-in. No project or plan state was available for inspection. Use Spark only and do not link billing; project setup is blocked until the console can be inspected.
3. **Cloudflare state:** public DNS is proxied through Cloudflare; account-side origin/TLS/rules must be reviewed before any migration plan is final.
4. **Existing edits:** local edits and untracked prototype files are present. They will be kept intact and isolated from rebuild work.
5. **Privacy/content:** decide whether the `/calendar` route should be removed, retained privately, or replaced; approve the specific verified résumé/project content before publication.

## 6. Reference links

- [Current public site](https://asad.atterkhan.com/)
- [Current website repository](https://github.com/amatterkhan/asad.atterkhan)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Firebase Hosting usage and quotas](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
- [Next.js static export](https://nextjs.org/docs/app/guides/static-exports)
