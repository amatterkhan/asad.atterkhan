# ADR 0004: the hero says "security engineer"; the job title is Security Operations Analyst

**Date:** 10 November 2026 · **Status:** accepted (owner decision)

## Context

The owner's job title is Security Operations Analyst. The upgrade brief asked for the hero's
"I'm a security engineer" to be replaced, and an analyst wording was drafted. Asked to confirm, the
owner chose to keep "security engineer" in the hero.

## Decision

- Hero: "I'm a security engineer. I investigate things that shouldn't have happened, then build the
  tooling to make sure they don't happen again. Well, ideally."
- Everywhere a **job title** is stated (Experience, structured data, share images, any meta
  description that names a role) it is "Security Operations Analyst", with no level.
- "Security Engineering" stays wherever it names a topic or a Lab category.

## Consequences

The hero describes the work; the Experience page states the title. A reader who compares the two
will see the difference, and the owner has accepted that. Production copy lives in Firestore, so
the hero text is changed by saving it in `/admin` → Site copy; the files in `site/content/` and
`api/internal/content/data/` are fallbacks and are updated in Stage 4.
