# Threat model

Last reviewed 10 November 2026. "Verified" means checked on that date from the repository, the live
site, public DNS or the GitHub API. Review this file whenever the architecture changes, and at
least at each 90-day rotation ([maintenance.md](maintenance.md)).

## What we are protecting

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| Owner account | Signs in to `/admin`; can publish anything | Google account + TOTP, Firebase Auth owner UID with the `admin` claim |
| Deploy pipeline | A commit on `main` ships to production | GitHub repository, Actions, Workload Identity (`github-deployer`) |
| Rebuild token (SEC-02) | `Contents: write` on this repository, readable by the Cloud Run runtime | Secret Manager `asad-api-github-token`, mounted into `asad-api` |
| Content integrity | The site is only worth anything if a reader can trust what it says | Firestore (production source today), `site/content/` (fallback), Storage |
| Undisclosed material | A leaked draft breaks a program's rules | Wherever drafts live. This repository is public |
| Domain and email | Whoever controls DNS controls the site and `contact@` | Registrar, Cloudflare DNS, Zoho Mail |
| Visitors | Must never be served script, trackers or redirects they did not ask for | Their browsers |
| The bill | Cloud Run, Firestore and egress are pay-as-you-go | Google Cloud project `asad-atterkhan` |

## Threats, controls and gaps

| # | Threat | Controls in place | Open gaps |
| --- | --- | --- | --- |
| T1 | Content injection (XSS) through Markdown, metadata or owner-edited URLs | rehype-sanitize drops raw HTML; https-only URL rule in the API and the build; Zod on all content; public CSP has no inline script or style and requires Trusted Types | `/admin` still allows inline styles (the editor's HTML preview); off-origin images in Markdown are only stopped by the CSP, not by the renderer; two renderers (TypeScript and Go) until the editor is retired |
| T2 | Supply chain: npm | `npm ci --ignore-scripts`; build jobs hold no cloud credentials; lockfile; grouped Dependabot; `npm audit --omit=dev` in CI and weekly | 17 moderate advisories in dev-only tooling under `firebase-tools`; no provenance check |
| T3 | Supply chain: Actions and Go | Actions pinned by SHA; `go.sum`; `govulncheck` on pull requests and weekly | The gitleaks binary pin is updated by hand |
| T4 | Pipeline takeover: a push to `main` or abuse of the deploy environment | Workload Identity bound to the `site-production` environment; deploy branch is `main` only | **`main` has no ruleset and `site-production` has no approval gate (verified).** `site-export` has no branch rule and the exporter and preview identities do not exist. Commands: [security.md](security.md) |
| T5 | Rebuild-token theft from `asad-api` | Token scoped to one repository; lives only in Secret Manager | SEC-02 is open by owner decision. Until T4 is closed, a stolen token reaches production |
| T6 | Owner account takeover | ID-token verification with revocation check, owner UID, `admin` claim, TOTP, 5-minute recent sign-in for publish and delete, a log line per admin request | Identity Platform sign-up setting and log alerts are unverifiable from the repository |
| T7 | API abuse and cost | Two instances at most, scale to zero (per [ci-cd.md](ci-cd.md)); 1 GiB/day shared download budget; per-client share; CDN caching; body-size limits | Per-client limits are per instance and trust the first `X-Forwarded-For` hop; `_quotas` TTL unverified; budget alerts notify but do not cap; the `*.run.app` URL bypasses the CDN. Full audit: Stage 5 |
| T8 | Disclosure leak: a draft, secret or internal hostname committed here | Full-history secret scan on every pull request and weekly | No draft gate or content lint yet (Stage 3). Do not add real Lab content before then |
| T9 | Domain and DNS hijack | DNSSEC is signed and validates (verified); HSTS header with `includeSubDomains; preload` | No CAA records (verified); the apex `atterkhan.com` sends no HSTS, so the domain is not preload-ready; registrar lock and registrar 2FA unverifiable |
| T10 | Email spoofing as `@atterkhan.com` | SPF (`~all`) and DMARC `p=quarantine` on the apex and on `asad.atterkhan.com`; DKIM key published for the apex (verified) | DKIM for mail sent as `@asad.atterkhan.com` not found under the usual selectors |
| T11 | Spam | Mailto only: there is no form and no server surface | None |
| T12 | Privacy: the shift calendar shows when the owner is at work | Unlisted, `noindex`, disallowed in robots | Public to anyone with the URL. Owner-accepted |
| T13 | Clickjacking, mixed content, cross-origin leaks | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, COOP `same-origin`, CORP `same-origin` (share images excepted), `upgrade-insecure-requests`, a deny-all Permissions-Policy | No CSP reporting endpoint, on purpose: it would be one more service to watch |

## One owner, no second reviewer

Asad is the only developer, maintainer and admin. That changes what the controls are for.

| # | Threat | Control, and what it is really for |
| --- | --- | --- |
| S1 | Lockout: one Google account, one TOTP device, one GitHub account, one registrar login | [recovery.md](recovery.md). Stops: losing the site because a phone was lost |
| S2 | Owner mistake: nobody reviews a push, a publish or a settings change | Required status checks on `main`, no force-push, no deletion, and a deploy gate the owner approves. Stops: my own mistakes, and gives a pause in which to notice them |
| S3 | A stolen token or session acting as the owner | The same deploy gate. A stolen rebuild token can push or start a workflow but cannot approve a deployment. It does **not** stop a full GitHub account takeover |
| S4 | Neglect: rotations, advisories, broken links, expiring tokens | Grouped Dependabot, the weekly `site-watch` workflow, dated reminders in [maintenance.md](maintenance.md) |
| S5 | Admin surface only the owner can defend | Retire the article editor, the preview endpoint and the Go Markdown renderer ([ADR 0005](decisions/0005-lab-source-and-private-drafts.md)); add no new admin endpoints |

None of these is a second pair of eyes. "Require N approving reviews" is deliberately not used: with
one account it either blocks the owner or gets bypassed ([ADR 0002](decisions/0002-solo-owner-controls.md)).

## Out of scope

Compromise of Google, GitHub, Cloudflare or the registrar themselves; physical access to the
owner's devices; denial of service large enough to need a paid WAF.
