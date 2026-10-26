# Writing and content maintenance

## New draft

From `platform/`:

```sh
npm run content -- new understanding-a-system
```

This creates `.private-content/articles/understanding-a-system.md`, which Git ignores. Edit with any Markdown editor. Run the local server and open `/preview/understanding-a-system`. `npm run content -- validate understanding-a-system` validates the frontmatter without publishing.

The existing GitHub repository is public. Git history is permanent enough that deleting a mistakenly committed private draft is not a privacy fix. Use a private content repository for shared draft history, or keep personal draft history outside this public checkout. Do not store passwords or infrastructure secrets here, even in drafts.

## Publish deliberately

Review the content, screenshot redactions, links, image descriptions and publication permission. Change metadata explicitly:

```yaml
title: "Understanding a system"
description: "A concise, accurate description."
slug: understanding-a-system
status: published
publishedAt: "2026-10-25"
tags: [systems, notes]
category: Infrastructure
```

Dates must be quoted ISO dates. Published dates cannot be in the future. Use `updatedAt` for substantive later changes; preserve `publishedAt` and the slug.

```sh
npm run content -- publish understanding-a-system --confirm-public
npm run typecheck
npm test
npm run build
```

The publish command creates a public source file under `content/articles/` and refuses overwrite. It does not deploy. Review the Git diff and merge through the chosen review/deployment process. All public representations derive from this same file.

Update an already-published article in `content/articles/`; add `updatedAt`. Set `status: draft` to remove it on the next release, but remember that its earlier source may already be public. Use a slug redirect rather than breaking an established URL.

## Article features

Standard Markdown, fenced code with language names, GFM tables, images with alt text, blockquotes, lists and internal links are supported. Code highlighting runs on the server. Code/table scroll containers work on mobile. Headings generate a TOC, including a collapsible mobile version.

For a small semantic diagram:

````markdown
```flow
Private upload -> Owner review -> Public copy
```
````

The flow syntax supports 2–10 short nodes, no executable directives. Use images or ordinary text/code diagrams for more complex architecture. Executable MDX and Mermaid runtime scripts are not enabled in V1.

Source-controlled article images can live in `public/media/` with reviewed filenames. Uploaded images become article-ready only after publication: use `/media/<document-id>`. Private paths/download URLs must never be embedded in a public article. Use descriptive alt text; keep image dimensions/aspect ratios intact.

## Projects and résumé

Edit `content/projects/*.json` for short project entries. Stable slugs generate their pages. Populate only verified details and actual links. No fabricated metric or case-study section is required. To add a longer case study, create a Markdown file in `content/case-studies/` and set the project JSON `writeup` field to its filename. It uses the same sanitized renderer and code/table enhancements. Short entries do not need a writeup.

Career, education, certifications and technical skills live in the corresponding `content/*.json`. The Experience page has a print/save-PDF control. Review dates/current roles and confidentiality before changing public text.

## Documents

After Firebase provisioning, configure local `.env.local` using `.env.example`, obtain approved ADC access, and use `/manage`. Sign in, verify owner authorization, upload privately, edit metadata, download/review the original, then select the explicit public-review checkbox if publication is intended. The UI supports unpublish and recoverable archive. Archived originals are retained; restoring archived state is currently an authorized maintenance operation, not a UI button.

The tool lists the latest 100 owner records. Search/pagination and a browser article editor are intentionally deferred until the library warrants them. Files are limited to PDF and safe raster formats in V1; Office files/archives/HTML/SVG are rejected.

## Achievements and Experience selection

`content/achievements.json` is the canonical verified credential catalogue. Add a stable string ID, `kind` (`certification`, `badge` or `award`), title, issuer and HTTPS credential link. Include `earnedAt` only when the date is verified. Do not invent dates, validity status or badge artwork. The public Achievements page searches the full collection and displays a responsive credential grid. The six-item Experience limit does not apply to that collection.

`content/achievement-settings.json` seeds the initial Experience shortlist when Firebase is disabled or no saved setting exists. Once `ENABLE_ACHIEVEMENT_ADMIN=true` is configured, the canonical selection is Firestore `siteSettings/achievements.featuredIds`. Credential bodies remain in Git; Firestore holds only the selection and operational metadata. A new saved selection supersedes the seed. An explicitly empty selection remains empty.

Use the local `/manage` content desk, sign in with the configured owner and TOTP, load the achievement selection, choose up to six, then save. The backend rejects unknown/duplicate IDs, extra fields and oversized requests. Both public Experience and the owner API read the same selection. Direct browser access to the settings collection is denied by the existing default-deny rules. The public collection still shows all approved Git records. Uploading a certificate file does not automatically publish a credential.

The footer now contains normal contact/calendar links and a motion control. The terminal and its entry points were removed from the current UI at the user’s request; its source is preserved in the design archive.

Home contains a short, source-controlled achievement preview using the first two IDs from the Git seed selection, plus a link to the full collection. The Firestore control continues to manage Experience specifically. Achievements is a primary navigation item on desktop and mobile.
