# Firebase project

## Current state (verified 2026-10-26)

Firebase project **Asad's Lab** (`asad-atterkhan`, number `840582082351`) belongs to `dev@asad.atterkhan.com`. The user chose a neutral project name and intends to use this project for staging and production. Both deployment environments still need deliberate data and service-identity isolation before production onboarding.

Provisioned and verified on 2026-10-26:

- `(default)` Firestore: Standard, Native, `us-central1`, deletion protection enabled, scheduled backups/PITR disabled. The original empty `europe-west4` database was deleted by the user and recreated in the approved US region.
- Default bucket: `asad-atterkhan.firebasestorage.app`, `us-central1`, uniform bucket IAM enabled and public access prevention explicitly enforced. No public IAM principals.
- Repository Firestore rules, indexes, and Storage rules deployed to the explicit project with the personal Firebase CLI account.
- Google is the only enabled sign-in provider. Identity Platform and TOTP are enabled; one adjacent TOTP interval is accepted. No SMS factor is configured.
- Authorized domains: `localhost`, `127.0.0.1`, and Firebase's default project domains. No production domain is connected.
- Browser API key restricted to the Auth, token, Firestore and Firebase Storage APIs and `http://localhost:4180/*`, `http://127.0.0.1:4180/*`, `https://asad-atterkhan.firebaseapp.com/*`. Add an actual approved hosting origin before hosting sign-in elsewhere.
- The only human project IAM principal is `dev@asad.atterkhan.com` with Owner. Other IAM principals are Firebase/Google service identities.
- Billing: Blaze via Google Cloud Free Trial; project budget alerts at US$1, US$3 and US$5. Alerts are not spending caps.

The first real Google sign-in for `dev@asad.atterkhan.com` succeeded, the Admin SDK granted that UID `admin: true`, and TOTP enrollment was verified. Never paste OAuth secrets into chat or the repository.

## Cost

Planning estimate: US$0–5/month at roughly 1,000 visits/month, about 1 GB of stored files, ten builds a month and scale-to-zero Cloud Run. This is an estimate, not a cap. Region, build images, downloads and abuse change charges. Budget alerts at $1, $3 and $5 do not stop billing. Keep Cloud Run at `maxInstances=2`, `minInstances=0`, `concurrency=8`, keep object-size and daily upload/download quotas, short log retention and artifact cleanup, and review any persistent increase.

## Owner onboarding

The owner UID, `admin` claim and TOTP enrollment are already set up for `dev@asad.atterkhan.com`. Signup is disabled; no browser can grant claims. The original one-shot tool that opened signup briefly and granted the claim was part of the retired Next.js app and was not ported: `git show legacy-final:platform/scripts/firebase-owner.ts`. Granting a claim to a new owner is a privileged Admin SDK call (`setCustomUserClaims(uid, { admin: true })`), followed by TOTP enrollment in `/admin`. Do not download service-account JSON; use ADC (`gcloud auth application-default login`) or a managed identity.

## Content in Firestore

| Collection | Written by | Notes |
| --- | --- | --- |
| `siteSettings/public` | `PUT /api/admin/site` | Hero, role, company, location, intros, `aboutBody`; `ownerUid`, `updatedAt` |
| `siteSettings/achievements`, `siteSettings/wardrobe` | achievements and wardrobe routes | Featured achievements; Asad's active outfit |
| `articles/{slug}` | `/api/admin/articles…` | Owner drafts with `version` (optimistic concurrency) |
| `publicArticles/{slug}` | publish / unpublish | Validated snapshot + `body`, written in the same transaction that marks the draft published |
| `publicProjects/{slug}` | (read-only for now) | Same pattern, not yet editable |
| `documents/{id}` | `/api/admin/documents…` | Private upload metadata; files are in Storage |
| `_quotas/{hash}` | API | Daily operation counters |

Rules (`site/firebase/`) keep everything default-deny: browsers never read or write these collections, only the API does. No composite index beyond the one in `firestore.indexes.json`. The site reads published content only when built with `CONTENT_SOURCE=firestore`.

To switch production over: enable `ENABLE_CONTENT_ADMIN` once owner TOTP sign-in is verified, publish the existing articles through the admin, compare `/lab`, `/rss.xml`, `/sitemap.xml` and `/search.json` with the Git build, then set `CONTENT_SOURCE=firestore` and rebuild.

## Security verification

`go test ./...` under the emulators (see [development.md](development.md)) exercises real HTTP against Auth, Firestore and Storage: 401/403/400/409/413/503 on every route, owner/admin/TOTP policy, recent authentication, quotas, file signatures, publish visibility and the exporter. Java 21+ is required for the emulators. Rules are checked separately by the emulator suite in `site/firebase/`.
