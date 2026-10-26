# CI/CD: GitHub → Firebase

Three workflows and one shared build step. GitHub signs in to Google Cloud with Workload Identity
Federation, so no service-account key exists anywhere. Nothing deploys until the one-time setup has
set the repository variables. Until then the deploy and preview jobs are skipped, and checks still run.

| Workflow | Runs on | Does |
| --- | --- | --- |
| `site-ci.yml` | Pull requests touching `site/`, `api/` or the workflows; called by deploy | gofmt, `go vet`, Go tests against Auth/Firestore/Storage emulators with `-race`, API Docker build; site typecheck, Vitest, `npm audit`, build, Playwright suite |
| `site-deploy.yml` | Push to the deploy branch, `content-published` dispatch, manual | Checks → API to Cloud Run (when enabled and `api/` changed) → Hosting + Firestore/Storage rules |
| `site-preview.yml` | Same-repository pull requests touching `site/` | 7-day preview channel `pr-<n>` with Git content, noindex and no API; link posted on the PR; deleted on close |
| `.github/actions/site-build` | Used by deploy and preview | Optional Firestore export, `npm ci`/typecheck/test/build, writes `site/firebase.ci.json` |

`site-deploy.yml` replaces the earlier `site-rebuild.yml`: code pushes and content rebuilds now use
one build path and one concurrency group (`site-deploy`). The newest run wins, because every build
contains all published content.

## How the pieces connect

```flow
push to deploy branch -> checks -> Cloud Run (asad-api) -> Hosting + rules
```

```flow
owner publishes in /admin -> API sends repository_dispatch -> export -> build -> Hosting
```

- **Deploy branch:** `frontend-redesign`, or the `SITE_DEPLOY_BRANCH` variable. Pushes to other
  branches are ignored, and `main` keeps deploying the old site to GitHub Pages through `deploy.yml`.
- **Content rebuilds:** GitHub delivers `repository_dispatch` only to workflows on the **default
  branch (`main`)**, so publish-triggered rebuilds start once `site-deploy.yml` is on `main`. The
  workflow still checks out the deploy branch, not `main`. Until then, run it manually
  (Actions → Deploy site and API → Run workflow).
- **API before Hosting:** Hosting rewrites `/api`, `/files` and `/media` to Cloud Run, and refuses
  to deploy rewrites to a service that doesn't exist. While `API_ENABLED` isn't `true`, the build
  step drops those rewrites, so the static site can go out first.
- **Previews never touch production data:** preview channels have no API rewrites and use Git content.

## One-time setup

Needs `gcloud` and `gh`, signed in as the project owner. Read the script first, because it changes IAM.

1. Push this branch: `git remote add origin https://github.com/amatterkhan/asad.atterkhan.git`,
   then `git push -u origin frontend-redesign`.
2. Run the setup:

   ```bash
   PROJECT_ID=asad-atterkhan REPO=amatterkhan/asad.atterkhan .github/scripts/setup-firebase-deploy.sh
   ```

   It creates:
   - the `github` identity pool, restricted to this repository's numeric ID;
   - `github-deployer` (Hosting, rules, read Firestore for the export, Cloud Run rollout, image push);
   - `asad-api` as the runtime identity (Firestore read/write, token verification, the private bucket
     when `BUCKET` is set);
   - the `asad` Artifact Registry repository;
   - a `site-production` environment limited to `frontend-redesign` and `main`;
   - the repository variables listed below.
3. Set `FIREBASE_WEB_API_KEY` from `firebase apps:sdkconfig web --project asad-atterkhan`.
4. Push, or run the deploy workflow by hand. The first deploy is static Hosting with Git content
   at `SITE_URL` (default `https://asad-atterkhan.web.app`), noindex.

Then turn things on one at a time, each with `gh variable set NAME --body VALUE`:

| Variable | When |
| --- | --- |
| `API_ENABLED=true` | Blaze billing, Storage bucket (`FIREBASE_STORAGE_BUCKET`), Google sign-in + TOTP and `FIREBASE_OWNER_UID` (with its `admin` claim) are ready. The next deploy builds and rolls out `asad-api`, then adds the rewrites. Run the deploy with "Also build and deploy the API" for the first rollout. |
| `ENABLE_CONTENT_ADMIN`, `ENABLE_DOCUMENT_ADMIN`, `ENABLE_ACHIEVEMENT_ADMIN`, `ENABLE_PRIVATE_CALENDAR`, `ENABLE_PUBLIC_FILES` = `true` | Per feature, after owner sign-in is verified on the deployed site. They take effect on the next API deploy. |
| `REBUILD_HOOK=github` | After creating the `asad-api-github-token` secret in Secret Manager (fine-grained token for this repository, Contents: read and write) and re-running the setup script so the runtime can read it. |
| `CONTENT_SOURCE=firestore` | Once the published articles live in Firestore. |
| `INDEX_SITE=true`, `SITE_URL=https://asad.atterkhan.com` | At the domain cutover only. |
| `FIREBASE_HOSTING_SITE` | Only to deploy to a second Hosting site instead of the default one. |

All configuration is in **repository variables**, not environment variables, because job
conditions can't read environment-level variables. None of it is secret. The only secret, the
dispatch token, lives in Secret Manager and is mounted into Cloud Run.

## Not verified yet

The workflows have been parsed and their `jq`/change-detection logic exercised locally, but they
haven't run on GitHub, and the setup script hasn't been run. Expect the first run to surface IAM
details. In particular, Firebase CLI permission needs can change between versions, and an
organisation policy may block the public Cloud Run invoker that Hosting rewrites need.
Pull requests from forks get no credentials: they run checks only.
