# Firebase setup and cost approval

## Current state

Firebase project **Asad's Lab** (`asad-atterkhan`, number `840582082351`) belongs to `dev@asad.atterkhan.com`. The user chose a neutral project name and intends to use this project for staging and production. Both deployment environments still need deliberate data and service-identity isolation before production onboarding.

Provisioned and verified on 2026-10-26:

- `(default)` Firestore: Standard, Native, `us-central1`, deletion protection enabled, scheduled backups/PITR disabled. The original empty `europe-west4` database was deleted by the user and recreated in the approved US region.
- Default bucket: `asad-atterkhan.firebasestorage.app`, `us-central1`, uniform bucket IAM enabled and public access prevention explicitly enforced. No public IAM principals.
- Repository Firestore rules, indexes, and Storage rules deployed to the explicit project with the personal Firebase CLI account.
- Google is the only enabled sign-in provider. Identity Platform and TOTP are enabled; one adjacent TOTP interval is accepted. No SMS factor is configured.
- Authorized domains: `localhost`, `127.0.0.1`, and Firebase's default project domains. No production domain or App Hosting backend is connected.
- Browser API key restricted to the Auth, token, Firestore and Firebase Storage APIs and `http://localhost:4180/*`, `http://127.0.0.1:4180/*`, `https://asad-atterkhan.firebaseapp.com/*`. Add an actual approved hosting origin before hosting sign-in elsewhere.
- The only human project IAM principal is `dev@asad.atterkhan.com` with Owner. Other IAM principals are Firebase/Google service identities.
- Billing: Blaze via Google Cloud Free Trial; project budget alerts at US$1, US$3 and US$5. Alerts are not spending caps.

Local `.env.local` contains the public Firebase config, server project/bucket IDs and the owner UID, is Git-ignored and mode `0600`, and preserves unrelated local configuration. The first real Google sign-in for `dev@asad.atterkhan.com` succeeded and the Admin SDK granted that UID `admin: true`. TOTP enrollment is verified and local content/document/achievement admin flags are enabled. A fresh Google + TOTP sign-in is still required to open the desk. Public file serving remains off and `CONTENT_SOURCE=git` during onboarding.

The Google OAuth client secret was inadvertently included in an audit tool response. The user replaced it in Google Auth Platform and updated Firebase Authentication's Google provider. A hash comparison confirmed replacement, and a successful real Google sign-in confirmed the new configuration works. Do not paste OAuth secrets into chat or the repository.

### Complete local owner onboarding

The Google Cloud CLI is installed and the personal account's user OAuth ADC session was authorized on 2026-10-26. The local credential file is outside the repository and mode `0600`; no service-account key was created. The owner user, claim and TOTP enrollment are configured. The server uses ADC; Firebase CLI login alone does not provide ADC. To renew that personal session when needed:

```sh
gcloud auth application-default login dev@asad.atterkhan.com --project=asad-atterkhan --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform
```

This saves a user OAuth session in the local gcloud configuration outside the repository. It does not create a service-account key. If keeping all credential files off disk is required, use a managed development/runtime identity instead; do not download service-account JSON.

Verified checks: production build, TypeScript and targeted lint, owner authorization policy cases, Firestore/Storage emulator rules, and content HTTP integration including the owner-session endpoint. Live anonymous Firestore and bucket requests returned 403. API-key requests with the local referrer returned 200; an unapproved referrer returned 403. These checks do not replace the pending real owner Google/TOTP sign-in.

From `platform/`, run `npm run firebase:onboard`, then open `http://127.0.0.1:4180/admin`. The script temporarily opens signups for up to five minutes, waits for the verified `dev@asad.atterkhan.com` Google user, grants only that UID the `admin: true` claim via the Admin SDK, writes `FIREBASE_OWNER_UID` locally, and closes signup again. Signup is otherwise disabled; client account deletion is disabled. On interruption or first-sign-in timeout the script closes signup.

Use **Set up authenticator**, scan the QR code with your authenticator, enter the code yourself, then sign in again with Google and TOTP. The QR is generated in the browser from Firebase's enrollment URI; it never uses an external QR service or image optimizer. The manual setup key is available under **Can’t scan?**. Each stage shows its own primary action. Canceling setup or completing enrollment clears the QR and setup key from component state. The script enables local content/document/achievement features only after that UID has enrolled TOTP. Every backend request still verifies the token, revocation, UID, admin claim, verified Google provider, and TOTP; publishing and deletion additionally require a recent sign-in. The editor remains behind `/api/admin/session` verification, while its sign-in/enrollment screen is available to complete onboarding.

`npm run firebase:onboard -- --check` only reports owner/claim/TOTP readiness. Never put OAuth access tokens, refresh tokens, authenticator secrets or service credentials in `.env.local` or ordinary site content.

**Approval is required before billable provisioning.** The requested full architecture uses Next.js on Firebase App Hosting, Firestore Standard, Cloud Storage and owner-only Authentication. App Hosting and Cloud Storage require the Blaze plan. [App Hosting pricing](https://firebase.google.com/docs/app-hosting/costs) · [Storage billing requirement](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

For planning, allow US$0–5/month at roughly 1,000 visits/month, 1 MB per visit, about 1 GB stored files, ten builds/month, scale-to-zero runtime and modest owner activity. This is an estimate, not a cap or guarantee. Region, shared free allowances, staging duplication, build images, downloads and abuse can change charges. App Hosting's documented free outgoing allowance is 10 GiB/month, with cached/uncached excess at $0.15/$0.20 per GiB; other services have their own allowances. [Current costs](https://firebase.google.com/docs/app-hosting/costs)

Set proposed alerts at $1, $3 and $5 and monitor usage. Alerts do not stop billing. Evaluate Cloud Run's spend-cap feature independently; it does not cap all Firebase services. Keep maxInstances=2, minInstances=0, concurrency=8, object-size/upload/download quotas, short log retention and artifact cleanup. Stop and review a persistent increase.

## Provisioning sequence after approval

1. Use the explicitly approved `asad-atterkhan` project. Do not reuse or alter another project. The user selected one project for staging and production; isolate data and service identities before adding both deployments. The approved resource location is `us-central1` after comparing product support and US free-tier eligibility against latency from Mauritius.
2. Enable Firestore Standard and Cloud Storage; select locations deliberately. Deploy `firebase/firestore.rules`, `firebase/firestore.indexes.json`, and `firebase/storage.rules` to that explicit project. Never use test-mode rules. Keep direct bucket public access disabled.
3. Enable only the needed Google Authentication provider. Authorize localhost for the local owner tool and the required staging host. Choose the owner's UID explicitly. A privileged setup step sets `admin: true` for that one UID; no browser may grant claims. Configure strong MFA on the owner account. Enable Identity Platform and TOTP MFA after approval; real backend sessions and direct owner rule access require the TOTP factor. The local tool supports enrollment and sign-in challenges. No SMS factor is enabled. [Official TOTP setup](https://firebase.google.com/docs/auth/web/totp-mfa)
4. Assign least-privilege service identity for the App Hosting backend to the selected Firestore database and bucket; configure required managed secrets. Local administration uses approved ADC, not checked-in key JSON. No credentials are ordinary documents.
5. Create an App Hosting backend connected to the dedicated GitHub repository and reviewed branch, with root directory **platform**. Keep production auto-rollouts disabled. Next.js has first-party framework integration, but the current 16.4.3 adapter/build must be verified on this staging backend before production; local `next build` alone does not verify the hosted adapter. [Framework support](https://firebase.google.com/docs/app-hosting/frameworks-tooling)
6. Set runtime/build environment: SITE_URL=the actual staging URL, INDEX_SITE=false, project/bucket/owner IDs, ENABLE_DOCUMENT_ADMIN=true only when identity/rules are verified, ENABLE_PUBLIC_FILES=true only after publication tests pass. Set ENABLE_ACHIEVEMENT_ADMIN=true only after owner/TOTP verification, then verify selection changes on Experience and denial of direct browser settings access. Firebase public auth config is not a secret; service credentials are.
7. Use `apphosting.yaml` for scale bounds. Configure the protected GitHub `asad-staging` environment with required reviewer, explicit staging IDs and narrow Workload Identity Federation. The manual staging workflow can create a rollout of the reviewed codex branch commit. Never use a production identity in staging.
8. Verify the managed staging URL, TLS, public routes, noindex, adapter compatibility, rule/index deployment, genuine owner sign-in, uploads, publication, unpublication and denied other-user requests. A noindex or unguessable URL is not authentication. Only approved public material belongs on public staging; drafts remain local.

The local `/manage` page is deliberately absent from production builds. Run it locally with the staging project configuration to manage staged documents. Later, switch to the explicit production configuration after approval, rather than mixing environments.

## Content in Firestore

The owner edits site copy and articles from `/admin` through the routes in `docs/admin-contract.md`. All of them call `requireOwner(request, { service: "content" })` (Google sign-in, owner UID, `admin` claim, TOTP; publish, unpublish and delete also need a sign-in within five minutes) and are off unless `ENABLE_CONTENT_ADMIN=true`. Public pages read Firestore only when `CONTENT_SOURCE=firestore`; otherwise they keep reading `content/`.

| Collection | Written by | Read by | Notes |
| --- | --- | --- | --- |
| `siteSettings/public` | `PUT /api/admin/site` | `getSiteCopy()` → `firestoreSiteCopy()` | Hero, role, company, location, intros, `aboutBody` (Markdown); `ownerUid`, `updatedAt` |
| `articles/{slug}` | `/api/admin/articles…` | Admin routes only | Drafts with `version` (optimistic concurrency), `ownerUid`, `modifiedAt` |
| `publicArticles/{slug}` | Publish / unpublish routes | `firestoreArticles()` | Validated `ArticleSchema` snapshot + `body`, copied in the same transaction that marks the draft published |
| `publicProjects/{slug}` | (later) | `firestoreProjects()` | Same pattern, not yet editable |

Firestore rules keep all of these default-deny: browsers never read or write them, only the Admin SDK on the server. No composite index is needed (the draft list filters on `ownerUid` and sorts in memory). Writes call `revalidatePath` for the affected public pages and log a `content_revalidated` audit line; `POST /api/revalidate` remains for changes made outside the app. Quotas per day: 1,000 reads, 500 saves, 3,000 previews, 50 publish/unpublish and 50 deletes.

To switch production over: set `ENABLE_CONTENT_ADMIN=true` once owner TOTP sign-in is verified on staging, publish the existing Git articles through the admin (or a reviewed one-off import), check `/lab`, `/rss.xml`, `/sitemap.xml` and `/search.json` against the Git build, then set `CONTENT_SOURCE=firestore` and redeploy.

## Local security verification

`npm run test:rules` starts Firestore/Storage emulators using `demo-asad-exe`, then checks anonymous/other-user denial, owner access and forbidden client writes. `npm run test:documents` also starts Auth and a built Next server to exercise actual HTTP upload, signature rejection, private download, explicit publication, metadata edits, unpublish and archive. These tests passed locally without cloud resources.

`npm run test:content` starts Auth and Firestore emulators and a built server with `ENABLE_CONTENT_ADMIN=true` and `CONTENT_SOURCE=firestore`. It checks 503 with the flag off, 401/403 on every content route, validation (400), version conflicts (409), site-copy saves reaching `/`, article publish making `/lab`, `/lab/{slug}`, `/search.json` and `/rss.xml` show the article, unpublish returning the page to 404, draft-only delete, and the preview renderer. Build first with `NEXT_DIST_DIR=.next-production npm run build`.

Java 21+ is required. A checksum-verified task-local Temurin 21 JRE was used during this implementation; it is not a repository dependency or a system configuration change.
