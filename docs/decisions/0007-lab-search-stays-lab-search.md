# 0007: Lab search stays the small built-in search; Pagefind is not adopted

Date: 2026-11-11. Status: accepted (Stage 3, pending the owner's review of the pull request).

## Context

The handoff named Pagefind for Lab search and asked for its bundle to be checked against the `/lab`
budget and the CSP first.

## Decision

Keep and extend `site/src/islands/LabSearch.vue`. It filters the ledger rows on title, summary, kind
and tags at once and fetches `/search.json` (entry text) on first focus.

## Why

- **CSP.** Pagefind runs its index in WebAssembly. The site's `script-src` is `'self'` plus one
  hash; running WebAssembly needs `'wasm-unsafe-eval'`, a new allowance on every public page. Not
  worth it for a list that will hold tens of entries.
- **Budget.** `/lab` JavaScript is 34.7 KB of 42 KB gzip. Pagefind's loader and WASM would be extra
  files fetched on demand, but they are a new moving part to keep within the budget as it changes.
- **Upkeep.** A new build step and a package that ships to visitors (ADR 0002). The built-in search
  is about 30 lines with no dependency.

## Revisit when

The Lab has a few hundred entries or `/search.json` grows past roughly 300 KB gzip. Then weigh Pagefind
again, with the CSP change as an explicit cost.
