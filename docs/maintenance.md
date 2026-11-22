# Maintenance calendar

Everything recurring, in one place, because there is one person to remember it. Each line says
what it costs you. Update the dates when you do the task.

## Automatic (you act only when an email arrives)

| What | When | You get | Cost to you |
| --- | --- | --- | --- |
| Dependabot (actions, npm, Go, Docker), grouped | Weekly | Pull requests | Merge a handful of grouped PRs a month once checks pass |
| `site-watch` workflow: live headers, robots, `security.txt` expiry, sitemap links, advisories, secret scan | Mondays 05:17 UTC | An email only on failure | None unless it fires |
| CI on every pull request: tests, browser suite, secret scan, `govulncheck`, `npm audit` | Each PR | A red check | None unless it fires |
| Budget alerts ($1/$3/$5) | On spend | An email | None unless it fires. They notify; they do not cap |

GitHub pauses scheduled workflows after 60 days without repository activity. If the Monday run
stops, re-enable it under Actions → Weekly site watch.

## By hand, every 90 days

Next due: **8 February 2027**. Then set the next date here.

- [ ] Rotate the rebuild token (`asad-api-github-token`): steps 1 to 5 in [security.md](security.md#rebuild-token-sec-02). Token expires: _fill in_. 10 minutes.
- [ ] Review service-account roles: re-run `.github/scripts/setup-firebase-deploy.sh` and read its output. 5 minutes.
- [ ] Bump the gitleaks pin in `.github/scripts/secret-scan.sh` (version and SHA-256 together). Dependabot cannot see it. 5 minutes.
- [ ] Check the recovery table in [recovery.md](recovery.md): backup codes still where it says, second factors still work. 10 minutes.
- [ ] Re-read [threat-model.md](threat-model.md) and the owner-action table in [security.md](security.md); update statuses.
- [ ] Run `node site/scripts/check-live.ts` once by hand and read the output.
- [ ] Re-run Lighthouse on Home, `/lab` and one entry, and compare with [performance.md](performance.md). 5 minutes.

## Once

Open owner actions (ruleset, setup script and PR previews, the Actions-only rebuild token,
Google Cloud settings, CAA, HSTS on the apex) are listed with commands in
[security.md](security.md#owner-actions). The deploy approval gate was declined
([ADR 0008](decisions/0008-no-deploy-approval-gate.md)).
