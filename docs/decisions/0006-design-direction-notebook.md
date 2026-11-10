# 0006: Design direction is "Notebook"

Date: 2026-11-11. Status: accepted by the owner.

## Context

Stage 2 needed one visual direction for the Lab index and entry pages. Three were mocked up from [the design brief](../design-brief.md): Notebook (a dated ledger, serif entries), Console (prompt bar, command filter, status bar) and Pinboard (thumbnail cards, file card). The owner's identity is fixed: serif display headings, mint accent, the room, and a terminal layer in the chrome only.

## Decision

Notebook.

- The Lab index is a ledger: date, title and one-line summary, section and reading time, in columns, grouped by year. The whole row is the link.
- Entries are set in the serif at 60 to 70 characters, with the contents in the right margin on wide screens and in a collapsible block on narrow ones.
- Mono type appears in the path line, filters, search, metadata, tags and code only.
- Thumbnails are optional and never needed for an entry to look finished.

## Why

- An entry is complete with text alone, so publishing needs no art. That matters most with one maintainer.
- Dates and sections line up, so a visitor can judge the body of work without opening entries.
- It has the fewest parts: no status bar, no card grid, no thumbnail pipeline.

## Consequences

- The current Lab map of section cards and the thumbnail shelf go away in Stage 3. Sections become filters.
- Existing thumbnails can still appear inside an entry as its first figure.
- Console's bottom bar for phones was not adopted. It can be revisited in Stage 4 with the command palette.
