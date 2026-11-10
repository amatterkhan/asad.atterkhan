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

Not enforced by a test yet: off-origin images in Markdown (the CSP blocks them; the renderer does
not), the draft gate and the content lint (Stage 3), and the API abuse review (Stage 5).

`/admin` is looser on purpose: it may load `apis.google.com`, call the two Firebase auth hosts,
frame the project's `firebaseapp.com` handler, open the sign-in popup (COOP
`same-origin-allow-popups`) and use inline styles for the editor preview
([ADR 0003](decisions/0003-strict-style-csp-and-no-mermaid.md)).

## Owner actions

Only the owner can change these. Status as of 10 November 2026, read from the GitHub API and
public DNS. "Unverifiable" means it cannot be read without cloud credentials. The commands below
were written against the API documentation and have **not been run**: read each before running it.

| Item | Status | Stops |
| --- | --- | --- |
| Ruleset on `main` | **Not done** | My own mistakes; a stolen rebuild token pushing straight to `main` |
| Approval gate on `site-production` | **Not done** (no reviewer, admins can bypass) | A stolen token or workflow trigger shipping to production |
| Setup script re-run (exporter and preview identities, `site-export` limited to `main`) | **Not done** (`EXPORT_SERVICE_ACCOUNT`, `PREVIEW_SERVICE_ACCOUNT` unset; `site-export` has no branch rule) | The export running with deploy rights; unreviewed branches using the export identity |
| Rebuild token scope (SEC-02) | **Open, deferred by the owner** | See below |
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

```bash
gh api -X PUT repos/amatterkhan/asad.atterkhan/environments/site-production --input - <<JSON
{
  "can_admins_bypass": false,
  "prevent_self_review": false,
  "reviewers": [ { "type": "User", "id": $(gh api user --jq .id) } ],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
JSON
gh api repos/amatterkhan/asad.atterkhan/environments/site-production/deployment-branch-policies --jq '.branch_policies[].name'
```

The second command must still print `main`. From then on every deploy, including a content
rebuild, waits for **Review deployments → Approve** on the run page (GitHub emails you).

### 3. Re-run the setup script

It changes IAM, so read it first. It is safe to re-run ([ci-cd.md](ci-cd.md)).

```bash
PROJECT_ID=asad-atterkhan REPO=amatterkhan/asad.atterkhan .github/scripts/setup-firebase-deploy.sh
gh variable list | grep -E 'EXPORT_SERVICE_ACCOUNT|PREVIEW_SERVICE_ACCOUNT'
gh api repos/amatterkhan/asad.atterkhan/environments/site-export/deployment-branch-policies --jq '.branch_policies[].name'
```

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

- **CAA** (Cloudflare DNS → add records on `atterkhan.com`). Both certificates in use today are
  issued by Google Trust Services. Firebase Hosting can also use Let's Encrypt, so allow both:
  `0 issue "pki.goog"` and `0 issue "letsencrypt.org"`. A wrong CAA record blocks renewals, so
  check a week later that `echo | openssl s_client -connect asad.atterkhan.com:443 2>/dev/null | openssl x509 -noout -enddate`
  still moves forward. Verify with `dig +short CAA atterkhan.com`.
- **HSTS preload** needs the apex to send
  `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (Cloudflare → SSL/TLS →
  Edge Certificates → HSTS) and **every** subdomain of `atterkhan.com` to serve HTTPS. Only then
  submit at hstspreload.org. It is hard to undo; skip it if any subdomain is not yours to guarantee.
- **DKIM**: in Zoho Mail admin, confirm DKIM is enabled for `asad.atterkhan.com` and note the
  selector; `dig +short TXT <selector>._domainkey.asad.atterkhan.com` must return a key.
- **DMARC**: once the reports show only your own mail, move both records from `p=quarantine` to
  `p=reject`, and SPF from `~all` to `-all`.
- **Registrar**: turn on the transfer lock and two-factor sign-in, and record where the recovery
  codes are in [recovery.md](recovery.md).

## Rebuild token (SEC-02, not changed in code)

The API wakes the deploy workflow with a GitHub `repository_dispatch`, which needs a token with
`Contents: write`. Anyone who steals that token from the Cloud Run environment can push commits to the
repository, and a commit on `main` deploys. The code is deliberately unchanged: swapping the mechanism
breaks content rebuilds until the new token is in place. To reduce the blast radius:

1. Create a fine-grained token (or a GitHub App) for this repository only, with **Actions: write** and
   nothing else (no Contents), and a 90-day expiry.
2. Change the API to call `POST /repos/{repo}/actions/workflows/site-deploy.yml/dispatches` with
   `{"ref": "main"}` instead of `repository_dispatch` (`api/internal/server/rebuild.go`), and handle the
   `workflow_dispatch` trigger that `site-deploy.yml` already has (the `changes` job treats it as a full site
   rebuild, with `deploy_api` defaulting to false). Deploy that API change and the new secret together.
3. Store the token as a new version of `asad-api-github-token` in Secret Manager
   (`printf %s "$TOKEN" | gcloud secrets versions add asad-api-github-token --data-file=-`), redeploy the API
   so Cloud Run reads it, publish something to test, then delete the old token on GitHub.
4. Turn on the branch protection and required-reviewer settings above first: with them, even a leaked
   token that can only start the workflow cannot ship new code.
