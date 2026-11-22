# Threat model

Last reviewed 22 November 2026 (Stage 5), against the finished rebuild. "Verified" means checked
on that date from the repository, the browser suite or the GitHub API. Rows marked "last verified
10 November" need the live site, public DNS or cloud credentials, which the Stage 5 review could
not reach; the owner re-checks them with the commands in [security.md](security.md). Review this file whenever the architecture changes, and at
least at each 90-day rotation ([maintenance.md](maintenance.md)).

## What we are protecting

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| Owner account | Signs in to `/admin`; can publish anything | Google account + TOTP, Firebase Auth owner UID with the `admin` claim |
| Deploy pipeline | A commit on `main` ships to production | GitHub repository, Actions, Workload Identity (`github-deployer`) |
| Rebuild token (SEC-02) | Today `Contents: write` on this repository; **Actions: write** only once the owner switches to `REBUILD_HOOK=github-workflow`. Readable by the Cloud Run runtime | Secret Manager `asad-api-github-token`, mounted into `asad-api` |
| Content integrity | The site is only worth anything if a reader can trust what it says | Lab entries: Markdown in Git (`site/content/`); everything else: Firestore, with `site/content/` as the fallback; Storage |
| Undisclosed material | A leaked draft breaks a program's rules | The private drafts repository, cloned into the gitignored `site/content/drafts/`. This repository is public |
| Domain and email | Whoever controls DNS controls the site and `contact@` | Registrar, Cloudflare DNS, Zoho Mail |
| Visitors | Must never be served script, trackers or redirects they did not ask for | Their browsers |
| The bill | Cloud Run, Firestore and egress are pay-as-you-go | Google Cloud project `asad-atterkhan` |

## Threats, controls and gaps

| # | Threat | Controls in place | Open gaps |
| --- | --- | --- | --- |
| T1 | Content injection (XSS) through Markdown, metadata or owner-edited URLs | rehype-sanitize drops raw HTML; https-only URL rule in the API and the build; Zod on all content; the content lint refuses off-origin images, script, event handlers and unsafe SVG in entries (verified: a fixture per case); public CSP has no inline script or style and requires Trusted Types (verified on all 22 routes by the browser suite) | `/admin` still allows inline styles and two renderers (TypeScript and Go) remain until the article editor is retired, which waits on the owner's switch to `ARTICLE_SOURCE=git` ([ADR 0005](decisions/0005-lab-source-and-private-drafts.md)) |
| T2 | Supply chain: npm | `npm ci --ignore-scripts`; build jobs hold no cloud credentials; lockfile; grouped Dependabot; `npm audit --omit=dev` in CI and weekly (verified: 0 advisories in shipped packages) | 17 moderate advisories in dev-only tooling under `firebase-tools` (verified); no provenance check |
| T3 | Supply chain: Actions and Go | Actions pinned by SHA; `go.sum`; `govulncheck` on pull requests and weekly | The gitleaks binary pin is updated by hand |
| T4 | Pipeline takeover: a push to `main` or abuse of the deploy environment | Workload Identity bound to the `site-production` environment; deploy branch is `main` only; PR previews use a Hosting-only identity in a job that runs no repository code | **`main` has no ruleset (verified).** No approval gate on `site-production`, by the owner's decision ([ADR 0008](decisions/0008-no-deploy-approval-gate.md)), so the ruleset is the control that matters. `site-export` has no branch rule and the exporter and preview identities do not exist until the setup script is re-run (last verified 10 November). Commands: [security.md](security.md) |
| T5 | Rebuild-token theft from `asad-api` | Token scoped to one repository; lives only in Secret Manager. The API can now use a token with **Actions: write** only (`REBUILD_HOOK=github-workflow`), which cannot push code | Until the owner stores that token and switches the variable, the token has Contents: write, and without the ruleset a stolen one can push to `main` and ship. After the switch, a stolen token can still start, cancel or re-run deploy runs; re-running an old run redeploys an older commit |
| T6 | Owner account takeover | ID-token verification with revocation check, owner UID, `admin` claim, TOTP, 5-minute recent sign-in for publish and delete, a log line per admin request | Identity Platform sign-up setting and log alerts are unverifiable from the repository |
| T7 | API abuse and cost | Two instances at most, eight requests each, scale to zero ([ci-cd.md](ci-cd.md)); the anonymous surface is four routes: `/api/healthz`, `/api/calendar` (computed, no Firestore), `/files/{id}` and `/media/{id}`; admin routes refuse on the feature flag and the bearer's shape before any Firebase call (verified: `abuse_test.go`); body-size limits; 1 GiB/day shared download budget; per-client share; CDN caching of published files | Reviewed in Stage 5. A well-formed but unknown file id costs one Firestore read and is not cached. The per-client share is per instance and trusts the first `X-Forwarded-For` hop, which a caller can forge, so one caller can spend the shared 1 GiB and stop downloads until the next UTC day (an availability cost, bounded in money). The `*.run.app` URL bypasses the CDN but hits the same limits. `_quotas` TTL unverified; budget alerts notify but do not cap |
| T8 | Disclosure leak: a draft, secret or internal hostname committed here | Full-history secret scan on every pull request and weekly (verified: 189 commits, no leaks); drafts live in a separate private repository and never reach `dist/`; CI fails on any tracked entry that is not `published` or `archived` or whose disclosure is unresolved (verified: a fixture per failure) | The gate checks status fields, not prose: an internal hostname typed into a published entry is caught only by the owner's own read |
| T9 | Domain and DNS hijack | DNSSEC is signed and validates (verified by the owner 22 November); HSTS with `includeSubDomains; preload` on the apex and on `asad`, apex submitted for preload 2026-11-22; CAA published (`pki.goog`, `letsencrypt.org`, plus Cloudflare's own); `amatterkhan.com` is email-only with no web records | Preload inclusion pending; any HTTP-only subdomain would now be unreachable; registrar lock and registrar 2FA unverifiable |
| T10 | Email spoofing as `@atterkhan.com` | SPF (`~all`) and DMARC `p=quarantine` on the apex and on `asad.atterkhan.com`; DKIM key published for the apex (last verified 10 November) | DKIM for mail sent as `@asad.atterkhan.com` not found under the usual selectors |
| T11 | Spam | Mailto only: there is no form and no server surface | None |
| T12 | Privacy: the shift calendar shows when the owner is at work | Unlisted, `noindex`, disallowed in robots | Public to anyone with the URL. Owner-accepted |
| T13 | Clickjacking, mixed content, cross-origin leaks | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, COOP `same-origin`, CORP `same-origin` (share images excepted), `upgrade-insecure-requests`, a deny-all Permissions-Policy | No CSP reporting endpoint, on purpose: it would be one more service to watch |

## One owner, no second reviewer

Asad is the only developer, maintainer and admin. That changes what the controls are for.

| # | Threat | Control, and what it is really for |
| --- | --- | --- |
| S1 | Lockout: one Google account, one TOTP device, one GitHub account, one registrar login | [recovery.md](recovery.md). Stops: losing the site because a phone was lost |
| S2 | Owner mistake: nobody reviews a push, a publish or a settings change | Required status checks on `main`, no force-push, no deletion. Stops: my own mistakes reaching production with a red check. There is no pause before a deploy ([ADR 0008](decisions/0008-no-deploy-approval-gate.md)) |
| S3 | A stolen token or session acting as the owner | The ruleset plus an Actions-only rebuild token: a stolen token can start a rebuild of `main` but cannot change what is on it. It does **not** stop a full GitHub account takeover |
| S4 | Neglect: rotations, advisories, broken links, expiring tokens | Grouped Dependabot, the weekly `site-watch` workflow, dated reminders in [maintenance.md](maintenance.md) |
| S5 | Admin surface only the owner can defend | Retire the article editor, the preview endpoint and the Go Markdown renderer after the switch to `ARTICLE_SOURCE=git` ([ADR 0005](decisions/0005-lab-source-and-private-drafts.md)); the only admin addition since Stage 0 is the profile-handle fields, https-only |

None of these is a second pair of eyes. "Require N approving reviews" is deliberately not used: with
one account it either blocks the owner or gets bypassed ([ADR 0002](decisions/0002-solo-owner-controls.md)).

## Out of scope

Compromise of Google, GitHub, Cloudflare or the registrar themselves; physical access to the
owner's devices; denial of service large enough to need a paid WAF.
