## Agent skills

### Issue tracker

Issues live in GitHub Issues for `amatterkhan/asad.atterkhan` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md`; ADRs live in `docs/decisions/`. See `docs/agents/domain.md`.

## Owner's rules

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
4. The hero says "I'm a security engineer" by the owner's choice ([ADR 0004](docs/decisions/0004-hero-wording.md)).
   Everywhere else the job title is "Security Operations Analyst".
5. Never push, deploy, merge to main, or change cloud, GitHub or DNS settings without asking. Give
   the owner exact commands instead. Dated owner-only actions are in [docs/security.md](docs/security.md).
6. No secrets in the repository. It is public; treat every commit as published.

### Standing constraints

- **The owner writes the content.** You build the place it goes. Sample content in mockups, tests
  and the component page is labelled as placeholder. Never invent credentials, handles, numbers or
  dates.
- **Fixed identity:** the pixel room, Worldlines, Thoughts, Storm, the motto, the page subtitles,
  serif display headings, the mint accent, the night and day palettes. Mono type (Departure Mono)
  appears in chrome only: navigation, filters, metadata, the command palette.
- **Low maintenance wins.** Every new tool, service or recurring task gets a one-line
  justification of its ongoing cost in the pull request, or it does not go in
  ([ADR 0002](docs/decisions/0002-solo-owner-controls.md)). Automate what one person would forget.
- **The admin surface shrinks, never grows** unless the owner asks. Every admin feature is attack
  surface only he defends.
- **Tests are added, never weakened.** A failing test is fixed at the cause.
- **Evidence for every "done":** the command and its output, plus screenshots at 390px and 1280px
  in dark and light for anything visible. Test motion with Reduce Motion on and off; the owner's
  iPhone has Reduce Motion on.
- **The rebuild token (SEC-02):** the API supports an Actions-only token
  (`REBUILD_HOOK=github-workflow`); until the owner has switched to it, remind him at the end of
  each piece of work ([docs/security.md](docs/security.md#rebuild-token-sec-02)).
- **Docs stay short and current.** A big decision gets an ADR in `docs/decisions/` (next number
  is 0009). Domain terms go in the root `GLOSSARY.md`.

### Working on this repository

- Branch from an up-to-date `main`. Before asking to open a pull request, these pass locally:
  `make check`, `cd site && npm run build && npm run budget`, `cd site && npm run test:e2e`
  (four Playwright projects: desktop and mobile, dark and light).
- **Merging deploys.** `site-deploy.yml` runs on every push to `main` and `site-production` has no
  approval gate ([ADR 0008](docs/decisions/0008-no-deploy-approval-gate.md)), so a merge is live
  within minutes. Say so each time you ask about merging.
- Owner-only actions and their commands are in [docs/security.md](docs/security.md#owner-actions).

### Traps already hit once

- CI's Linux fallback serif is shorter than macOS Iowan Old Style, so one-line serif links
  measure 36px there and 44px or more locally. Give text links a stretched hit area (the `::after`
  list in `touch.css`) instead of relying on line height.
- Public pages allow no inline style (strict CSP, Trusted Types). The build moves inline styles to
  `data-s` rules and fails on any that remain. Put styles in a part file.
- Intl short month names differ between runtimes ("Sep" and "Sept"); `ledger.ts` spells them out.
- Wait for `main` to reach `opacity: 1` before an axe scan, or the entrance animation produces
  false contrast failures.
- Light theme needs its own contrast check: syntax colours and table headers failed at first.
