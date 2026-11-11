# Stage 4 brief: Home trust layer and interactivity (proposal, not built)

For the owner to cut and pick from. Nothing here is built. Per the handoff, the next step is static
mockups of the directions below, then your pick, then at least two revisions before any build.
Delete this file in the Stage 4 pull request.

## What Home must do

A visitor learns within a minute who this is (role), that the work is real (recent Lab entries,
credentials you supply), and where the Lab is. The room stays the one loud thing. Only facts you
have supplied: no invented numbers, handles or claims. Hero keeps "I'm a security engineer"; every
machine-read place says "Security Operations Analyst".

## Three Home directions

1. **Ledger first.** Hero and room as now. Directly under it, the three latest Lab entries as the
   same ledger rows used on `/lab`, then a short "Credentials" line (your pinned achievements) and
   the closing contact line. Closest to the Notebook direction; least new CSS.
2. **Two columns.** On desktop, the room on the left and a quiet "Now" column on the right: role,
   the latest entry, pinned credentials, handle links that render only when filled. One column on
   a phone, in the same order.
3. **Credential strip.** A single mono line under the hero (role, pinned credentials, handle links
   when supplied), then the room, then the ledger. Shortest route to proof, but the strip needs your
   copy to avoid reading as empty.

Recommendation: 1. It reuses finished pieces and keeps Home from becoming a second page of claims.

## Interactivity list to cut (each: keyboard, Reduce Motion, in budget, no new runtime dependency)

| Item | Cost to keep | Note |
| --- | --- | --- |
| Command palette (`/` or Ctrl+K) | New island, about 3 KB | Jumps to pages and entries |
| "?" shortcut overlay | Small island | Only useful if the palette stays |
| Reading aids on entries (copy heading link, progress) | Mostly exist | Cheap |
| Expandable certification cards | CSS `details` | No JavaScript |
| Pixel 404 | Art plus CSS | Needs a sprite from you |
| URL-synced Lab filters | Done in Stage 3 | Filters are links |

## Questions that block the build

- Do the vendor-naming sentences on the Experience page stay? (Handoff: ask before Stage 4 ships.)
- Which handles and numbers will you supply, and when? Fields render nothing while empty.
- Which Home direction, and which interactivity rows survive?
