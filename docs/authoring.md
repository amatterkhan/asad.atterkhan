# Writing and content maintenance

## In the admin (normal path)

Sign in at `/admin` (Google + TOTP). The **Writing** tab creates drafts, saves with version checks,
previews with the site's own renderer, and publishes or unpublishes. **Site copy** edits the hero,
role, intros and About text. Publishing asks GitHub to rebuild; the change is live when that
deploy finishes (see [architecture.md](architecture.md)).

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
category: Infrastructure
```

Dates are quoted ISO dates and cannot be in the future. Use `updatedAt` for substantive later
changes, keep `publishedAt` and the slug, and add a redirect rather than breaking an established
URL. Markdown is sanitised: raw HTML and unsafe links are removed. This repository is public:
keep confidential drafts out of it (use the admin, whose drafts stay in Firestore).

Validate with `npm run typecheck && npm test && npm run build` in `site/`.
