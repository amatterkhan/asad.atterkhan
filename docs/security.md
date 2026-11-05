# Security checklist and owner actions

The code and workflow hardening from the security review lives in the repository. The items below change
settings in Google Cloud, Firebase or GitHub, so only the owner can do them. None of them is done by a
merge. Nothing here contains a secret: keep it that way (the repository is public).

## Do these before merging the workflow changes

1. **Run the setup script** (`.github/scripts/setup-firebase-deploy.sh`, see [ci-cd.md](ci-cd.md)). It is safe to
   re-run. It creates the read-only exporter and Hosting-only preview identities, binds the deployer to the
   `site-production` environment only, replaces `roles/run.admin` with `roles/run.developer`, adds the
   one-time public `run.invoker` binding, and limits the deploy environments to `main`. Without it the
   Firestore export cannot authenticate and previews are skipped.
2. Check the new repository variables exist: `EXPORT_SERVICE_ACCOUNT`, `PREVIEW_SERVICE_ACCOUNT`
   (`gh variable list`). Leave `SITE_DEPLOY_BRANCH` unset or set it to `main`.
3. **Manual sign-in check after deploying `site/firebase.json`**: open `/admin`, use Google sign-in (popup)
   and the TOTP step, and watch the browser console for CSP violations. The admin page is the only page
   that may load `apis.google.com`, call `identitytoolkit.googleapis.com` / `securetoken.googleapis.com`
   and frame the project's `firebaseapp.com` auth handler.

## Settings that live outside the repository

| Item | Where | What to do |
| --- | --- | --- |
| Dispatch token scope (SEC-02) | GitHub + Secret Manager | See "Rebuild token" below |
| Branch protection / ruleset on `main` | GitHub → Settings → Rules | Require a pull request, require the `Site and API checks` status, block force pushes and deletion, include administrators |
| Required reviewers on `site-production` | GitHub → Settings → Environments | Add yourself as a required reviewer and untick "Allow administrators to bypass". Content rebuilds then wait for one approval at the deploy job |
| Old `frontend-redesign` branch | GitHub | Leave it (it must not be removed), but it can no longer deploy. Optionally protect it with a ruleset that blocks pushes |
| Firestore TTL for `_quotas` (SEC-12) | Google Cloud | `gcloud firestore fields ttls update expireAt --collection-group=_quotas --enable-ttl --project=<project-id>`. Counters written from now on carry `expireAt`; older ones can be deleted by hand once |
| Identity Platform sign-up disabled (SEC-12) | Google Cloud console → Identity Platform → Settings → User actions | Confirm "Enable create (sign-up)" is **off**. Any Google account can reach the sign-in popup, so this setting, plus the owner-UID and TOTP checks in the API, is what keeps others out. Re-check after any change to Identity Platform |
| Log-based alerts (SEC-09) | Google Cloud → Logging → Alerts | Alert on the `admin_request` log line with `status=401`/`403` bursts (for example more than 10 in 5 minutes) and on any `rebuild_hook_failed` entry |
| Dependency advisories | local / CI | `npm audit` and `govulncheck ./...` (see the pull request for the results at the time) |
| Rotation | calendar | Rotate the rebuild token and review the service-account roles on a schedule (every 90 days) |

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

## What the code now does (for reference)

- URLs the owner can edit (résumé, credential links, degree links, project links) must be `https://` with a
  host; the API and the build schemas share the rule and the pages refuse to render anything else.
- Saving site copy, Experience or Achievements needs a sign-in from the last five minutes, like publishing.
- Every `/api/admin/*` request writes an `admin_request` log line: uid, `auth_time`, first
  `X-Forwarded-For` hop, user agent, method, path and status, plus the reason for a refusal. Tokens and
  request bodies are never logged.
- Published files are served with `Cache-Control: public, max-age=300, s-maxage=3600`. A file's bytes never
  change under its id (the stored path contains the content hash), but unpublishing or archiving a file can
  take up to an hour to reach the CDN. Daily download budgets: 1 GiB shared, and 32 MiB per client address
  per instance, with an in-memory short-circuit once the day's budget is spent.
- CSP: `apis.google.com` and the Firebase auth hosts are allowed on `/admin` only; the rest of the site
  allows no Google hosts. HSTS is `max-age=63072000; includeSubDomains; preload` (submit the domain at
  hstspreload.org only when every subdomain serves HTTPS), and non-API responses carry
  `Cross-Origin-Resource-Policy: same-origin`.
