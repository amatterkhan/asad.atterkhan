# ADR 0003: no inline styles on public pages; the mermaid runtime is removed

**Date:** 10 November 2026 · **Status:** accepted

## Context

The public CSP allowed `style-src 'unsafe-inline'` because the room, the sprites and Shiki's
highlighted code all render `style=""` attributes. Firebase Hosting serves static headers, so a
per-response nonce is not available.

## Decision

- The build moves every prerendered style attribute into a rule appended to the main stylesheet,
  keyed by a `data-s` attribute (`site/scripts/inline-styles.ts`), and fails if any page still has
  one. Islands change styles through the CSSOM, which `style-src 'self'` allows.
- Public pages also get `require-trusted-types-for 'script'` with Vue's policy only, COOP
  `same-origin`, and `upgrade-insecure-requests`.
- Mermaid is removed. It injects `<style>` elements and style attributes at runtime, which this
  policy blocks, and no article used it. A ```` ```mermaid ```` block renders as its source text.
- `/admin` keeps `style-src 'unsafe-inline'` for the article editor's HTML preview, and has no
  Trusted Types because the Firebase sign-in loads `apis.google.com` by assigning a script URL.
  Both are revisited when the editor is retired (ADR 0005).

## Diagrams without mermaid

1. The ```` ```flow ```` block (`a -> b -> c`) stays: plain HTML and CSS, nothing at runtime.
2. Anything richer is drawn in any tool, exported to SVG or PNG, committed next to the article and
   shown as an image. An image cannot run script, and the content lint (Stage 3) will reject SVGs
   that contain script, `foreignObject` or external references.

A build-time text-to-diagram renderer was considered and not adopted: it is a new dependency to
keep current for a feature with no users yet. Revisit if hand-exported diagrams become a chore.

## Consequences

Tests read computed styles, not the `style` attribute. A visual diff of Home, the Lab index and a
Lab post at 390px and 1280px, dark and light, showed at most 0.04% of pixels changed (animation
frames).
