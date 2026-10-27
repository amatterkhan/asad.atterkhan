# Asad.exe evolution: build progress

Progress log for the `feat/asad-exe-worldlines-and-identity` branch. **Every product and architecture decision lives on the wayfinder map, [Asad.exe: identity, worldlines and the living room](https://github.com/amatterkhan/asad.atterkhan/issues/10). Each decision is in its closed ticket and is linked from the map's "Decisions so far".** This file records only what has been built, what was tested, known issues, and how to resume. It doesn't repeat any decision.

## Resuming a session

1. Read the map (issue #10), then this file.
2. `cd /Volumes/Vault/Workspace/Projects/asad-exe-worldlines`, then `git status`, `git log --oneline origin/main..`.
3. Pick the first open build ticket on the map that isn't blocked and isn't claimed. Claim it: `gh issue edit <n> --add-assignee @me`.
4. Before you stop, update **Progress** and **Session log** below, then commit.

Keep commits small and grouped by logic. Intermediate PRs into this branch are fine. Only the single release PR targets `main` ([Integration, verification and release PR](https://github.com/amatterkhan/asad.atterkhan/issues/29)), and it is never merged automatically.

## Workspace

| What | Where |
| --- | --- |
| Feature branch | `feat/asad-exe-worldlines-and-identity`, cut from `origin/main` at `b850a05` (PR #9 merged) |
| Worktree | `/Volumes/Vault/Workspace/Projects/asad-exe-worldlines` |
| Room baselines (Normal must still match these) | branch [`baseline/room`](https://github.com/amatterkhan/asad.atterkhan/tree/baseline/room): desktop and phone × day and night × lamp on and off, plus `room/capture.mjs` |
| Approved prototypes (reference only, never merged) | branch [`prototype/thought-bubble`](https://github.com/amatterkhan/asad.atterkhan/tree/prototype/thought-bubble): the Thought bubble, the standing-pose mockup |
| Research | branches `research/og-platforms`, `research/meter-a11y` |

## Progress

| Build ticket | State |
| --- | --- |
| [Feature branch, baseline tests and progress doc](https://github.com/amatterkhan/asad.atterkhan/issues/20) | done |
| [Build: refreshed identity and copy](https://github.com/amatterkhan/asad.atterkhan/issues/22) | done (7d66bee, 32ff2a3) |
| [Build: Thought content and admin Thoughts tab](https://github.com/amatterkhan/asad.atterkhan/issues/23) | done (3e02649, fc88a7b) |
| [Build: worldline engine and divergence meter](https://github.com/amatterkhan/asad.atterkhan/issues/25) | done (588852f, c5e4e76) |
| [Build: Asad's seated stretch and look animations](https://github.com/amatterkhan/asad.atterkhan/issues/31) | not started |
| [Build: Thoughts in the room](https://github.com/amatterkhan/asad.atterkhan/issues/24) | done (414f18c) |
| [Build: lab coat outfit art](https://github.com/amatterkhan/asad.atterkhan/issues/26) | blocked by #31 |
| [Build: Steins Gate lab coat override](https://github.com/amatterkhan/asad.atterkhan/issues/27) | blocked by #26 |
| [Build: night-room share image and metadata](https://github.com/amatterkhan/asad.atterkhan/issues/28) | ready |
| [Integration, verification and release PR](https://github.com/amatterkhan/asad.atterkhan/issues/29) | blocked by everything above |

## Test results

### Baseline: 27 Oct 2026, `b850a05`, before any change

| Check | Result |
| --- | --- |
| `make check`: gofmt, `go vet`, `go test ./...` | pass (export, content, markdown and server packages) |
| `make check`: `vue-tsc`, vitest | pass, 17 tests in 3 files |
| `npm run build` (inside the Playwright web server) | pass |
| `npx playwright test` (system Chrome; desktop and mobile × dark and light) | 62 passed, 2 skipped |
| Firestore/Storage emulator suite | **not run**: no Java runtime on this machine |

### Identity and copy: 27 Oct 2026, 32ff2a3

| Check | Result |
| --- | --- |
| `make check` | pass, 18 vitest tests (a new one pins the titles, `og:site_name`, the motto description and the four subtitles) |
| `npx playwright test` | 62 passed, 2 skipped |
| Visual check of the production build (system Chrome, 1280 and 390 wide, dark): Home, About, The Lab, 404, footer | subtitles, eyebrow, hero paragraphs and footer motto render; titles read `Asad.exe — Asad Atterkhan`; no horizontal overflow |

### Worldline engine: 27 Oct 2026, c5e4e76

| Check | Result |
| --- | --- |
| `make check` | pass, 28 vitest tests (new: worldline cycle, shift timeline incl. reduced motion, divergence tube layout) |
| `npx playwright test` | 70 passed, 2 skipped. New: the meter cycles all four worldlines by keyboard and click, ignores presses mid-shift, keeps focus, announces once, leaves no layers in Normal, keeps the A/S books; reduced motion goes settle → note → idle with no flicker or glitch and shows the Steins Gate note. Axe passes on `/` with the new button |
| Visual check (system Chrome, production build): night and day, lamp on and off, 1280 and 390 wide | the note sits above the meter on wide rooms and below it on narrow ones, inside the room; Alpha rain shows only through the glass; Beta's flicker only runs with the lamp on |

### Thoughts content and admin: 27 Oct 2026, fc88a7b

| Check | Result |
| --- | --- |
| `go test ./...` | pass. New, no emulator needed: `validateThoughts` accepts the seed, trims, refuses 13 kinds of bad input (unknown keys and fields, bad, duplicate or over-limit ids/text/count, control characters, unknown context, a non-boolean `enabled`, a featured id missing from the list); the embedded seed equals `site/content/thoughts.json` |
| Emulator route test (`TestEmulatorRoutes`: GET seed, bad featured, extra key, save, read back) | **written, not run here** (no Java); CI runs it |
| `make check` | pass, 34 vitest tests. New: `ThoughtsSchema`, `getThoughts` (only enabled lines, a disabled featured line dropped, empty means silence), and the admin tab with a mocked API (lists, adds, switches off, features, previews, removes, saves exactly that; unfeatures a removed line; unique ids that never end in a dash) |
| `npx playwright test` | 70 passed, 2 skipped |
| Admin tab in a real browser | **not checked**: sign-in needs Google and TOTP. Covered by the component test only |

### Thoughts in the room: 27 Oct 2026, 414f18c

| Check | Result |
| --- | --- |
| `make check` | pass, 40 vitest tests. New: `pickThought` (context gating, featured first only while eligible, no repeat unless alone, silence), `readMs`, `nextWait` |
| `npx playwright test` | 78 passed, 2 skipped (about 3 minutes). New, on a fake clock: the first Thought at 20-43 s, gone after its read time, the next 56-153 s later and a different line, `aria-hidden`, inside the room, no controls; petting Storm hides it; a worldline shift hides it and nothing comes during the shift or its note; a hidden tab gives no Thought for 200 s |
| Visual check (production build): night desktop, day desktop, phone | the bubble is over Asad's head with its tail pointing at him; on the phone it grows left over the wall, clear of the meter |
| Steins Gate lines in a real browser | not shot (one of 14 lines at random); covered by the `pickThought` context tests |

## Known issues

- **Production copy comes from Firestore.** The deploy builds with `CONTENT_SOURCE=firestore`, and the saved `siteSettings/public` overrides the Git defaults field by field. So the new **headline, eyebrow role, lede, body, room hint, closing, Lab, Workbench and About copy** go live only once the same text is saved in `/admin` → Site copy (the owner does this; it triggers a rebuild). The motto, subtitles, titles, footer and 404 text are code and ship with the release. The text to paste is in `site/content/site.json`. Add this to the release PR's deploy steps.
- The Thoughts browser tests step a fake clock through a few simulated minutes of the room, so they are the slowest in the suite (about 2.5 minutes over four workers).
- On phones the new hero (lede plus three paragraphs) pushes the room about two screens down. It's the approved copy; raise it at review if it matters.
- No Java runtime on this machine, so the emulator suite in `docs/development.md` can't run here. CI runs it.
- Only WebKit is installed for Playwright locally. The suite itself uses system Chrome (`channel: "chrome"`).

## Session log

- **27 Oct 2026**: cut the branch, recorded the baseline, captured the room baselines, added `GLOSSARY.md` and this file.
- **27 Oct 2026**: built Thoughts in the room (#24). The bubble follows `asadX` (66 today): if Asad ever moves, set it and the bubble follows. Context `storm` is Storm within 56 room px of Asad's middle.
- **27 Oct 2026**: built Thought content and the admin tab (#23). For #24: `getThoughts()` in `lib/content.server.ts` returns `{ thoughts: {id, text, context}[], featured }` ready for the homepage route to pass to the room; `.thought-preview` in app.css is the admin preview's copy of the bubble look, so share one class once `.asad-thought` exists.
- **27 Oct 2026**: built the worldline engine (#25). For later tickets: `Room.vue` exposes `worldline` (ref) and `shifting` (computed: a shift or its note is on screen). Thoughts must wait on `shifting`, and the coat override hangs off `worldline === "steins-gate"`. A live test found a race (a second press in the same tick slipped past the lock); the first phase now starts synchronously in the click.
- **27 Oct 2026**: built identity and copy (#22). The headline and "Say hello." stay admin-editable copy with new defaults; only the motto and the four subtitles are fixed in code.
