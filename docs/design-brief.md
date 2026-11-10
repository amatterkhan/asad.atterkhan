# Design brief

Status: draft for Stage 2 ([#50](https://github.com/amatterkhan/asad.atterkhan/issues/50)). The chosen direction will be recorded as an ADR.

## What the site is for

A hiring manager, a bug bounty triager or another security person lands on one Lab entry from a link. Within a minute they should be able to tell who wrote it, that the work is real, and where the rest of it is. The Lab is the product; every other page supports it.

## Fixed

These are the owner's identity and do not change:

- Serif display headings and the mint accent.
- The pixel room, Worldlines, Thoughts, Storm, the motto and the page subtitles.
- The night and day palettes, which are sampled from the room.
- The terminal layer (Departure Mono, paths, prompts, key hints) lives in the chrome only: navigation, filters, metadata and the command palette. It never styles article text.

## Problems in the current design

- The Lab index is built for thumbnails. With no thumbnail an entry is a large empty box, so every post needs art before it looks finished.
- An entry's date, section and reading time are small and scattered. A reader scanning for "what has this person done" has to open each card.
- The article page has no table of contents, no updated date and no place for disclosure status.
- Uppercase mono labels sit above most headings, and Workbench projects are numbered although they are not a sequence. Both are decoration.
- 56 controls are smaller than 44px on touch widths (Stage 0 baseline).
- One 1,323-line stylesheet holds the tokens, the room, the admin console and every page.

## Principles

1. **An entry must look finished with text alone.** Art is optional.
2. **Scanning comes first on the index, reading comes first on the entry.** Dates and sections line up in columns; the article column is 60 to 70 characters.
3. **One loud thing per page.** On Home it is the room. On the Lab it is the list of work. On an entry it is the title.
4. **Structure carries information or it goes.** No label above a heading unless it tells the reader where they are.
5. **Everything works at 390px with a thumb.** Controls are at least 44px; filters and search are reachable without scrolling back up.
6. **Nothing here needs upkeep.** System serif and sans, one self-hosted mono font, no web font service, no new runtime dependency.

## Tokens that stay

| Role | Night | Day |
| --- | --- | --- |
| Background | `#12141d` | `#f5efe2` |
| Raised surface | `#1a1d29` | `#ece3d1` |
| Text | `#e4ddd0` | `#2f2a24` |
| Heading text | `#fbf5ea` | `#1d1915` |
| Muted text | `#a69f93` | `#6e6558` |
| Rule | `#2d303d` | `#ddd2bd` |
| Accent (mint) | `#9ed6b4` | `#2f7a5c` |
| Link (teal) | `#7cc0d4` | `#23698a` |
| Tag (peach) | `#c9b08a` | `#7d6340` |

Type: Iowan Old Style and its fallbacks for display, the system sans for interface text, Departure Mono for chrome.

## Directions

Three directions were mocked up for the Lab index and an entry page. Home keeps its layout until Stage 4.

- **A, Notebook.** The index is a dated ledger; entries are set in serif with the contents in the margin. The quietest option and the cheapest to keep up.
- **B, Console.** The chrome becomes a prompt bar, a command-style filter and a status bar that sits at the thumb on a phone. The most terminal.
- **C, Pinboard.** Pixel-edged cards with thumbnails and a file card at the top of each entry. The most visual; each entry wants art.
