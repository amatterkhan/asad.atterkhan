# Handoff: remaining work on asad.atterkhan.com

Written 11 November 2026 for the agent that takes over from Stage 2. Read this whole file before
touching anything. It caches only what the repository cannot tell you: the owner's rules and
decisions, what is finished, and what each remaining stage must deliver. Everything else is in the
code and in `docs/`; this file points at it instead of repeating it.

Delete this file in the final Stage 5 pull request.

## The goal

The site becomes a credibility engine for bug bounty and security engineering work. The Lab is the
product; every other page supports it. Publishing an entry must never need a code change. The site
is interactive, mobile-first and hardened.

The owner is Asad (Mohammad Asad Atterkhan, handle `sdnull`). He is the sole developer, maintainer
and admin: no team, no second reviewer, nobody else with access.

## Hard rules

These are the owner's words. Stop and ask him when a task would break one.

1. Nothing undisclosed. No vulnerability details unless the program's disclosure rules allow it,
   and no private-program material.
2. No Checkout.com internals or work-confidential material. The About copy already mentions
   internal tooling (a vulnerability management platform, browser extensions, AI agents). Do not
   expand it.
3. No invented experience, bounties, rankings, stats, testimonials or "trusted by" claims. Keep
   three things separate everywhere: hands-on experience, exposure, and learning in progress.
   Profile links and numbers (HackerOne reputation, ranks and so on) go in only if the owner
   supplies them. Do not guess profile URLs.
4. The hero says "I'm a security engineer" by the owner's choice ([ADR 0004](decisions/0004-hero-wording.md)).
   Everywhere else the job title is "Security Operations Analyst".
5. Never push, deploy, merge to main, or change cloud, GitHub or DNS settings without asking. Give
   the owner exact commands instead. Dated owner-only actions are in [security.md](security.md).
6. No secrets in the repository. It is public; treat every commit as published.

## Standing constraints

- **The owner writes the content.** You build the place it goes. Sample content in mockups, tests
  and the component page is labelled as placeholder. Never invent credentials, handles, numbers or
  dates.
- **Fixed identity:** the pixel room, Worldlines, Thoughts, Storm, the motto, the page subtitles,
  serif display headings, the mint accent, the night and day palettes. Mono type (Departure Mono)
  appears in chrome only: navigation, filters, metadata, the command palette.
- **Low maintenance wins.** Every new tool, service or recurring task gets a one-line
  justification of its ongoing cost in the pull request, or it does not go in
  ([ADR 0002](decisions/0002-solo-owner-controls.md)). Automate what one person would forget.
- **The admin surface shrinks, never grows** unless the owner asks. Every admin feature is attack
  surface only he defends.
- **Tests are added, never weakened.** A failing test is fixed at the cause.
- **Evidence for every "done":** the command and its output, plus screenshots at 390px and 1280px
  in dark and light for anything visible. Test motion with Reduce Motion on and off; the owner's
  iPhone has Reduce Motion on.
- **The rebuild token (SEC-02) stays untouched.** Remind the owner it is open at the end of each
  stage.
- **Docs stay short and current.** A big decision gets an ADR in `docs/decisions/` (next number
  is 0007). Domain terms go in the root `GLOSSARY.md`.

## How every stage runs

1. Cut a branch from an up-to-date `main` named `stage-N-<topic>`. Open a GitHub issue for the
   stage (`gh`, see [agents/issue-tracker.md](agents/issue-tracker.md)).
2. For visible work (Stages 3 and 4): write a short brief, render two or three directions as
   static mockups, show screenshots, and wait for the owner's pick. Revise at least twice from his
   feedback before building. The Lab's direction is already picked (Notebook), so Stage 3 mocks
   only what the Stage 2 mockups did not cover.
3. Build in small commits. Each commit message ends with
   `Co-Authored-By: Claude <noreply@anthropic.com>`.
4. Before asking to open the pull request, all of these pass locally: `make check`,
   `cd site && npm run build && npm run budget`, `cd site && npm run test:e2e` (four Playwright
   projects: desktop and mobile, dark and light).
5. One pull request per stage. Its body lists what changed, what was verified with results, and
   what was not verified, and ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
6. Stop. Summarize for the owner what changed, what you verified and what you could not. The
   owner decides when to merge.

**Merging deploys.** `site-deploy.yml` runs on every push to `main` and `site-production` has no
approval gate yet, so a merge is live within minutes. Say so each time you ask about merging.

## Where things stand

| Stage | State |
| --- | --- |
| 0 Orientation | Done. Decisions are below and in ADRs 0002 to 0005. |
| 1 Foundation and security baseline | Merged (pull request 49) and live. `site/scripts/check-live.ts` passed all 22 checks against production. |
| 2 Design system | Pull request [52](https://github.com/amatterkhan/asad.atterkhan/pull/52) open on `stage-2-design-system`, checks `api`, `site`, `secrets` green at `299e472`. **Waiting for the owner to merge.** Issue 50. |
| 3 The Lab | Not started. Starts after 52 is merged. |
| 4 Remaining pages and interactivity | Not started. |
| 5 Hardening and verification | Not started. |

What Stage 2 left ready for you:

- `site/src/styles/app.css` is a list of imports; rules live in `site/src/styles/parts/`. The
  import order is the cascade order. Parts up to `admin.css` are in `layer(components)`; `lab`,
  `admin-lab`, `notebook`, `mobile` and `touch` are unlayered and so win. Keep that split
  ([development.md](development.md), "Styles and components").
- Notebook components that no public page uses yet: `PathLine`, `FilterTabs`, `Ledger`,
  `EntryNav` (`site/src/components/`), `groupByYear` in `site/src/lib/ledger.ts`, styles in
  `parts/notebook.css`.
- `/styleguide` renders every piece on the dev server only and is a 404 in the built site. Add
  each new component to it.
- `parts/touch.css` and the "touch targets are at least 44px" browser tests. A new control
  under 44px on a phone fails CI.
- Size budgets in `site/scripts/check-budget.ts`. Raise a number only in the commit that adds the
  weight, and say why.

Traps already hit once:

- CI's Linux fallback serif is shorter than macOS Iowan Old Style, so one-line serif links
  measure 36px there and 44px or more locally. Give text links a stretched hit area (the `::after`
  list in `touch.css`) instead of relying on line height.
- Public pages allow no inline style (strict CSP, Trusted Types). The build moves inline styles to
  `data-s` rules and fails on any that remain. Put styles in a part file.
- Intl short month names differ between runtimes ("Sep" and "Sept"); `ledger.ts` spells them out.
- Wait for `main` to reach `opacity: 1` before an axe scan, or the entrance animation produces
  false contrast failures.
- Light theme needs its own contrast check: syntax colours and table headers failed at first.

## Owner decisions already made

- **Title:** "Security Operations Analyst" everywhere except the hero.
- **About wording:** stays as it is. The Experience page has sentences naming the employer's
  vendors; **ask the owner whether they stay before Stage 4 ships.**
- **Profiles and numbers:** none until he supplies them. Build the fields so a handle slots in
  later and renders nothing while empty.
- **Lab source:** Markdown in Git only; drafts in a separate private repository cloned into the
  gitignored `site/content/drafts/`; a CI gate; the admin article editor, the preview endpoint and
  `api/internal/markdown` are retired ([ADR 0005](decisions/0005-lab-source-and-private-drafts.md)).
- **Design:** Notebook ([ADR 0006](decisions/0006-design-direction-notebook.md),
  [design-brief.md](design-brief.md)). The Lab index is a dated ledger grouped by year with the
  whole row as the link. Sections become filters; the section cards and thumbnail shelf go away.
  Entries are serif at 60 to 70 characters, contents in the right margin, collapsible on a phone.
  Thumbnails are optional.
- **Contact:** `mailto` and `security.txt` only. A PGP key comes later, from the owner.
- **Interactivity candidates:** command palette, URL-synced Lab filters, reading aids, expandable
  certification cards, a pixel 404, a "?" shortcut overlay. The owner cuts this list when you
  propose Stage 4; filters belong to Stage 3.

## Stage 3: The Lab

Outcome: the owner publishes a Lab entry by committing one Markdown file, and nothing that is not
cleared for disclosure can reach the public repository or the built site.

Read first: ADR 0005, ADR 0006, [authoring.md](authoring.md), [architecture.md](architecture.md),
`site/src/lib/schemas.ts`, `site/src/lib/content.server.ts`, `site/scripts/build.ts`,
`site/src/pages/Lab.vue`, `Article.vue`, `ArticlePage.vue`, `site/src/islands/LabSearch.vue`,
`AdminWriting.vue`, `api/internal/markdown/`, `api/internal/server/content.go`.

Deliver, in this order, each with tests:

1. **Entry schema.** Frontmatter validated at build time: title, date, updated, section,
   category, tags, summary, series and position, status (`draft`, `published`, `archived`), and a
   disclosure field. Propose the disclosure states to the owner and get his answer before coding
   them; the rule they enforce is hard rule 1. An invalid file fails the build with the file name
   and the field. Done when a fixture for each invalid case fails with a readable message.
2. **Article-source setting**, separate from `CONTENT_SOURCE`, so production can read articles
   from Git while everything else still comes from Firestore. Done when both values build and the
   default leaves production unchanged.
3. **Private drafts.** `site/content/drafts/` is gitignored; the dev server renders drafts found
   there; the production build ignores the folder. Done when a draft appears on the dev server
   and is absent from `dist/`.
4. **CI gate.** CI fails when a tracked article is not `published` or `archived`, or its
   disclosure state is unresolved. Done when a test fixture proves each failure.
5. **Content lint.** Fail on images loaded from another origin, on SVG that carries script,
   event handlers or external references, and on anything else the CSP would block at runtime.
   Done when each case has a failing fixture.
6. **Scaffold.** One command creates a new entry file with valid frontmatter in the drafts
   folder. No new dependency.
7. **Index.** `/lab` built from `Ledger`, `FilterTabs` and `PathLine`. Filters for section,
   category and tag are links, work without JavaScript as prerendered pages, and sync to the URL.
   Existing `/lab/section/...` URLs keep working or redirect; say which in the pull request.
8. **Search.** The plan names Pagefind. Check its bundle against the `/lab` budget and the CSP
   before adopting it; if it does not fit, keep and extend `LabSearch` and record why.
9. **Entry page.** Disclosure status shown near the title, series navigation, newer and older
   links (`EntryNav`), contents in the margin, reading aids that need no upkeep.
10. **Feeds and link previews.** RSS or Atom per section and for the whole Lab
    (`site/scripts/feeds.ts`), Open Graph images per entry (`site/scripts/og.ts`).
11. **Disclosure page.** A public page that states how findings are disclosed here. The owner
    writes its text; you build the page and leave clearly labelled placeholder copy.
12. **Strict CSP on `/admin`** once the editor's inline styles are gone.
13. **Retire the editor**, as a separate later pull request after the owner has switched
    production: `AdminWriting.vue`, the preview endpoint, `api/internal/markdown`,
    `site/scripts/markdown-golden.ts` and their tests. Firestore articles stay until the owner
    deletes them.
14. **Docs.** Rewrite [authoring.md](authoring.md) for the Git workflow. Put the exact commands
    for the production switch and for rolling it back in the pull request body and in
    [deployment.md](deployment.md): one repository variable, a preview channel first, then a manual
    deploy.

Stage 3 is done when: a fixture entry committed as Markdown appears on the index, in the filters,
in search, in the feed and with a link preview, with no code change; every gate above has a
failing fixture; and the owner has the switch and rollback commands.

## Stage 4: Remaining pages and interactivity

Outcome: a visitor who lands on any page can tell within a minute who this is, that the work is
real, and where the Lab is.

Start by proposing a brief and two or three directions for Home, then the interactivity list for
the owner to cut. Build only what he keeps.

- **Home trust layer.** What a hiring manager or triager needs first: role, the most recent Lab
  entries, credentials. Only facts the owner has supplied. The room stays the one loud thing.
- **Title everywhere it is machine-read.** "Security Operations Analyst" in JSON-LD, Open Graph
  and meta descriptions; the hero keeps "security engineer".
- **Handle fields.** Admin fields for profile handles and URLs that render nothing while empty and
  accept only `https://` (`site/src/lib/safe-url.ts`). This is the one allowed admin addition.
- **Experience, About, Achievements, Workbench** moved onto the Notebook pieces. Remove the
  decorative numbering on Workbench projects and the uppercase labels above headings that carry no
  information (design brief, "Problems"). Keep experience, exposure and learning in progress
  visibly separate.
- **Interactivity** from the owner's cut list. Each item works with a keyboard, respects Reduce
  Motion, stays inside the size budgets and adds no runtime dependency without a justification.
- **Open from Stage 2:** the Home list link is under 44px on tablets; the Console direction's
  phone bottom bar was set aside to revisit here (ADR 0006).

Stage 4 is done when every public route passes the browser suite on four projects, has
screenshots at both widths and both themes, and the owner has approved the copy he wrote.

## Stage 5: Hardening and verification

Outcome: evidence that the finished site is what it claims, and a short list of what only the
owner can still do.

- Re-run [threat-model.md](threat-model.md) against the finished site and update it.
- Confirm every row of "What is enforced, and by what" in [security.md](security.md) still has
  its test, and add rows for Stage 3's gates.
- Accessibility: axe on every route in both themes, keyboard-only pass, Reduce Motion pass.
- Performance: budgets hold; record Lighthouse numbers for Home, `/lab` and one entry.
- Run `site/scripts/check-live.ts` against production after the last deploy and paste the output.
- Walk [recovery.md](recovery.md) and [maintenance.md](maintenance.md) as a dry read; fix anything
  that no longer matches.
- Delete this file. Final summary to the owner: done, verified, not verified, and his open list.

## The owner's open list

Remind him of these at the end of each stage. Commands are in [security.md](security.md),
"Owner actions". You run none of them.

- Merge pull request 52.
- Check Google sign-in on production `/admin` under the new COOP and CSP headers.
- Ruleset on `main` with required checks `api`, `site`, `secrets`; no force-push, no deletion, no
  review count.
- Approval gate on `site-production`. Until this exists, merging is deploying.
- Re-run the setup script (exporter and preview identities, `site-export` limited to `main`).
- CAA records; HSTS on the apex before preload; the unverifiable rows in security.md.
- Rebuild token scope (SEC-02), deferred by him.
- Decide the Experience page's vendor wording before Stage 4 ships.
- Supply profile URLs and numbers, and a PGP key, when he wants them shown.
- Create the private drafts repository (Stage 3 gives him the commands).
