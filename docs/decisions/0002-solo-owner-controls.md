# ADR 0002: process controls for a single owner

**Date:** 10 November 2026 · **Status:** accepted

## Context

Asad is the only developer, maintainer and admin of the site. There is no second reviewer and
nobody else has access. Controls copied from team practice either block the owner or get bypassed.

## Decision

- `main` is protected by a ruleset: changes arrive by pull request, the `api`, `site` and `secrets`
  checks must pass, and force-pushes and deletion are blocked. **No approving reviews are required.**
- The `site-production` environment requires an approval that the owner gives himself, with
  administrator bypass switched off.
- Every new tool, service or recurring task must state its ongoing cost to the owner in one line.
  Nothing is added that needs watching: no CSP report collector, no contact form.
- What would be forgotten is automated: grouped Dependabot, the weekly `site-watch` workflow, and
  dated reminders in `docs/maintenance.md`.
- The admin surface only shrinks.

## What each control is for

| Control | Stops |
| --- | --- |
| Required checks, no force-push, no deletion | The owner's own mistakes |
| Self-approved deploy gate | A stolen rebuild token or workflow trigger shipping to production |
| Recovery runbook | Lockout |

None of them provides independent review, and none stops a full takeover of the owner's GitHub
account. The docs must not claim otherwise.

## Consequences

Every production deploy, including a content rebuild, waits for one click. That is the price of
the gate that contains SEC-02.
