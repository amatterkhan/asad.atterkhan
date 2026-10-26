# Project reset: a personal technical notebook

25 October 2026 · Proposal for approval · No production changes

This document supersedes the direction in `../rebuild-discovery-and-proposal.md` for future work. That document and every earlier implementation/art asset remain intact. This proposal is not a record of design approval.

## Recommendation

Evolve the terminal into a quiet, readable personal website. Keep the prompt, monospace identity, navy/indigo, pastel colors, and small cat details. Give actual writing and engineering work the space previously occupied by game framing and scenery.

Review `index.html`: Home, The Lab, and Article each have a 1000 px desktop viewport and a real 390 px mobile viewport. Use “Open responsive page” to explore at the browser's actual width. The code is a standalone design study, not the replacement frontend. It has no dependencies or Firebase connection.

## 1. What was inspected

- Live homepage at https://asad.atterkhan.com, including the rendered terminal and its `help` command.
- Live Projects, Blog, and Resume pages; the local route map, content records, page templates, and deployment workflow.
- Current modified `src/App.vue`, `src/views/HomeView.vue`, and the untracked Pixel Quest components.
- Earlier room compositions, home-art assets, and the prior discovery/animation proposals under `docs/` and `public/art/`.
- Public HTTP response headers and DNS, read-only.
- Current official Firebase and Next.js documentation, linked below.

The checkout is on `main` at `c61dbed`. It has a local `dev` branch and no configured Git remote. It already contained modified application files and untracked redesign materials before this audit. No source edits, pushes, commits, infrastructure changes, or deletions were made for the reset. Only `docs/reset-review/` was added.

### Deployment evidence and limits

The live site returned HTTP 200. Headers identify Cloudflare in front of a GitHub Pages origin. Public DNS returns Cloudflare addresses; authoritative nameservers are Cloudflare. The checked-in GitHub Actions workflow builds `dist` and deploys to Pages on pushes to `main`. `public/CNAME` names `asad.atterkhan.com`.

A fresh GitHub API read also confirms the repository is public, its default branch is `main`, and Pages is built through a workflow with this custom domain. Pages reports `https_enforced: false`; the public HTTPS request succeeds through Cloudflare, so that flag alone does not establish the edge redirect or origin TLS configuration. Verify both before migration.

These observations establish the current deployment path. They do not reveal the proxied origin DNS record, Cloudflare rules, SSL mode, dashboard settings, Firebase project state, or billing account. Those account-side settings still need a read-only review before staging or cutover. Prior notes about account access and the local Firebase executable were not treated as freshly verified facts.

## 2. The original site's identity

**Keep:** `asad@atterkhan`, the path-like navigation language, compact monospace type, Nord/pastel colors, the short human introduction, ASCII cat, clear contact links, theme tokens, and the bounded terminal commands. Nord is the source's default theme; the site is not only a bright-green terminal.

**Improve:** the introduction currently appears after a multi-second simulated startup and typing sequence. The command field then autofocuses, which can take keyboard focus and is awkward on touch devices. The full-height shell, nested content scrolling, fixed contact strip, and fixed footer consume reading space. Content uses significant empty width on Home. Many borders and colors carry equal emphasis. Mobile social buttons lose visible labels. Reduced-motion handling needs work.

The original already has ordinary navigation. Keep that convenience, extend it to Home / The Lab / Projects / Experience / About, and make terminal interaction a secondary choice.

### How the terminal works

`TerminalOutput.vue` stores output lines, history, input, startup timers, and an ASCII-cat interval in Vue state. Enter lowercases/trims input and dispatches a fixed switch. Commands include help, whoami, about, skills, contact, projects, recent, resume, blog, history, date, clear, and refresh. Navigation uses Vue Router. It does not execute a shell or evaluate input.

Reuse that bounded dispatch idea, the useful command names, and history. Extract command definitions from startup animation and presentation. Alias `blog` to `lab` and `resume` to `experience`; make navigation commands predictable. Remove mandatory startup delays and autofocus. Use text nodes for command output, an explicitly labeled input, limited output history, and a polite screen-reader log. Nothing user-entered should become HTML, MDX, executable JavaScript, or a server command.

## 3. Why the newer direction misses

There are two newer artifacts, not a completed replacement platform:

1. **Pixel Quest (running in local development):** player card, `LVL X`, XP/class labels, quests, “open world portfolio,” oversized frame borders, drifting particles, and a custom cursor. Some text is 6–12 px. The cat is assembled from CSS rectangles and called NUKO; it is not a reference-based Storm sprite. These familiar game metaphors introduce a fictional identity rather than reveal yours. Broad style overrides reshape all existing pages without resolving their content hierarchy.
2. **Night Shift room studies:** more restrained than Pixel Quest, but their illustrated room and repeatable bordered panels still carry much of the personality. The same general “developer at a glowing desk” visual could represent almost anyone. Shrinking or reworking room art for each viewport creates maintenance work unrelated to publishing good technical notes.

The problem is the replacement of personal details with a visual theme. A smaller amount of intentional type, content, and interaction will be more distinctive than more scenery.

## 4. Design proposal

### Visual language

- Background `#151827`; code/background recess `#111522`; secondary surface `#1c2033`.
- Main text `#e3e3ef`; secondary text `#a7abc5`.
- Lavender `#c3b2ed` for headings/selection; cyan `#95d5dc` for links; mint `#accfb8` for prompts; amber `#e6c393` for occasional notes.
- Existing locally licensed Departure Mono for the wordmark, headings, navigation, and metadata. System sans for long prose at 16–17 px, line-height about 1.8. This keeps the terminal identity while making articles comfortable to read. Final font choice remains open to review.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px. One-pixel dividers; square code containers; no decorative shadows, glow, gradients, or floating cards.
- Desktop content cap about 1024 px. Prose about 65 characters, with wider code and tables. Mobile uses 20 px gutters and normal document scrolling.
- Visible focus, underlined contextual links, semantic headings, ≥44 px navigation targets. No essential motion or decorative animation in this concept.

### Home

Immediate “Hey, I'm Asad.” introduction, a plain-language description, two existing projects, one writing sample, and a closed optional terminal. A narrow desktop margin note holds interests instead of a hero illustration. Mobile puts a short interests note in the reading flow. Contact appears in both the introduction and footer.

### The Lab

A short personal introduction, one search field, a small content-derived topic filter, and dated article rows. No fixed category taxonomy and no mandatory featured card. Search filters the illustrative records in this study. Production search will index titles, summaries, headings, tags, and article text at build time. No paid search service is needed initially.

### Article

A substantial title, publication/update metadata, readable prose, an indented note, highlighted code with copy control, a horizontally scrollable table, an HTML flow diagram, and a table of contents. Desktop gets a margin TOC; mobile gets a collapsible one before the body. Related writing should appear only when actual relevant content exists.

The demonstration text is explicitly illustrative, with sample dates. It is not a new claim about Asad's work and is not published. The existing “About Me” metadata points at a body that currently contains only “Hello World / Welcome!”; migration requires reconciliation, not blind import. Dummy posts must be excluded.

## 5. Asad and Storm

No appearance has been invented in this review. The footer cat is the original ASCII motif, not a substitute for Storm's requested pixel art. Existing portrait/cat GIFs are reference candidates only; their provenance, likeness, and reuse approval need confirmation.

After photographs are provided, propose static character designs first. Target both characters on a consistent 48×48 logical canvas with a shared limited palette, deliberate clusters, transparent PNG exports, and 1×/2×/3× nearest-neighbor previews. Preserve editable layered source where possible. Allow different occupied sprite bounds so the cat and person retain natural proportions.

After character approval, V1 can use Asad idle + typing and Storm sitting + blinking. Deliver sprite sheets, a frame/state manifest, and motion-disabled stills. CSS `steps()` is sufficient. Use one small paired scene near the footer or About introduction, never a cursor companion. Final placement should be reviewed with the actual sprites; no game engine or room assets are needed.

## 6. Practical architecture

### Preferred full-platform option

**Next.js + TypeScript, statically generated public content, Firebase App Hosting, Firestore, Cloud Storage, and owner-only Firebase Authentication.** This matches the requested platform and allows a small secure backend for document operations without making public reading depend on database queries.

App Hosting has first-party build/deploy support for Next.js and Angular. Its documented support table can lag current Next.js releases: select a patched framework/Node combination that is actively supported at implementation time, and test the adapter rather than blindly installing the newest major. [Framework support](https://firebase.google.com/docs/app-hosting/frameworks-tooling)

Public pages use generated HTML, with small interactive modules for search, terminal, copy buttons, and sprites. Do not ship Firebase SDKs to ordinary readers. Avoid an animation library and general-purpose UI kit.

### One owner per kind of content

| Material | Canonical source | Public representation |
| --- | --- | --- |
| Article body + metadata + draft/publish state | Git Markdown/MDX with validated frontmatter | Generated HTML/search/RSS/SEO; no second editable Firestore article body |
| Project records + optional long case studies | Typed Git content / Markdown | Generated listings and detail pages |
| Career/About facts | Reviewed Git content | Generated pages and print view |
| Uploaded document metadata | Firestore (`documents`: owner UID, object path, title, size, detected type, hash, visibility, timestamps) | Only explicitly published records enter the public release snapshot |
| Private originals and uploaded media | Cloud Storage private area | No public URLs or read access by default |
| Approved public downloads/images | Separate public copy/prefix or bucket | Explicit public read, immutable/versioned asset URLs |

Firestore is for operational file records, upload status, and document publishing decisions. Article metadata belongs alongside the article in Git; a generated index is disposable output, not another editorial database. Small source-controlled article assets can stay with the repository. Larger uploaded assets use stable Storage references.

### Authoring workflow

1. Create a Markdown file with `status: draft` on a branch. Draft source needs a private repository if it is confidential: omitting a page from the website does not hide a file in a public GitHub repository. The GitHub API confirms this repository is public. Do not add private draft files to it. Keep confidential drafts outside it until a private content repository or private source repository is chosen.
2. Edit in a local Markdown editor or GitHub's editor in the private source. Save freely with Git history. A local preview includes drafts and labels them clearly.
3. Validate metadata, links, code, images/alt text, and publish status. Production builds reject malformed metadata and include only explicit `published` records with valid publication dates. Apply the same filter to direct routes, RSS, related items, search, sitemap, and generated asset manifests. Never copy the raw draft directory into a public build.
4. Review a release locally or on controlled staging. A hard-to-guess URL and `noindex` do not make staging private. If staging lacks enforced access control, deploy approved public material only; review drafts locally.
5. Explicitly change state and merge the reviewed release. Routine later publishing is a Git workflow; the initial production migration still requires approval.
6. Update the same file and `updatedAt`; keep stable slugs and Git history.

Use Markdown as the default. MDX is trusted code compiled at build time, so accept it only from controlled source with an allowlisted component set. Never compile uploaded/untrusted MDX. Disable raw HTML in ordinary Markdown, restrict URL protocols, and sanitize allowed HTML. Render code as escaped text. Generate diagrams at build time or use trusted components; do not evaluate arbitrary diagram scripts in visitors' browsers.

### Minimal private document management

Start with a **local owner tool** for uploads, metadata edits, private downloads, and publish review. Do not deploy an administrative login page with the public site. Firebase Authentication can sign the owner in from an explicitly authorized localhost origin; security comes from verified identity and authorization, not the tool's location.

Authorize a fixed owner UID plus an admin claim set only by a privileged provisioning step. Use an account protected by strong MFA. Signing in or registering an arbitrary account must confer no document rights. If enforced Firebase MFA is needed, select and cost that configuration explicitly.

The browser tool can handle private CRUD under strict Firestore/Storage rules. A narrow authenticated server operation handles publication to the public area: check owner identity server-side, validate the original and metadata, create the reviewed copy, update publication state, and log the action. Use a recoverable publication state machine so partial failures cannot mark a file published before its copy is ready. Unpublishing removes public access/copy and metadata; already downloaded material cannot be recalled.

Public metadata should enter a release through a generated snapshot or read-only build step. Content changes trigger one reviewed build, not live database reads by every visitor. The local tool manages documents; the Markdown editor manages writing. Do not build a second article editor/CMS in V1.

### Security boundaries to implement and test

- Default-deny Firestore and Storage access. Owner-only records and private uploads. No anonymous writes or uploads. Separate dev/staging/prod projects and identities; emulator data for local work.
- Storage upload limits for size and allowed types; server-side file-signature checks before publication because client MIME types are untrusted. Keep incoming files private until review; serve downloads with safe content-disposition/type and prevent executable HTML/SVG uploads from becoming trusted site content.
- No permanent Firebase download-token URLs for private files. Use authenticated SDK downloads or short-lived server-authorized downloads. Rules protect client access; Admin SDK operations bypass them and require their own authorization/IAM checks. [Firestore rule limits](https://firebase.google.com/docs/firestore/security/rules-conditions) · [Storage security](https://firebase.google.com/docs/storage/security)
- Server verifies tokens, UID/claim, schemas, object ownership, allowed state transitions, and method. Never trust a client `admin` field. Apply per-owner/IP operation quotas, upload quotas, and backend rate limits; App Check can add abuse protection but does not replace authorization.
- Backend service identity has only needed document/bucket access. Use short-lived GitHub federation or managed repository connection, no service-account key in Git. Secrets stay in managed secret storage.
- CSP, HSTS where appropriate, nosniff, referrer policy, framing restrictions, safe external links, dependency auditing and updates, minimal logs without document bodies/tokens. Rules and auth tests include unauthenticated, other-user, forged metadata, oversized upload, draft leakage, and failed publication cases.
- Public contact uses the existing mail link; no anonymous contact-form endpoint to secure or pay for in V1.

## 7. Costs and the simpler alternative

Current official documentation checked 25 October 2026:

- **App Hosting requires Blaze billing.** Its documented no-cost allowance includes 10 GiB/month outgoing bandwidth; excess cached/uncached bandwidth is $0.15/$0.20 per GiB. Builds, runtime, container images, logging, and secrets have separate allowances/charges. [App Hosting costs](https://firebase.google.com/docs/app-hosting/costs)
- **Cloud Storage for Firebase requires Blaze**, including existing default buckets under requirements effective from February 2026. Storage/egress charges depend on region and bucket type; US free-tier conditions must not be assumed for another region. [Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- **Firestore Standard** includes one database with 1 GiB stored, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, and 10 GiB/month outbound transfer. Backups/PITR have separate billing. Owner-only document metadata should be small relative to these allowances. [Firestore quotas](https://firebase.google.com/docs/firestore/quotas)
- **Authentication:** a single owner using Google sign-in fits the basic non-phone authentication model. Phone/SMS and advanced identity features need separate costing; do not enable them implicitly. [Authentication pricing](https://firebase.google.com/pricing)
- **Firebase Hosting is a simpler static delivery alternative.** It includes 10 GB stored hosting content; the pricing page currently lists 360 MB/day free transfer. The detailed Hosting quota page describes its transfer allowance on a monthly basis, so verify the console's active allowance rather than treating an old “10 GB/month” note as an exact current promise. [Firebase pricing](https://firebase.google.com/pricing) · [Hosting quotas](https://firebase.google.com/docs/hosting/usage-quotas-pricing)

**Planning estimate, not a quote:** at 1,000 visits/month, roughly 1 MB transferred per visit, 1 GB of stored documents/media, a handful of owner uploads, and ten builds/month, allow **US$0–5/month** for a lean configuration. This assumes no always-on minimum instance, no high-volume document downloads, short log retention, and available no-cost allowances. It is not a hard ceiling. Multiple environments, regional egress, many image builds, abusive traffic, large downloads, paid identity features, or shared billing-account usage can change it. Recalculate for the chosen region and account before enabling billing.

Configure alerts at a proposed $1 / $3 / $5 and review usage. Budget alerts do not cap charges. Evaluate the currently documented Cloud Run spend-cap control separately for App Hosting; it does not cap Storage, Firestore, or all project charges. Limit instances, retained artifacts, file sizes, upload frequency, and public download volume.

**Alternative:** Next.js static export on Firebase Hosting, with the same Git content and owner-only Firebase data services. This removes the public application runtime and simplifies cost/performance. Export does not support request-time APIs or server-only features; secure publication would need a small separate privileged tool or backend. [Static export constraints](https://nextjs.org/docs/app/guides/static-exports)

**Choice proposed for approval:** use Next.js + App Hosting for the requested complete platform, keeping public pages static and admin tooling local. Choose Firebase Hosting static export instead if runtime simplicity takes priority over keeping secure server operations in one application. No billing has been enabled. A Spark-only option cannot satisfy the requested Cloud Storage library today.

## 8. Reuse map

| Existing work | Disposition |
| --- | --- |
| `src/data/projectsData.json`, career/education/certification JSON | Migrate after factual/privacy validation; normalize links and null entries. Do not invent missing outcomes. |
| `TerminalOutput.vue`, `commandsData.json` | Reuse bounded behavior and data; rewrite into a small optional component. Avoid carrying startup timers into primary content. |
| `useTheme.js`, original stylesheet | Reuse palette knowledge; consolidate tokens and contrast/focus rules. Theme switching is optional for V1. |
| Existing social/contact URLs | Reuse after validation. |
| `BlogView.vue`, `ProjectsView.vue` | Reuse search/filter concepts, not the bordered-card treatment or full component code across frameworks. Fix pinned category predicate (`c.includes(c)`), duplicate pinned rows, and dates. |
| Article/project templates and HTML bodies | Salvage verified content and code/table styling requirements; replace client fetch/`v-html` pipeline. Add true missing-page behavior; unknown article IDs currently dereference absent metadata. |
| Résumé components | Reuse facts/section organization; rebuild semantic layout in the selected frontend. Verify current roles and sensitive details before republication. |
| Departure Mono + license | Reuse if approved; license copied into this concept. |
| Existing portrait and cat GIFs | Keep archived; reference/provenance review before reuse. No assumption they depict Storm. |
| Pixel Quest components | Preserve as earlier experiments. Do not carry player HUD, cursor replacement, moving background, CSS cat, or global style overrides into the new frontend. |
| Room source/export PNGs and animation plan | Preserve as prior studies; no place in V1 visitor bundle. |
| Deployment workflow/route inventories | Reuse inventory and CI lessons; replace GitHub Pages deploy only at the approved cutover. |

There is no implemented Firebase backend, Markdown/MDX publishing platform, sprite animation system, or secure admin console to salvage in the inspected source. These remain engineering work after design approval.

## 9. URL continuity, staging, and rollback

Inventory more than the primary nav. Current paths include `/blog`, `/post/:id`, `/resume`, `/project/:id`, and `/calendar`. The 404 handler also contains legacy `/techbooks`, `/islamicbooks`, and `/nightschool` redirects. Review those destinations privately for intended use and permission before preserving them; do not copy their content or credentials into the rebuild.

- `/blog` → `/lab`; `/resume` → `/experience`.
- Map real old post/project IDs to stable new slugs with permanent HTTP redirects. Dummy posts should get an intentional 404/410 decision, not a fabricated replacement article.
- `/post/0` needs a body/metadata reconciliation before assigning its new canonical destination.
- Do not carry the personal shift calendar into the new public site by default. It requires a privacy decision.
- Test old links, canonical URLs, real 404s, image/document paths, sitemap, RSS, OG, and structured data on staging. A Google Analytics or other tracking integration is not assumed.

Before cutover: read the Cloudflare record/rules with account access; record exact original values/proxy status/TTL; verify domain ownership/TLS with Firebase; retain the current Pages deployment and repository. Develop in an isolated directory/branch; do not push approval concepts to `main`, which triggers deployment. Use separate staging/prod Firebase projects and a non-production hostname; never point the live hostname at staging.

After explicit production approval: deploy a reviewed release, make the minimal DNS/domain changes, verify TLS and every primary/legacy route, then monitor errors and downloads. Preserve the previous Firebase revision/release for application rollback. For migration rollback, restore the recorded Cloudflare record and proxy settings to Pages; allow for DNS and cache propagation. Keep GitHub Pages available until the replacement is accepted. No migration action was taken during this review.

## 10. Verification and next approval

The design review is local static HTML/CSS with small browser scripts. It demonstrates normal navigation, responsive layouts, filtering, copy control, in-page contents, and bounded terminal dispatch. It is not a production Markdown pipeline, RSS service, document library, or deployed staging environment.

Browser inspection and functional checks are recorded in `verification.md`. Actual iPhone Safari and desktop Chrome/Firefox testing remain release gates for the approved implementation; a narrow iframe is layout evidence, not an iPhone device test.

Approval requested: the **visual direction** shown on Home, The Lab, and Article, plus the proposed **Next.js/Firebase architecture** in principle. This is not approval to enable billing or migrate DNS. Character work requires reference photographs and static concept approval before animation. Implementation can proceed after the design direction is accepted.
