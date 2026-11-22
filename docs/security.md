# Security: posture, owner actions and the rebuild token

The threats this answers are in [threat-model.md](threat-model.md). Nothing here contains a secret:
keep it that way (the repository is public).

## What is enforced, and by what

Each line is checked by a test or a script, so it fails loudly if it regresses.

| Guarantee | Enforced by |
| --- | --- |
| Public pages allow no inline script or style, no `eval`, and no host but this one | `site/tests/unit/headers.test.ts`; the browser suite fails on any CSP or Trusted Types console message on every route |
| No prerendered page carries a `style` attribute or a `<style>` element | The build fails (`site/scripts/build.ts`); `site/tests/unit/inline-styles.test.ts` |
| Google sign-in hosts are allowed on `/admin` only | `headers.test.ts` |
| COOP, CORP, HSTS, `nosniff`, Permissions-Policy, `upgrade-insecure-requests` are sent | `headers.test.ts`, the browser suite, and `site/scripts/check-live.ts` against production every week |
| `/.well-known/security.txt` exists and has not expired | The browser suite; `check-live.ts` weekly (fails with under 30 days left; any deploy renews it) |
| Production is indexable and `/admin`, `/calendar` are not | `check-live.ts` weekly |
| Every sitemap URL returns 200 | `check-live.ts` weekly |
| No secret in any commit on any branch | gitleaks on every pull request and weekly (`.github/scripts/secret-scan.sh`) |
| No known vulnerability in Go code the API calls, or in npm packages that ship | `govulncheck` and `npm audit --omit=dev` on pull requests and weekly |
| Raw HTML in Markdown is dropped; owner-edited URLs are `https://` only | `site/tests/unit/markdown.test.ts`, `content.test.ts`, the Go tests |
| Firestore and Storage refuse browsers; every admin route needs the owner, the claim and TOTP | The Go emulator tests in CI |
| Anonymous requests are refused before any Firestore read or Auth call (flags off, bad file ids, missing or oversized bearer) | `api/internal/server/abuse_test.go` |
| The rebuild hook sends the right request in both GitHub modes, and nothing without a repository and a token | `api/internal/server/rebuild_test.go` |
| A tracked Lab entry is `published` or `archived` and has its disclosure decided | `site/tests/unit/entries.test.ts` (a fixture per failure); `npm run content:check` in CI and in `npm run build` |
| No Markdown image from another origin, no script or event handler in an entry, no SVG with script or external references | The same lint, `site/src/lib/entries.ts` |
| Private drafts never reach `dist/` | `site/tests/unit/lab-publish.test.ts` |
| Every prerendered route passes axe (WCAG 2 A and AA) in both themes, skips no heading level, works keyboard-only with a visible focus ring, and is still under Reduce Motion apart from the pixel art | The browser suite; it fails when a sitemap URL is missing from its route list |

The Stage 5 API abuse review is in [threat-model.md](threat-model.md), T7.

`/admin` is looser on purpose: it may load `apis.google.com`, call the two Firebase auth hosts,
frame the project's `firebaseapp.com` handler, open the sign-in popup (COOP
`same-origin-allow-popups`) and use inline styles for the editor preview
([ADR 0003](decisions/0003-strict-style-csp-and-no-mermaid.md)).

## Owner actions

Only the owner can change these. Status as of 22 November 2026: the ruleset row was read from the
GitHub API that day; the rest is as of 10 November, read from the GitHub API and public DNS (the
Stage 5 review could not reach DNS, the live site or the repository's settings). "Unverifiable" means it cannot be read without cloud credentials. The commands below
were written against the API documentation and have **not been run**: read each before running it.

| Item | Status | Stops |
| --- | --- | --- |
| Ruleset on `main` | **Not done** (verified 22 November: no rulesets) | My own mistakes; a stolen rebuild token pushing straight to `main` |
| Approval gate on `site-production` | **Declined** by the owner ([ADR 0008](decisions/0008-no-deploy-approval-gate.md)) | Merging is deploying; the ruleset and the Actions-only token stand in for it |
| Setup script re-run (exporter and preview identities, `site-export` limited to `main`); this also turns on automatic PR previews | **Not done** (`EXPORT_SERVICE_ACCOUNT`, `PREVIEW_SERVICE_ACCOUNT` unset; `site-export` has no branch rule) | The export running with deploy rights; unreviewed branches using the export identity. Until then `site-preview.yml` skips every pull request |
| Rebuild token scope (SEC-02) | **Code ready** (`REBUILD_HOOK=github-workflow`); new token and variable switch not done | A stolen token pushing code. Steps below |
| Google sign-in on production `/admin` under the Stage 1 COOP and CSP headers | Not checked since Stage 1 | A broken admin noticed only when you need it |
| Private drafts repository | Not created ([authoring.md](authoring.md)) | Drafts kept somewhere less safe |
| Switch Lab articles to Git (`ARTICLE_SOURCE=git`), then retire the article editor | Not done ([deployment.md](deployment.md#switching-lab-articles-to-git-and-rolling-back)) | Keeps `/admin`'s inline-style CSP and the Go renderer alive (T1, S5) |
| Firestore TTL on `_quotas` | Unverifiable | Unbounded growth of quota counters |
| Identity Platform sign-up disabled | Unverifiable | Strangers creating accounts in the project |
| Log alerts | Unverifiable | An attack or a failed rebuild going unnoticed |
| CAA records | **Not done** (none published) | Another certificate authority issuing for the domain |
| HSTS preload | **Not ready** (the apex `atterkhan.com` sends no HSTS) | First-visit downgrade |
| DNSSEC | Done | DNS spoofing |
| SPF and DMARC | Done (`~all`, `p=quarantine`) | Mail spoofing |
| DKIM for `@asad.atterkhan.com` | Unverifiable (selector unknown) | Mail spoofing |
| Registrar lock and registrar 2FA | Unverifiable | Domain theft |

### 1. Ruleset on `main` (no review count; the checks are the gate)

Run this after the Stage 1 pull request's checks have reported once, so the check names exist.

```bash
gh api -X POST repos/amatterkhan/asad.atterkhan/rulesets --input - <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false, "require_last_push_approval": false,
        "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [ { "context": "api" }, { "context": "site" }, { "context": "secrets" } ] } }
  ]
}
JSON
```

There is no bypass list, so it applies to the owner too. To undo it:
`gh api repos/amatterkhan/asad.atterkhan/rulesets --jq '.[].id'`, then
`gh api -X DELETE repos/amatterkhan/asad.atterkhan/rulesets/<id>`.

### 2. Approval gate on `site-production`

Declined ([ADR 0008](decisions/0008-no-deploy-approval-gate.md)). If you change your mind, the
command is in this file's history: `git log -p -S site-production docs/security.md`.

### 3. Re-run the setup script (also turns on automatic PR previews)

It changes IAM, so read it first. It is safe to re-run ([ci-cd.md](ci-cd.md)). Run it from your
Mac, signed in to `gcloud` and `gh` as yourself. It creates `github-preview` (Firebase Hosting
only, usable only from this repository) and sets `PREVIEW_SERVICE_ACCOUNT`; from the next pull
request on, `site-preview.yml` deploys a `pr-<number>` channel, comments its URL on the pull
request and deletes the channel when the pull request closes. The one-off previews you deployed by
hand are no longer needed.

```bash
PROJECT_ID=asad-atterkhan REPO=amatterkhan/asad.atterkhan .github/scripts/setup-firebase-deploy.sh
gh variable list | grep -E 'EXPORT_SERVICE_ACCOUNT|PREVIEW_SERVICE_ACCOUNT'
gh api repos/amatterkhan/asad.atterkhan/environments/site-export/deployment-branch-policies --jq '.branch_policies[].name'
```

The second command must list both variables; the third must print `main`. Then push any change
under `site/` on a branch and open a pull request: a "Preview:" comment appears within a few
minutes.

### 4. Google Cloud settings

```bash
# _quotas TTL: check, then enable if the state is not ACTIVE
gcloud firestore fields ttls list --collection-group=_quotas --project=asad-atterkhan
gcloud firestore fields ttls update expireAt --collection-group=_quotas --enable-ttl --project=asad-atterkhan

# Identity Platform: "disabledUserSignup" must be true
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "x-goog-user-project: asad-atterkhan" \
  https://identitytoolkit.googleapis.com/admin/v2/projects/asad-atterkhan/config | jq '.client.permissions'
```

Log alerts are easiest in the console: **Logging → Logs Explorer**, run the query, **Create alert**,
notify your email.

| Alert | Query | Condition |
| --- | --- | --- |
| Rebuild failed | `resource.type="cloud_run_revision" AND resource.labels.service_name="asad-api" AND "rebuild_hook_failed"` | Any match |
| Admin refusals | `resource.type="cloud_run_revision" AND resource.labels.service_name="asad-api" AND "admin_request" AND ("status=401" OR "status=403")` | Any match, at most one notification per hour |

Check the second query against a real refused request first: the exact field format depends on how
Cloud Run parses the log line.

### 5. Domain and email

- **CAA.** Both certificates in use when last checked were issued by Google Trust Services, and
  Firebase Hosting can also use Let's Encrypt, so allow both. Check first:
  `echo | openssl s_client -connect asad.atterkhan.com:443 -servername asad.atterkhan.com 2>/dev/null | openssl x509 -noout -issuer -enddate`.
  If the issuer is neither Google Trust Services nor Let's Encrypt, stop and add that CA too.
  Then Cloudflare → `atterkhan.com` → DNS → Records → **Add record**, twice: Type `CAA`, Name `@`,
  Flags `0`, Tag **Only allow specific hostnames**, CA domain `pki.goog`; then the same with
  `letsencrypt.org`. Records on the apex cover every subdomain. If any hostname is proxied
  (orange cloud), Cloudflare adds its own CAs' records automatically; leave them. Verify with
  `dig +short CAA atterkhan.com`. A wrong record blocks renewals, so after the `-enddate` above has
  passed its renewal point (Firebase renews about 30 days before expiry), run the same command
  and check the date moved forward, or check Firebase console → Hosting → the domain shows no
  certificate error.
- **HSTS on the apex, then preload.** `asad.atterkhan.com` already sends
  `max-age=63072000; includeSubDomains; preload`. Preload needs the apex to send it too, and
  **every** subdomain of `atterkhan.com` to serve HTTPS. List them first (Cloudflare → DNS →
  Records) and confirm each answers on `https://`. Then Cloudflare → `atterkhan.com` → SSL/TLS →
  Edge Certificates → **HTTP Strict Transport Security (HSTS)** → Enable: Max Age
  **12 months** or more (preload needs at least a year), Include subdomains **on**, Preload
  **on**, No-Sniff on. This only works for hostnames Cloudflare proxies (orange cloud), so the apex must be proxied or redirect through a
  proxied rule. Check: `curl -sI https://atterkhan.com | grep -i strict`. Only then submit
  `atterkhan.com` at hstspreload.org. Preload is hard to undo (months); skip it if any subdomain
  is not yours to keep on HTTPS. Even without submitting, the header with Include subdomains forces
  HTTPS on every subdomain for anyone who has visited the apex, so do the subdomain check first.
- **DKIM**: in Zoho Mail admin, confirm DKIM is enabled for `asad.atterkhan.com` and note the
  selector; `dig +short TXT <selector>._domainkey.asad.atterkhan.com` must return a key.
- **DMARC**: once the reports show only your own mail, move both records from `p=quarantine` to
  `p=reject`, and SPF from `~all` to `-all`.
- **Registrar**: turn on the transfer lock and two-factor sign-in, and record where the recovery
  codes are in [recovery.md](recovery.md).

## Rebuild token (SEC-02)

The API wakes the deploy workflow after a content save. With `REBUILD_HOOK=github` it sends a
`repository_dispatch`, which needs a token with **Contents: write**: anyone who steals that token
from the Cloud Run environment can push commits, and a commit on `main` deploys. With
`REBUILD_HOOK=github-workflow` (added in Stage 5) it starts `site-deploy.yml` on `main` with a
`workflow_dispatch`, which needs only **Actions: write**: a stolen token can start a rebuild of
`main` as it is, but cannot push code. Both modes read the same secret, so the switch is a new
token plus one variable, and content rebuilds keep working at every step.

Do these in order, after the Stage 5 pull request has merged and deployed the API:

1. Create the token: github.com → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → **Generate new token**. Resource owner `amatterkhan`; Repository access
   **Only select repositories** → `asad.atterkhan`; Repository permissions **Actions: Read and
   write** and nothing else (Metadata: read is added automatically); expiry 90 days.
2. Store it as a new version of the secret, from your Mac:
   ```bash
   read -rs TOKEN   # paste the token, then Enter
   printf %s "$TOKEN" | gcloud secrets versions add asad-api-github-token --project asad-atterkhan --data-file=-
   unset TOKEN
   ```
3. Switch the mode and redeploy the API so Cloud Run reads the new version:
   ```bash
   gh variable set REBUILD_HOOK --repo amatterkhan/asad.atterkhan --body github-workflow
   gh workflow run site-deploy.yml --repo amatterkhan/asad.atterkhan -f deploy_api=true
   ```
4. Test it: publish a small change in `/admin` (a Thought, say). A "Deploy site and API" run with
   the event `workflow_dispatch` must start within a minute
   (`gh run list --repo amatterkhan/asad.atterkhan --workflow site-deploy.yml --limit 3`). If it
   does not, read the `rebuild_hook_failed` log line, and roll back with
   `gh variable set REBUILD_HOOK --body github` plus the same API redeploy (the old token is still a
   valid secret version until you delete it).
5. Delete the old Contents-write token on GitHub, and disable the old secret version:
   `gcloud secrets versions list asad-api-github-token --project asad-atterkhan`, then
   `gcloud secrets versions disable <old-version> --secret asad-api-github-token --project asad-atterkhan`.
6. Put the token's expiry date in [maintenance.md](maintenance.md).

What remains: an Actions-write token can also cancel runs and re-run an older deploy run, which
redeploys that older commit. Revoke it on any sign of that ([recovery.md](recovery.md)).
