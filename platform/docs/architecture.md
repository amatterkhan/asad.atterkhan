# Architecture

## Public reading path

Next.js 16.4.3 / TypeScript / React, with statically generated pages and minimal interactive components. Navy/pastel tokens and locally hosted Departure Mono retain the original terminal identity; body prose uses a system sans. No Tailwind/component library or animation engine is used in the rebuild. It is isolated from the old Vue application's build configuration.

The original content JSON was migrated to `content/`. Existing project data, career details, contacts, palette, and terminal behavior were reused. Original Vue components are not copied wholesale into React. The existing production source remains intact.

Articles are validated Markdown in Git. `content.ts` filters only explicit published, dated, non-future records before generating routes, listings, search, RSS, related items or sitemap. No article bodies are stored in Firestore. A development-only fixture demonstrates long-form content. No confidential draft should enter this public repository; local private drafts are gitignored and production previews return 404.

Markdown passes through remark/GFM → HTML syntax tree → sanitization → safe headings/tables/flow components → build-time Shiki highlighting → HTML serialization. Raw HTML and unsafe protocols are removed. Uploaded MDX/JavaScript is never compiled. Code-copy controls progressively enhance already-readable code. Tables are wrapped server-side, so horizontal scrolling works without JS.

Normal visitors do not load the Firebase client SDK, owner tool, reference board, enlarged art previews or automated accessibility runner. Sprites are small real PNG sheets. Reduced motion and no-JS fallback are supported.

## Documents and authentication

| Data | Canonical store | Access |
| --- | --- | --- |
| Article body/metadata/status | Reviewed Git Markdown | Generated public records only |
| Project/career/credential records | Git JSON | Public after review |
| Experience credential selection | Firestore `siteSettings/achievements` after activation; Git seed before activation | Backend-only writes; owner UID/admin/TOTP required |
| Local unfinished/private drafts | `.private-content/` or private external source | Development only; not committed |
| Uploaded document metadata | Firestore `documents` | Owner reads; backend-only mutations |
| Original files | Storage `private/<uid>/<id>/<hash.ext>` | Owner only |
| Published copies | Storage `published/<id>/<hash>/<publication-uuid>` | Bucket denies direct reads; served through publication-aware route |
| Operational quotas | Firestore `_quotas` | Backend only |

Local `/manage` uses Firebase Google sign-in. A signed-in account alone has no privileges: every administrative request requires the configured owner UID and an out-of-band admin claim, with revocation checks. Publishing/archiving additionally requires sign-in within five minutes. Real administrative sessions require Firebase TOTP MFA. The local owner tool supports authenticator enrollment and sign-in challenges; configure Identity Platform/TOTP after billing approval. Protect the owner's Google account with strong MFA as well. Auth-emulator tests explicitly use a demo project and do not claim to verify a real authenticator sign-in.

Uploads are streamed with a hard body cap, max 8 MiB per file, and magic-byte validation for PDF/PNG/JPEG/WebP. Filenames are normalized, metadata is strict-schema validated, and quotas limit owner operations (including 25 uploads/day). No anonymous upload path exists.

Publication requires explicit confirmation and creates a separate copy. A transaction verifies that the metadata version did not change before setting `published`. Unique copy paths prevent concurrent failures from deleting another publication. Only a committed record exposes the copy through `/files/<id>` or, for images, `/media/<id>`. These routes check publication state on every request and use no-store responses. There are no private Firebase token URLs. Public transfer is limited to 64 MiB/day per project by a transactional quota; budget alerts and upstream abuse controls remain necessary because rejected requests/database reads can still have costs.

Unpublish immediately removes route access before deleting the public copy. Archiving retains the private original. Previously downloaded material cannot be recalled. If cleanup fails, the object remains unreachable through public routes/rules and can be cleaned up administratively.

## Controls and limits

Default-deny Firestore/Storage rules; Admin SDK routes enforce their own authorization because Admin bypasses rules. Managed service identity/ADC replaces stored service-account keys. Logs contain event names, opaque IDs and timestamps, never file contents or tokens. Production error messages omit private details.

Security headers include CSP, framing protection, nosniff, referrer policy, permissions policy and production HSTS. Static Next bootstrap uses inline scripts, so CSP currently permits inline scripts/styles; it is not a strict nonce-based policy. Untrusted Markdown HTML remains disabled/sanitized. Development framing is relaxed to same-origin only for responsive review; production denies framing.

Non-executable file type validation is not malware scanning. Review documents before publication; add scanning if untrusted contributors are ever introduced. No contributor accounts or public uploads exist in V1.

Firebase SDK/CLI upgrades and pinned transitive overrides remove current audit findings. The overrides patch grpc-js, uuid and OpenTelemetry; emulator integration verifies the currently used SDK/CLI paths. Re-audit when upgrading dependencies.

## Calendar and secondary navigation

`/calendar` ports the original Vue shift-calendar algorithm: Monday-based alternating five/two workday weeks, with a 24 November 2025 night-shift anchor and four-week night/day blocks. Date arithmetic uses UTC civil dates to avoid DST drift; today uses Indian/Mauritius. It does not integrate with or transmit data to a third-party calendar. Workbench is canonical at `/workbench`, with permanent redirects for former `/projects` listing/detail routes. The footer uses normal links. The previous terminal UI is archived and is no longer shipped.

Achievement records remain source-controlled. Selecting up to six for Experience writes one validated ID list to Firestore; it does not copy credential content or modify the public full collection. This feature has a separate disabled-by-default environment flag. With it enabled, the dynamic Experience route reads one small settings document per request; account for those reads in hosted cost monitoring. Local emulator tests verify the HTTP authorization, validation, saved selection and public rendering. Activation against a real project and real TOTP sign-in remains part of staging verification.

## Motion and visual interaction

A CSS dot/pixel field animates two fixed, decorative layers with transforms. No canvas loop, game engine or animation library is loaded. Small entrance and hover effects enhance the existing layout. Motion is enabled after hydration; without JavaScript the background remains static and the content stays visible. A small footer control disables all animations and transitions for the current session/navigation; `prefers-reduced-motion` overrides motion and hidden tabs pause it. Text selection uses lavender on deep navy. Form focus uses the existing square border plus a one-pixel inset highlight, preserving geometry. Home loads the separately extracted, intentionally static `storm-sit` pose; About retains its independent idle pose.
