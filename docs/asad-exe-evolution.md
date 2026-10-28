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
| [Build: Asad's seated stretch and look animations](https://github.com/amatterkhan/asad.atterkhan/issues/31) | done, approved (6512a07, 4c5020e) |
| [Build: Thoughts in the room](https://github.com/amatterkhan/asad.atterkhan/issues/24) | done (414f18c) |
| [Build: lab coat outfit art](https://github.com/amatterkhan/asad.atterkhan/issues/26) | done, approved (2b2a013) |
| [Build: Steins Gate lab coat override](https://github.com/amatterkhan/asad.atterkhan/issues/27) | done |
| [Build: night-room share image and metadata](https://github.com/amatterkhan/asad.atterkhan/issues/28) | done |
| [Build: Asad stands up and walks to the window](https://github.com/amatterkhan/asad.atterkhan/issues/32) | done (df13d8a, 929671c); added 28 Oct at the owner's request |
| [Integration, verification and release PR](https://github.com/amatterkhan/asad.atterkhan/issues/29) | checklist run; release PR opened, not merged |

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

### Seated stretch and look: 28 Oct 2026, 4c5020e

| Check | Result |
| --- | --- |
| Pipeline check | the re-implemented scale and registration reproduces the shipped `asad-typing` frame 0 silhouette 100% (colours visually identical) |
| Existing sheets after `export_ase.sh` and `outfits.py` | byte-identical (sprites and every outfit's existing states) |
| Outfit check (all four outfits, both new states, every frame) | no changed pixel outside the hoodie regions; the only skin-coloured changes are drawstrings and five dark-red sleeve rim pixels; face and hair untouched |
| `make check` | pass, 43 vitest tests (new: `nextPause` frequencies, stretch spacing, more glances with Storm by the window) |
| `npx playwright test` | 78 passed, 2 skipped |
| Visual check in the built room (night and day, desktop and phone) | both poses fit; the stretch's fists reach the bubble's area, so Thoughts wait while he stretches |

### Lab coat and Steins Gate override: 28 Oct 2026

| Check | Result |
| --- | --- |
| Coat art (2b2a013) | owner approved; face check: no skin pixel outside the hoodie changes; the coat changes less frame to frame than the hoodie it replaces |
| `make check` | pass, 44 vitest tests (new: the room can show `labcoat` sheets for all six states, but `isOutfit`, `resolveOutfit` and the export refuse it) |
| `npx playwright test` | 78 passed, 2 skipped. The meter test now checks the coat is on in Steins Gate with the sprite still animating, nothing written to storage, and his own outfit back in Normal |
| Visual check (production build, desktop and phone) | the coat appears with the Steins Gate note |

### Share image and metadata: 28 Oct 2026

| Check | Result |
| --- | --- |
| `make check` | pass, 45 vitest tests (new: the image URL carries its content hash; og:url comes from the canonical or the page's path; no og:url on 404) |
| `npx playwright test` | 78 passed, 2 skipped |
| Static HTML (`/`, `/about`, `/lab`, a Lab article; curl against the production build) | titles `Asad.exe — Asad Atterkhan` / `<Page> · Asad.exe`, description = motto (Lab keeps its own), `og:site_name` Asad.exe, `og:type` website, `og:url`, absolute HTTPS `og:image?v=<hash>`, alt text, `twitter:card` summary_large_image with matching image |
| `/opengraph-image.png` | 200, image/png, 1200×630, RGB with no alpha (`sips hasAlpha: no`), about 56 KB |
| In-app previews (WhatsApp, Discord, LinkedIn, X, iMessage, Slack) | **not possible before deploy** (preview builds use the production URL and block the preview bots; decided in #21). After deploy: run the Facebook Sharing Debugger and LinkedIn Post Inspector on https://asad.atterkhan.com, then paste the link into each app |

### Walk to the window: 28 Oct 2026, 929671c

| Check | Result |
| --- | --- |
| Existing sheets after `export_ase.sh` and `outfits.py` | unchanged (no existing sprite or outfit PNG modified) |
| Face check | goatee only: a moustache PixelLab drew on the left-facing walk was painted out on all 8 frames; the stand-up keeps his typing face |
| Outfits (`art/previews/outfits.png`) | all four recolour the hoodie on every new frame; hair, jeans and the laptop on the rug untouched |
| `make check` | pass, 46 vitest tests (new: the walk only after `WALK_GAP_MS`, then about 1 pause in 8; never when the room passes no time, which is how Reduce Motion keeps him seated) |
| `npx playwright test` (new tests) | on a fake clock with the walk forced: he stands up at 150-200 s, the laptop appears on the rug, he walks left, stands at the window's middle, walks back, sits down (the sheet plays in reverse), the laptop goes, typing resumes; with Reduce Motion nothing happens in 220 s |
| Visual check (production build, desktop and phone, Normal and Steins Gate) | walks to the window and back; lab coat on every standing pose in Steins Gate |

### Owner feedback on the walk: 28 Oct 2026, 1a2e8e6

The owner saw no walk on their iPhone (Reduce Motion is on there, and the walk skipped it, against the room's standing exemption), found the laptop set-down off and a moustache on some frames, and asked for a double tap that makes him follow the cursor.

| Check | Result |
| --- | --- |
| Art (5f61d57) | new stand-up take (laptop lifted off his lap and set flat on the floor); moustache refilled on every frame of both walks; new `asad-stand` (breathing by hand); walks, window, every outfit and the lab coat redone; seated sheets unchanged. PixelLab about 47 cents more |
| `make check` | pass, 46 vitest tests (walk odds now one break in five after the gap) |
| `npx playwright test` | **86 passed, 2 skipped**. Walk tests: the outing (now also under Reduce Motion); one press does nothing; two presses get him up, he walks after the pointer, stands, and 8 s after it rests he walks back and sits |
| Visual check (production build, desktop and phone) | set-down, following, standing by the desk |

### Page-wide glitch: 28 Oct 2026

The owner asked for the shift's glitch to hit the whole page. `html[data-glitch]` is set for the glitch phase only; the header, sections and footer slip and skew, text splits orange/cyan. Movement only (no area flash, no saturated red), so it stays within [Accessibility limits for the meter's glitch and notifications](https://github.com/amatterkhan/asad.atterkhan/issues/19).

| Check | Result |
| --- | --- |
| `make check` | pass, 46 vitest tests |
| `npx playwright test` | **90 passed, 2 skipped**. New: the page's content animates during the glitch, the attribute is gone at idle, and it never appears with Reduce Motion |
| Visual check (production build, desktop and phone) | headings and paragraphs jolt and split mid-shift, then settle |

### Scrambled words and steadier walking outfits: 28 Oct 2026

- The glitch now also rearranges the words on screen (`lib/scramble.ts`): each word's letters shuffle, then settle back over 0.8 s. Unit tests: letters only trade within a word, the exact text returns, islands/code/screen-reader/off-screen text are untouched. Browser test: the hero scrambles and returns; never under Reduce Motion.
- The owner found the outfit glitchy while walking: drawstrings were detected on some frames only and the lamp's warm dots moved frame to frame. Standing frames now detect both steadily; the lab coat no longer speckles. Seated sheets unchanged.
- `make check` pass (49 vitest tests); `npx playwright test` **90 passed, 2 skipped**.

### Release checklist (brief, Part 13): 28 Oct 2026, 929671c

Run on the production build (`npm run build`, served by `npm run preview`) with system Chrome.

| Check | Result |
| --- | --- |
| `make check`: gofmt, `go vet`, `go test ./...`; `vue-tsc`; vitest | pass; 46 vitest tests |
| `npx playwright test` (desktop and mobile × dark and light) | **86 passed, 2 skipped** (4.1 min) |
| Emulator suite | **not run** (no Java here); CI runs it |
| Identity: motto, four subtitles, titles | pinned by vitest and seen in the build |
| Copy natural, facts accurate | owner-approved copy; Checkout.com role, Storm, contact details unchanged from the records |
| Thoughts: random, no refresh/next control, no immediate repeat, intervals, contexts, hidden tab, reduced motion | browser tests on a fake clock + `pickThought` unit tests; mobile bubble checked in screenshots |
| Admin manages one-liners | component test with a mocked API and Go validation tests; **not checked signed-in** (Google + TOTP is the owner's) |
| Worldlines: default room unchanged | desktop captures match the `baseline/room` set except Storm's frame and the clock digits; on the phone the room sits about 2.5 device px lower (the hero above is taller), so edges resample, and no art changed |
| Live clock, meter switching, Alpha/Beta/Steins Gate, notes, rapid presses, back to Normal, day/night, no leaks | browser tests (meter cycle, presses mid-shift ignored, no layers left in Normal, live clock back) and earlier visual checks |
| Wardrobe: lab coat on in Steins Gate, animating, off on exit, saved outfit untouched | browser test (nothing written to storage) + unit tests; the override is client-only, so an admin outfit change during it is simply the next build's outfit |
| Social preview: real room assets, 1200×630, metadata | see *Share image and metadata*; public loading and in-app previews are post-deploy |
| General: navigation, overflow, a11y (axe), hydration | the layout/axe/hydration test on every page passes in all four projects |
| Dependencies | none added (`package.json`, `package-lock.json`, `go.mod` unchanged against `main`) |
| Production build | pass |

## Known issues

- **Production copy comes from Firestore.** The deploy builds with `CONTENT_SOURCE=firestore`, and the saved `siteSettings/public` overrides the Git defaults field by field. So the new **headline, eyebrow role, lede, body, room hint, closing, Lab, Workbench and About copy** go live only once the same text is saved in `/admin` → Site copy (the owner does this; it triggers a rebuild). The motto, subtitles, titles, footer and 404 text are code and ship with the release. The text to paste is in `site/content/site.json`. Add this to the release PR's deploy steps.
- Standing and walking are at his seated scale, so standing he is about as tall as the chair back (the owner accepted this when bringing the walk into scope).
- The right-facing lab-coat walk has a few dark specks where PixelLab's edit and his frame disagree; visible only up close.
- Storm follows the same pointer, so when Asad follows it too, Storm ends up at his feet, in front of him.
- Sprites play at one frame rate per state (the average), so the holds set in the new Aseprite documents only show in Aseprite, not on the site.
- The Thoughts browser tests step a fake clock through a few simulated minutes of the room, so they are the slowest in the suite (about 2.5 minutes over four workers).
- On phones the new hero (lede plus three paragraphs) pushes the room about two screens down. It's the approved copy; raise it at review if it matters.
- No Java runtime on this machine, so the emulator suite in `docs/development.md` can't run here. CI runs it.
- Only WebKit is installed for Playwright locally. The suite itself uses system Chrome (`channel: "chrome"`).

## Session log

- **28 Oct 2026**: owner feedback on the walk: redid the stand-up, shaved both walks, added the double tap to follow the pointer, and dropped the Reduce Motion exception for the walk (the room ignores Reduce Motion by the owner's choice).

- **28 Oct 2026**: the owner brought standing and walking into scope; built the walk to the window (#32: 63 cents in all: about 7 for the animations, the rest lab-coat edits (one batch ran twice by accident); about $8.61 left). Ran the release checklist and opened the release PR (#29).

- **27 Oct 2026**: cut the branch, recorded the baseline, captured the room baselines, added `GLOSSARY.md` and this file.
- **28 Oct 2026**: lab coat (#26) redrawn with PixelLab *Edit images* after the owner rejected the recolour versions; the Steins Gate override (#27) is done. PixelLab spend so far is about 60 cents. Note: *Transfer outfit* needs a PixelLab Tier 1 plan (this account is on the trial).
- **28 Oct 2026**: built the seated stretch and look (#31). The lab coat (#26) must now cover six states: typing, coffee, idle, happy, stretch, look. PixelLab spend so far: about 3 cents (the balance is about $9.83). The restored generation scripts were not committed (see art/README).
- **27 Oct 2026**: built Thoughts in the room (#24). The bubble follows `asadX` (66 today): if Asad ever moves, set it and the bubble follows. Context `storm` is Storm within 56 room px of Asad's middle.
- **27 Oct 2026**: built Thought content and the admin tab (#23). For #24: `getThoughts()` in `lib/content.server.ts` returns `{ thoughts: {id, text, context}[], featured }` ready for the homepage route to pass to the room; `.thought-preview` in app.css is the admin preview's copy of the bubble look, so share one class once `.asad-thought` exists.
- **27 Oct 2026**: built the worldline engine (#25). For later tickets: `Room.vue` exposes `worldline` (ref) and `shifting` (computed: a shift or its note is on screen). Thoughts must wait on `shifting`, and the coat override hangs off `worldline === "steins-gate"`. A live test found a race (a second press in the same tick slipped past the lock); the first phase now starts synchronously in the click.
- **27 Oct 2026**: built identity and copy (#22). The headline and "Say hello." stay admin-editable copy with new defaults; only the motto and the four subtitles are fixed in code.
