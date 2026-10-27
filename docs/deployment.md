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

## Production — 27 October 2026

- Public origin: `https://asad.atterkhan.com`, Firebase Hosting site `asad-atterkhan` (project
  `asad-atterkhan`), with Google-managed TLS (Google Trust Services certificate, valid to
  24 January 2027, renewed by Hosting). `https://asad-atterkhan.web.app` serves the same site.
- API: Cloud Run `asad-api` in `us-central1` (next to Firestore and Storage), dedicated `asad-api`
  runtime identity, public invoker, minimum 0 / maximum 2 instances, concurrency 8, 1 CPU,
  512 MiB, request-based billing. `/api/**`, `/files/**` and `/media/**` Hosting rewrites reach it.
- Flags: `ENABLE_CONTENT_ADMIN`, `ENABLE_ACHIEVEMENT_ADMIN`, `ENABLE_DOCUMENT_ADMIN` and
  `ENABLE_PUBLIC_FILES` are `true`. There is no calendar flag: `GET /api/calendar` is public.
- Content: `CONTENT_SOURCE=firestore`; the site is built from Firestore on every deploy.
- Indexing: `SITE_URL=https://asad.atterkhan.com`, `INDEX_SITE=true`; canonical links, Open Graph,
  `sitemap.xml`, RSS and `robots.txt` use the real domain.
- Publishing in `/admin` sends a `repository_dispatch` (`REBUILD_HOOK=github`) that runs "Deploy
  site and API" on `main` (`SITE_DEPLOY_BRANCH=main`).

### DNS (Cloudflare, zone `atterkhan.com`)

| Name | Type | Content | Proxy |
| --- | --- | --- | --- |
| `asad` | CNAME | `asad-atterkhan.web.app` | DNS only (grey cloud) |

The previous proxied A and AAAA records for `asad` (the GitHub Pages cutover) were removed. No
MX, TXT or other subdomain records were touched. Cloudflare flattens the CNAME, so resolvers see
an A record (`199.36.158.100`). The proxy is deliberately off: Hosting issues and renews its own
certificate and serves the security headers from `site/firebase.json`. If it is ever turned on, set
Cloudflare TLS to Full (strict) first and re-check the headers and cache behaviour.

### Not verified

- Browser end-to-end checks of the achievements, documents and file-publishing admin tabs
  (upload → publish → `/files/{id}`) need an interactive owner session.
- Cloudflare-proxied operation (see above) has not been tested.
