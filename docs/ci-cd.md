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
  branches are ignored. GitHub Pages is disabled; the default-branch workflow cleanup is
  checked again before the merge to `main`.
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
| `ENABLE_CONTENT_ADMIN`, `ENABLE_DOCUMENT_ADMIN`, `ENABLE_ACHIEVEMENT_ADMIN`, `ENABLE_PUBLIC_FILES` = `true` | Per feature, after owner sign-in is verified on the deployed site. They take effect on the next API deploy. |
| `REBUILD_HOOK=github` | After creating the `asad-api-github-token` secret in Secret Manager (fine-grained token for this repository, Contents: read and write) and re-running the setup script so the runtime can read it. |
| `CONTENT_SOURCE=firestore` | Once the published articles live in Firestore. |
| `INDEX_SITE=true`, `SITE_URL=https://asad.atterkhan.com` | At the domain cutover only. |
| `FIREBASE_HOSTING_SITE` | Only to deploy to a second Hosting site instead of the default one. |

Job configuration is in **repository variables**, because job conditions cannot read
environment-level variables. `FIREBASE_OWNER_UID` and `FIREBASE_WEB_API_KEY` also have
GitHub Actions secret copies; workflows read these copies so action-input logging masks the
values. The setup script sets both UID copies; set both API-key copies after the SDK lookup.
The dispatch token lives only in Secret Manager and is mounted into Cloud Run.

## Rollout status — 27 October 2026

The setup script has run successfully. Workload Identity authentication and the Hosting build
have run on GitHub; static Hosting and Firestore/Storage rule deployment succeeded.
The first Hosting deployment exposed a missing
`firebasestorage.defaultBucket.get` permission; the deployer now has
`roles/firebasestorage.viewer` plus bucket-scoped `roles/storage.bucketViewer`, and the setup
script preserves both grants. These read Firebase and GCS bucket metadata, not file contents.

Cloud Run image build and rollout, public invoker and Hosting API rewrites also succeeded
([run 40394130364](https://github.com/amatterkhan/asad.atterkhan/actions/runs/40394130364)).
Owner sign-in, publish-triggered rebuild delivery (an admin publish started "Deploy site and API"
through `repository_dispatch` on `main`), PR preview channels and the custom domain have all been
verified. `main` has deployed since pull request 3. Pull requests from forks get no
credentials: they run checks only.

Configuration names set during launch (values of UID/key omitted):
`WIF_PROVIDER`, `DEPLOY_SERVICE_ACCOUNT`, `API_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`,
`FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_OWNER_UID`, `API_REGION`,
`SITE_URL`, `FIREBASE_WEB_API_KEY`, `API_ENABLED`, `CONTENT_SOURCE`, `INDEX_SITE`, `REBUILD_HOOK`,
`SITE_DEPLOY_BRANCH`, `ENABLE_CONTENT_ADMIN`, `ENABLE_ACHIEVEMENT_ADMIN`, `ENABLE_DOCUMENT_ADMIN`,
`ENABLE_PUBLIC_FILES`.
GitHub secrets: `FIREBASE_OWNER_UID`, `FIREBASE_WEB_API_KEY`. The Secret Manager secret
`asad-api-github-token` (fine-grained token, Contents: read and write, this repository only) is
mounted into Cloud Run when `REBUILD_HOOK=github`. It expires, so set a reminder and rotate it
with `gcloud secrets versions add asad-api-github-token --data-file=-` plus an API redeploy.
Rapid admin saves each start a run; the workflow's concurrency group cancels superseded ones.

Cost follow-up: Cloud Run scales to zero with maximum two instances. Artifact images currently
accumulate without a cleanup policy; configure a reviewed retention policy before frequent
rebuilds. Hosting traffic, stored objects, Firestore usage and logs can also incur charges.
The $1/$3/$5 budget alerts are notifications, not spending caps.
