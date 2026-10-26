# Deployment

How the production environment is put together. CI/CD that automates this is described in
[ci-cd.md](ci-cd.md); the Firebase project's current state is in [firebase.md](firebase.md).

## Reference sequence

Cloud Run service `asad-api` and Hosting rewrites use `us-central1`, alongside Firestore and
the Storage bucket, to avoid cross-region latency on API calls. Do not use `APP_ENV=development` in a deployed environment.

1. Select an existing approved Firebase/GCP project, Hosting site and private Storage bucket.
   Review `site/firebase/{firestore.rules,storage.rules}` and the index file. Client access to
   owner content must remain denied; the API uses the Admin SDK.
2. Build `api/Dockerfile` with `api/` as the build context. It produces a static Go executable
   in a distroless image running as a non-root user. Docker build and Cloud Run deployment
   succeeded through GitHub Actions on 27 October 2026.
3. Configure Cloud Run's managed identity with access to the intended Firestore database,
   private bucket and Firebase user verification. Supply `FIREBASE_PROJECT_ID`,
   `FIREBASE_STORAGE_BUCKET`, `FIREBASE_OWNER_UID`, `APP_ENV=production`, and the required flags.
   Store rebuild credentials in the deployment's secret manager. Do not set emulator variables.
4. Configure Firebase Google sign-in, the authorized domain, the owner account, its `admin`
   claim and TOTP enrollment. Supply the public web configuration in the site's
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID` at build time.
   Confirm `SITE_URL` and set `INDEX_SITE=true` only for the approved production host.
5. Set up GitHub deploys with `.github/scripts/setup-firebase-deploy.sh` (workload identity,
   deploy and runtime identities, repository variables). See [ci-cd.md](ci-cd.md).
6. After approval, deploy the API, review the Hosting rewrite region/service, export/build the
   static site and deploy with `firebase deploy --only hosting --config firebase.json --project
   <approved-project>` from `site/`.
7. Verify real owner/TOTP sign-in, stale/revoked sessions, publication/rebuild delivery, upload
   and archive, private/public files, the calendar, headers, redirects and 404s on the real host.

## Deployed staging origin — 27 October 2026

- Hosting: `asad-atterkhan`, `https://asad-atterkhan.web.app`, with Firestore/Storage rules.
- API: `asad-api`, `us-central1`, dedicated `asad-api` runtime identity, public invoker enabled
  successfully. Direct URL: `https://asad-api-cqbapmrj3a-uc.a.run.app`.
- Cloud Run: minimum 0 / maximum 2 instances, concurrency 8, 1 CPU, 512 MiB, request-based billing.
- `/api/**`, `/files/**`, `/media/**` Hosting rewrites reach Cloud Run. Health returns 200;
  disabled owner services return 503; disabled public files/media return 404, all uncached.
- All five feature flags remain false. Because the flag gate precedes authentication, a missing
  token returns 503 while disabled; production 401 checks wait for per-feature approval.
- Browser Auth already authorizes `asad-atterkhan.web.app`. The browser key now also allows
  `https://asad-atterkhan.web.app/*`; its four API restrictions and original referrers remain intact.
- Git content, noindex, web.app canonical URL. `Lab 000` is the user-selected initial article.

The owner confirmed real Google/TOTP sign-in on web.app. Per-feature enablement and its
end-to-end checks remain gated by owner approval. No custom Hosting domain has
been added, no Cloudflare DNS records have changed and `main` has not been merged. Exact custom
domain records will be recorded after the approved cutover; none are claimed verified yet.
