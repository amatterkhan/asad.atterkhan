# Writing and content maintenance

## Lab entries: Markdown in Git ([ADR 0005](decisions/0005-lab-source-and-private-drafts.md))

An entry is one file, `site/content/articles/<slug>.md`, and the slug is the file name. Publishing is
committing that file: no code change.

### Write a draft (private)

Drafts live in a separate private repository, cloned into `site/content/drafts/` (gitignored, so a
draft can never be committed here by accident). To create the private repository and clone it:

```bash
gh repo create lab-drafts --private
git clone git@github.com:<you>/lab-drafts.git site/content/drafts
```

Start an entry (writes `site/content/drafts/<slug>.md` with valid frontmatter, no dependency):

```bash
cd site && npm run new-entry -- my-first-entry "My first entry"
```

`npm run dev` lists drafts in the Lab (marked "Draft") and opens them at `/preview/<slug>`. The
production build never reads the folder. Commit and push drafts in the drafts repository.

### Publish

1. Move the file to `site/content/articles/`.
2. Set `status: published`, a `date` (not in the future) and a decided `disclosure`.
3. Run `cd site && npm run content:check && npm test`. A mistake fails with the file and the field.
4. Commit and merge. The deploy that follows publishes it.

```yaml
---
title: "Understanding a system"
date: "2026-10-25"
updated: "2026-11-02"        # optional: substantive later changes
section: notes               # a section id from content/lab.json
category: infrastructure     # optional: a category id inside that section
tags: [systems, notes]
summary: "A concise, accurate sentence."
series: systems-basics       # optional: give series and position together
position: 1
status: published            # draft | published | archived
disclosure: no-vulnerability # unresolved | disclosed | no-vulnerability | redacted
thumbnail: understanding-a-system.webp   # optional: a file in content/thumbnails/
---
```

**Disclosure** (hard rule: nothing undisclosed). `unresolved` is the draft default and **blocks the
build and CI**. `disclosed`: the program's rules allow a public write-up. `no-vulnerability`: the
entry describes no finding. `redacted`: a finding described without program or target details. The
entry page shows the label near its title and links to [/disclosure](../site/src/pages/Disclosure.vue).

**Archived** entries stay at their URL and in the ledger, marked "Archived", and are left out of
feeds and Home. Do not delete a published entry; archive it.

**What CI refuses** (`site/scripts/check-content.ts`): a tracked entry with `status: draft` or
`disclosure: unresolved`; frontmatter that does not validate; a Markdown or HTML image from another
origin; `<script>`, `javascript:`, inline event handlers, iframes and other elements the CSP or the
sanitiser would break; any SVG under `content/` or `public/` with script, event handlers or external
references. Code blocks may mention these. Raw HTML in Markdown is dropped in any case. Images belong
in the site itself (`site/public/`), not on another host.

Existing URLs stay: use `updated` for later changes, keep the `date` and the file name, and add a
redirect in `site/firebase.json` rather than breaking an established URL.

### The index, filters and feeds

`/lab` is a dated ledger grouped by year. Sections, categories and tags are filters, each a link to a
prerendered page that works without JavaScript: `/lab/section/<id>`, `/lab/section/<id>/<category>`
and `/lab/tag/<tag>`. Feeds: `/rss.xml` for the whole Lab and `/lab/section/<id>/rss.xml` for a
section. Each entry gets a link-preview image at `/lab/<slug>/opengraph-image.png`.

### The Lab map

The sections and categories are `site/content/lab.json` (Writeups, Tooling, Notes…; its copy for the
API is `api/internal/content/data/lab.json`, and a test keeps them equal). While the admin Lab map
tab exists it edits the Firestore copy. An entry with a missing section shows in the **last**
section; an unknown category is ignored. Nothing breaks the build either way. Thumbnails are
optional: see [lab-thumbnails.md](lab-thumbnails.md).

### Switching production to Git articles

Until the owner switches, production still reads articles from Firestore. The commands are in
[deployment.md](deployment.md#switching-lab-articles-to-git-and-rolling-back).

## In the admin

Sign in at `/admin` (Google + TOTP). **Site copy** edits the hero, role, intros, About text and the
link-preview line for each page. The motto and the page subtitles (Home, About, The Lab, 404) are
fixed in `site/src/lib/site.ts`, not admin copy, so they never drift. Saving asks GitHub to rebuild;
the change is live when that deploy finishes (see [architecture.md](architecture.md)). The **Writing**
tab is retired in a later pull request once production reads Git (ADR 0005).

### Experience

**Experience** (admin tab) edits the roles, education and skills on `/experience`: add, reorder and remove them, mark the current role and internal moves. Saving rebuilds the site. The starting set is `site/content/experience.json`. Certifications on that page are the achievements pinned under Achievements.

### Achievements

**Achievements** (admin tab) adds, edits, reorders and removes certifications, badges and awards (title, issuer, https credential link, type, optional date) and pins up to six to the Experience page, in the order listed under *Pinned*. Saving rebuilds the site. The starting set is `site/content/achievements.json` with the pins in `achievement-settings.json`.

### Thoughts

Now and then Asad says a one-liner in a speech bubble in the homepage room. **Thoughts** (admin
tab) adds, edits, removes and switches lines on or off, previews them, and sets when each may come
up: any time, at night, with Storm nearby, or in the Steins Gate worldline. One line can be
**featured**: it is the first Thought of each visit when its context fits; after that the room picks
at random. Switched-off lines never reach the page; with every line off, Asad says nothing. Saving
rebuilds the site. The starting set is `site/content/thoughts.json`.
