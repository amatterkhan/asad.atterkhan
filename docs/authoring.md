# Writing and content maintenance

## In the admin (normal path)

Sign in at `/admin` (Google + TOTP). The **Writing** tab creates drafts, saves with version checks,
previews with the site's own renderer, and publishes or unpublishes. **Site copy** edits the hero,
role, intros and About text. The motto and the page subtitles (Home, About, The Lab, 404) are
fixed in `site/src/lib/site.ts`, not admin copy, so they never drift. Publishing asks GitHub to rebuild; the change is live when that
deploy finishes (see [architecture.md](architecture.md)).

### The Lab map

The Lab is organised into **sections** (Writeups, Tooling, Notes…) with **categories** inside
them (Hack The Box, HTB Certifications, TryHackMe, CTF…). Visitors start at `/lab`, open a
section at `/lab/section/<section>` and narrow it at `/lab/section/<section>/<category>`; every
one of these is a prerendered page, and the search on each covers that shelf.

- **Lab map** (admin tab) adds, renames, reorders and removes sections and categories, and picks
  each section's icon and blurb. Ids come from the first name and are fixed once saved, because
  they are in URLs and in every article filed under them. Saving rebuilds the site.
- In **Writing**, each article picks a section and, optionally, a category from that section.
  An article without a section, or whose section was removed, shows in the **last** section; a
  category that is no longer in its section is ignored. Nothing breaks the build either way.
- **Thumbnails**: see [lab-thumbnails.md](lab-thumbnails.md).

## In Git (fallback and the default content source)

With `CONTENT_SOURCE=git` (the default) the site builds from `site/content/`. Articles are Markdown
files with frontmatter in `site/content/articles/<slug>.md`:

```yaml
title: "Understanding a system"
description: "A concise, accurate description."
slug: understanding-a-system
status: published
publishedAt: "2026-10-25"
tags: [systems, notes]
section: notes            # a section id from content/lab.json
category: infrastructure  # optional, a category id inside that section
thumbnail: understanding-a-system.webp   # optional, a file in content/thumbnails/
```

The Lab map itself is `site/content/lab.json` (its copy for the API is
`api/internal/content/data/lab.json`; a test keeps them equal).

Dates are quoted ISO dates and cannot be in the future. Use `updatedAt` for substantive later
changes, keep `publishedAt` and the slug, and add a redirect rather than breaking an established
URL. Markdown is sanitised: raw HTML and unsafe links are removed. This repository is public:
keep confidential drafts out of it (use the admin, whose drafts stay in Firestore).

Validate with `npm run typecheck && npm test && npm run build` in `site/`.
