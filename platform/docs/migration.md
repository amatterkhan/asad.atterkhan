# Staging, production and rollback

The current site remains on GitHub Pages behind Cloudflare. The original Vue app and Pages workflow are unchanged. The source repo's `main` branch triggers the old Pages workflow; do not push a replacement workflow or cut over the domain as an incidental development action.

## Before staging

- Get approval for the isolated billable staging project, region, billing account and owner identity. Do not modify existing named services.
- Push only reviewed implementation/content to a codex branch; source publication is separate from production deployment. No source changes were pushed during this implementation.
- Run the new CI workflow. Configure a required reviewer on `asad-staging` before enabling its manual rollout. It checks staging variables and rolls out a specific commit; there is no production rollout workflow.
- Verify Next/App Hosting adapter support against the real backend. Confirm private drafts cannot be served from staging. Keep INDEX_SITE=false.

## Existing URL behavior

Implemented permanent redirects: `/blog`→`/lab`, `/resume`→`/experience`, `/project/1..4`→matching project slugs, and `/post/0`→`/about`. The old About post did not contain the promised body, so the real About page is the meaningful destination. Dummy post URLs return 404, as do unknown slugs.

The shift calendar is deliberately not migrated. Legacy `/techbooks`, `/islamicbooks`, and `/nightschool` external redirects require a separate content/privacy decision; their remote destinations are not copied into this rebuild. Check existing inbound links before cutover.

## Production approval and cutover

1. Complete staging verification, real iPhone Safari and desktop-browser testing, content/privacy review and backup checks.
2. With account access, record exact Cloudflare origin/proxy/TTL, SSL and redirect/cache settings. Public DNS alone cannot reveal proxied origin records. Pages currently reports HTTPS enforcement off at the origin while public HTTPS works through Cloudflare; verify the actual edge/origin TLS setup rather than inferring safety from one flag.
3. Preserve the working Pages deployment and a Git revision of the old source. Export relevant public file/metadata state and record the last accepted Firebase revision. Do not delete either platform.
4. Obtain explicit approval for the live-domain switch. Configure/verify Firebase custom-domain ownership and TLS, then make only the approved DNS changes. Set SITE_URL=https://asad.atterkhan.com and INDEX_SITE=true only for the reviewed production release.
5. Test home, Lab, projects, Experience, About, RSS, sitemap, OG, redirects, real 404s, private-denial/public-file behavior, TLS and mobile rendering. Monitor errors and costs.

## Rollback

For an application regression on Firebase, roll back to the last accepted App Hosting rollout/revision using the backend's supported console/CLI workflow. Preserve its release identifier before every rollout.

For a migration failure, restore the recorded Cloudflare record/proxy settings to the retained GitHub Pages origin. Allow for DNS/cache propagation and verify HTTPS/old routes. Keep Pages active until final acceptance.

Document unpublish removes route access immediately and attempts public-copy cleanup. Private originals remain. If a storage operation fails after a metadata change, review the logged opaque document ID and clean unreachable copies; do not make a bucket public as a repair.

The replacement preserves `/calendar` with the existing shift pattern. `/projects` and `/projects/:slug` permanently redirect to `/workbench` and `/workbench/:slug`. `/achievements` is new and linked from Experience; its initial collection contains only the original verified credential records. RSS subscription links and discovery metadata have been removed at the user’s request; the existing feed URL remains available for URL compatibility.
