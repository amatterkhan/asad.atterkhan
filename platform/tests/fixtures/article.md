---
title: "A notebook needs room for the details"
description: "An unpublished layout fixture for testing technical prose, code, tables, images, and the small things that make a long article readable."
slug: reading-layout
status: draft
tags: [layout, testing]
category: Design fixture
---

## Start with a question

This is **sample content for local testing**, not a published technical article or a claim about a completed project. A notebook should leave enough room for the commands, diagrams, screenshots, and context that make an experiment reproducible.

> Keep the observation close to the command that produced it. A result is easier to understand when its context has not disappeared.

## Keep the commands readable

```typescript
const note = {
  title: "An experiment worth keeping",
  status: "draft",
  artifact:
    "private/owner/documents/an-experiment-with-a-deliberately-long-file-name.pdf",
};
console.log(note.title);
```

Code should scroll inside its container, rather than pushing the whole page sideways. The same applies to wide tables.

| Material          | Canonical source                                        | Public by default? |
| ----------------- | ------------------------------------------------------- | ------------------ |
| Article draft     | Private working directory or private Git content source | No                 |
| Published article | Reviewed Markdown source                                | Deliberately       |
| Document original | Private Cloud Storage path                              | No                 |
| Public download   | Explicitly published copy, with a separate object path  | Deliberately       |

### A small diagram

```flow
Private draft -> Local preview -> Review -> Publish -> Public page
```

A plain text diagram can sometimes explain a boundary better than a complicated illustration.

## Images and links

![Asad and Storm, the website's approved pixel-art characters](/sprites/together.png)

Images should have useful descriptions and a natural aspect ratio. Follow an [internal link to Projects](/projects) without losing the site’s normal navigation.

- Keep publication and update dates separate.
- Use stable article slugs.
- Include enough detail to make a note useful next month.

## Leave a useful ending

The reading experience should work when animations are disabled. Decoration should never compete with the idea a reader is trying to understand.
