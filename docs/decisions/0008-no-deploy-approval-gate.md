# ADR 0008: no approval gate on production deploys

**Date:** 22 November 2026 · **Status:** accepted · Supersedes the deploy-gate part of
[ADR 0002](0002-solo-owner-controls.md)

## Context

ADR 0002 planned a self-approved gate on the `site-production` environment so that a stolen
rebuild token or workflow trigger could not ship to production without a click from the owner.
The owner declined it: this is a solo project, and every content publish in `/admin` would wait
for an approval in GitHub.

## Decision

`site-production` has no required reviewer. A merge to `main`, a content publish and a manual
run deploy without a pause. The gate's job is covered instead by:

- the ruleset on `main` (pull requests only, the `api`, `site` and `secrets` checks, no
  force-push, no deletion), so nothing reaches `main` without passing CI;
- `site-production` and `site-export` accepting deployments from `main` only;
- the rebuild token holding **Actions: write** only (`REBUILD_HOOK=github-workflow`, SEC-02), so a
  stolen token can start a rebuild of `main` as it is but cannot push code.

## Consequences

- Merging is deploying. Every request to merge says so.
- A stolen Actions-only token can still start deploys of `main`, cancel runs, and re-run an older
  deploy run, which ships that older commit (a rollback, not new code). Rotation every 90 days and
  revoking on any sign of misuse ([recovery.md](../recovery.md)) are the answer.
- Until the ruleset and the Actions-only token are both in place, a stolen rebuild token can push
  to `main` and ship code. Both are on the owner's list in [security.md](../security.md).
