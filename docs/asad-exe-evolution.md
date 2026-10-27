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
| [Build: refreshed identity and copy](https://github.com/amatterkhan/asad.atterkhan/issues/22) | not started |
| [Build: Thought content and admin Thoughts tab](https://github.com/amatterkhan/asad.atterkhan/issues/23) | not started |
| [Build: worldline engine and divergence meter](https://github.com/amatterkhan/asad.atterkhan/issues/25) | not started |
| [Build: Asad's seated stretch and look animations](https://github.com/amatterkhan/asad.atterkhan/issues/31) | not started |
| [Build: Thoughts in the room](https://github.com/amatterkhan/asad.atterkhan/issues/24) | blocked by #23, #25 |
| [Build: lab coat outfit art](https://github.com/amatterkhan/asad.atterkhan/issues/26) | blocked by #31 |
| [Build: Steins Gate lab coat override](https://github.com/amatterkhan/asad.atterkhan/issues/27) | blocked by #25, #26 |
| [Build: night-room share image and metadata](https://github.com/amatterkhan/asad.atterkhan/issues/28) | blocked by #22, #25 |
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

## Known issues

- No Java runtime on this machine, so the emulator suite in `docs/development.md` can't run here. CI runs it.
- Only WebKit is installed for Playwright locally. The suite itself uses system Chrome (`channel: "chrome"`).

## Session log

- **27 Oct 2026**: cut the branch, recorded the baseline, captured the room baselines, added `GLOSSARY.md` and this file.
