# Implementation verification — updated 26 October 2026

## Motion, focus and Sit artwork — 26 October

Search/text fields now use zero-radius borders with the lavender focus colour applied on the existing border and as a one-pixel inset, without the former offset ring. Lab, Workbench and Achievements were checked in the browser: each reports radius `0px`, outline `none`, lavender border and inset highlight. Global text selection uses lavender on deep navy. Evidence: `motion-focus-checks.json` and `screenshots/motion-lab-focus-desktop.png`.

The site now has two fixed CSS dot/pixel layers that drift using transforms, with small content entrances, menu opening and hover transitions. There is no animation library or canvas loop. The footer motion control was exercised on desktop and mobile: both background layers and both scene sprites report animation `none` when paused and the background restarts when resumed. Hidden-tab pausing and global reduced-motion overrides are implemented. The CI reduced-motion browser regression is authored but has not been run on GitHub; this local review exercised the manual pause control. Without JavaScript the background remains static and content remains visible.

The terminal component and its navigation entry points were removed from the current UI. The source and former CSS are preserved under `design-archive/footer-terminal/`. Footer links remain ordinary navigation. Home now loads the separately extracted `storm-sit` asset from the approved board’s Sit row, not the Idle row. Its static transparent sheet, master, source frames, manifest and workshop preview are included. The displayed 2:1 scale is unchanged; About retains its separate pose.

Type checking, lint, ten unit tests and production build passed. Forty fresh Chrome layout/axe checks on the eight public/reading pages at 320/390/768/801/1100 px found no page overflow and no automated WCAG 2 A/AA or 2.1 AA findings; see `motion-layout-checks.json`. Focus, custom selection styles, active background transforms, pause/resume and the absence of the terminal were inspected in the browser. Screenshots are `screenshots/motion-*.png`. Real iPhone and the full hosted/cross-browser matrix remain outstanding. No backend, cloud or production settings changed.

## Collection refinements — 26 October

Workbench now searches title, description, tags and categories, matching all entered words case-insensitively. Its no-results message and clear action were exercised. Achievements uses a responsive grid, with a primary navigation link, a homepage link and a compact two-credential homepage preview. Home pairs typing Asad with sitting/blinking Storm at the same proportions; Experience now labels its credential section “Certifications.” Source/export/workshop paired assets were updated to match the sitting pose.

Type checking, lint, ten unit tests and production build passed. Forty fresh Chrome viewport/axe checks covered the eight public/reading pages at 320, 390, 768, 801 and 1100 px, including both sides of the expanded navigation breakpoint: no page overflow and no automated WCAG A/AA findings. See `collection-layout-checks.json`. Search by ESP32/robotics returned QROVER, unknown text showed the empty state, and Clear search restored four projects. The CI browser test is authored; it has not been run on GitHub. Updated visual evidence includes `screenshots/achievement-grid-*.png` and `screenshots/collection-home-desktop.png`. Backend/security logic is unchanged from the emulator-tested revision below.

## Browser-feedback revision — 26 October

Implemented the ten browser comments and the original `/calendar`:

- The shared footer prompt is the interactive terminal; the separate homepage terminal disclosure is gone. Help, history, safe route commands, clear and keyboard history remain available on every page.
- RSS navigation/discovery links, page-left ruler and “remotely” were removed. Workbench is canonical at `/workbench`, including details; old Projects URLs redirect permanently.
- The Lab heading now uses Departure Mono consistently. Search is a single aligned terminal-style field with a screen-reader label.
- Experience groups roles under each employer, showing the documented Checkout.com internal move on one timeline. Full responsibilities expand and remain included by the print control.
- `/achievements` searches the full source-controlled verified credential catalogue. It supports certifications, badges and awards without inventing records. The private content desk can select up to six Experience highlights; validated IDs are saved in Firestore after activation.
- Home uses the extracted standing Storm pose. About uses the extracted coffee Asad pose with sitting/blinking Storm. Shared 2:1 sprite display scale and aligned anchors remain intact. The source, export script, manifest and workshop include both new poses.
- `/calendar` ports the original five/two workday and four-week night/day rotation with month navigation, Today, summaries and Mauritius dates. UTC date arithmetic avoids DST-dependent week changes.

Current evidence:

- Type checking, ESLint, 10 unit tests and optimized production build passed.
- Three Firestore/Storage emulator tests passed, including denied direct reads/writes of achievement settings by anonymous and owner browser clients.
- The production-built HTTP integration test passed: owner-only settings access, duplicate/unknown-ID rejection, saved selection reflected on Experience, complete collection retained on Achievements, explicitly empty selection, plus the existing document lifecycle checks. This uses demo emulators and does not claim real cloud/TOTP verification.
- 32 fresh Chrome layout/axe checks passed across Home, Lab, Workbench, Experience, About, Achievements, Calendar and the unpublished reading fixture at 320/390/768/1100 px: no page overflow and no WCAG 2 A/AA or 2.1 AA axe findings. See `feedback-layout-checks.json`.
- Mobile menu-to-Calendar navigation, footer `help` and `achievements` commands, achievement issuer search, and calendar previous/next month controls were exercised in the browser. Both new sprite poses were visually inspected on checkerboard, desktop and mobile.
- 15 production route assertions passed, including Projects redirects, new routes, disabled owner API and private tool denial. Footer removals and sitemap paths were checked. See `feedback-production-checks.json`.
- Updated screenshots are `screenshots/feedback-*.png`. Prior screenshots and reports remain as historical evidence. Real iPhone and a new Safari/Firefox pass for this revision are still outstanding; CI browser tests have been updated but have not run on GitHub.

No new dependencies, cloud provisioning, production deployment, source push or DNS change was needed. Firebase activation remains disabled by default and subject to the existing approval boundary.

## Reference design revision — 26 October

The supplied website board now guides the framed navy shell, compact ASAD.EXE navigation, lavender title accents, cyan notebook ruler, homepage arrow links, two-column notebook footer area, Lab rows and article TOC/code frames. Previous UI sources are preserved under `design-archive/quiet-notebook-v1/` with `.txt` suffixes so archived code is not compiled. The original Vue site is preserved.

Asad/Storm artwork remains the approved extracted artwork. Paired scenes use 256/128 px sprite cells on desktop and 128/64 px on mobile; their ground positions align. The exported paired PNG and sprite workshop follow this same relationship.

The revised version passed type checking, ESLint, six unit tests and an optimized production build. A fresh 24-check Chrome run covered all six public/reading layouts at 320, 390, 768 and 1100 px with no page overflow or WCAG 2 A/AA / 2.1 AA axe findings; evidence is `reference-layout-checks.json`. Mobile menu open/close, Escape, restored focus and Lab navigation were exercised. Desktop terminal links open the homepage terminal. Desktop/mobile sprite widths were measured in the DOM at the intended 2:1 ratio. Screenshots are saved in `screenshots/reference-*.png`.

The CI browser tests have been updated for the revised heading and now include paired-scale and mobile-menu regressions. The hosted CI browser matrix has not been executed. Prior Safari/Firefox checks below precede this visual revision; an actual iPhone check remains outstanding. No cloud or production change was made for this revision.

## Earlier baseline checks

- TypeScript checking and ESLint on the new platform source.
- Optimized Next.js 16.4.3 production build on Node 24. Public content routes are generated; private/operational routes remain server routes.
- `npm audit --audit-level=moderate`: **zero known vulnerabilities**, including development dependencies, after SDK/CLI updates and documented overrides.
- Six Node tests: publication metadata, draft exclusion, unsafe Markdown stripping, readable article elements, document publication policy, strict metadata/confirmation and sprite PNG properties.
- Two Firestore/Storage emulator tests: owner/admin/TOTP claims for private access; anonymous/other-user/owner-without-role or MFA denials; forbidden browser writes/uploads and anonymous published-bucket access.
- One HTTP integration test against a production-built Next server and local Auth/Firestore/Storage emulators: signed-in non-owner rejection, private PNG upload/download, disguised HTML rejection, explicit publication confirmation, public copy, metadata edits, unpublish, recoverable archive and refusal to republish archived data. Auth-emulator mode is restricted to demo projects; it is not a claim that a real TOTP provider was exercised.
- Seventeen production HTTP assertions covering primary routes, a case study, feed/sitemap/search/OG, missing draft routes, private tool/review/dev-audit denial, disabled admin service and private-file denial. See `production-checks.json`.
- **24 Chrome layout/accessibility checks:** Home, Lab, Projects, Experience, About and the reading fixture at 320, 390, 768 and 1100 px browser viewports. No page overflow and zero axe findings for WCAG 2 A/AA and 2.1 AA in those checks. See `layout-checks.json`. These checks cover the public layouts; they do not certify complete accessibility.
- Desktop Safari: homepage and article visually inspected, optional terminal navigation to Lab, copy-code control and article table/TOC rendering checked.
- Desktop Firefox: homepage, project navigation/detail and article visually inspected; copy-code control checked.
- Sprite workshop: actual PNG sheets displayed in browser; transparency view, paused animation state and all-frame-zero static fallback confirmed. Sprites have stable 128px cells, a common 128-color palette and binary alpha. Typing changes 17 pixels; blink changes 154; breathing changes 165. Two exports from editable masters are byte-identical.
- Existing Vue source/deployment and prior studies preserved. The two root source modifications remain the pre-existing local prototype changes. New application work is under `platform/`, with two new workflow files. No commit, push, DNS change or cloud write was performed.

## Performance evidence

The earlier baseline production smoke check measured 17,020 bytes of homepage HTML and a conservative gzip estimate of about 181 KB for all script tags, including legacy/non-module scripts. This is a payload measurement, not hosted latency, a Lighthouse score or field Core Web Vitals. Homepage art loads the two required small sheets, not the 2.2 MB board or room art. The 22 KB font is locally hosted and preloaded. Normal readers do not load Firebase administrative code or the local accessibility probe.

## Remaining gates

1. Approval to create an isolated billing-enabled Firebase staging project, including Identity Platform/TOTP configuration. No Asad project was present in the connected account's read-only project listing; unrelated existing projects were left alone.
2. Real App Hosting adapter/build verification, rules/index deployment, managed identity/IAM, environment values, budget alerts and authenticated owner/TOTP sign-in/enrollment against the chosen cloud project. Local emulator tests are not a substitute for those checks.
3. A hosted staging URL, real iPhone Safari checks and hosted performance/auditing. Desktop browser checks and Chrome mobile widths are not an actual iPhone test.
4. GitHub CI/browser matrix and protected staging workflow execution after source publication is approved. Workflow files are authored but have not been pushed/run on GitHub. The Playwright matrix includes Chromium, Firefox, WebKit and iPhone emulation; do not interpret that configuration as a completed matrix run.
5. Final content review and separate explicit production/DNS approval. The Lab contains no invented published articles. Private drafts stay local/private; the reference reading fixture remains an unpublished development-only page.

## Review links

- Website: http://127.0.0.1:4180/
- Sprite workshop: http://127.0.0.1:4180/sprite-review/index.html
- Reading fixture: http://127.0.0.1:4180/preview/reading-layout
- Local owner tool: http://127.0.0.1:4180/manage

The development server is retained for review. It binds only to loopback. Restart it with `npm run dev` from `platform/` if needed.
