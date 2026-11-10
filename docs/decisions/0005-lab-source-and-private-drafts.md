# ADR 0005: Lab articles live in Git; drafts live in a private repository; the article editor is retired

**Date:** 10 November 2026 · **Status:** accepted, not yet implemented (Stage 3)

## Context

Production builds from Firestore today, and articles can be written either in `/admin` or as
Markdown in this repository. This repository is public, so a draft committed here is published.
The admin editor needs a second Markdown renderer in Go, golden fixtures to keep it in step, a
preview endpoint and inline styles on `/admin`.

## Decision

- **Markdown in Git is the only source for Lab articles.** Site copy, Thoughts, the wardrobe,
  Experience, Achievements and documents stay in Firestore and `/admin`.
- **Drafts are written in a separate private repository**, cloned into a gitignored
  `site/content/drafts/` for local preview. CI never sees it.
- **A CI gate fails** when a tracked article is not `published` or `archived`, or when its
  disclosure state is unresolved.
- **The admin article editor, the preview endpoint and `api/internal/markdown` are removed** once
  the switch is live.

Rejected: a plain gitignored folder (no history or backup) and Firestore drafts (keeps the editor).

## Rollout

1. Stage 3 adds an article-source setting separate from `CONTENT_SOURCE`.
2. The owner switches production with one repository variable and a manual deploy, after a preview
   channel has shown the result. Rolling back is setting the variable back and redeploying.
3. Firestore articles are left in place until the owner deletes them. The editor code is removed in
   a later pull request.

The exact commands ship with the Stage 3 pull request.
