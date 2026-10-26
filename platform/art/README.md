# Sprites and the room

Everything the homepage room shows is a sprite document in `art/ase/`, exported to
`public/sprites/` (characters) and `public/room/` (room layers).

## Adding or replacing an animation (Aseprite / PixelLab / LibreSprite)

1. Save the animation as `art/ase/<name>.aseprite` (or `.ase`). The file name is the animation:
   `asad-typing`, `asad-coffee`, `asad-idle`, `asad-happy`, `asad-stand`, `asad-walk`, `asad-phone`,
   `storm-standing` (walk), `storm-idle`, `storm-stretch`, `storm-sleeping`, `storm-sit`.
   One layer or many, any frame size; all frames in a file share one size.
2. Delete any older file with the same name (`.ase` vs `.aseprite`).
3. Run `./scripts/export_ase.sh` from `platform/`. It uses Aseprite if installed, otherwise
   LibreSprite, and updates `public/sprites/manifest.json` (frames, size, timing) from the file.
4. Hard-refresh the site.

Placement in the room is in `src/app/globals.css` (`.actor.asad`, `.actor.storm`): sizes are in room
pixels (the room is 384×216). Asad's frames are 96×96 with feet at y=92; Storm's are 64×64 with feet
at y=58. If new frames use another size or foot line, tell Claude, or update those two rules.

Timing: the page plays each animation at its average frame duration. Per-frame durations set in
Aseprite are recorded in the manifest but not yet played individually.

Storm's walk speed is tied to his stride (`strideRoomPx` / `walkCycleMs` in the manifest), so his
paws don't slide. If a new walk cycle covers a different distance per loop, update those two values.

## Where the current art comes from

- Room: `scripts/room.py` → `art/ase/room.ase` (11 layers) → `scripts/export_room.sh`.
  Once you paint on `room.ase` by hand, stop running `room.py`; it would overwrite your edits.
- Storm: `scripts/draw_characters.py` (pixel rig). Same caveat for `storm-*.ase`.
- Asad (placeholder until the PixelLab/Aseprite set lands): frames taken from
  `references/asad-sprite-sheet-reference.png` by `scripts/extract_reference.py`.
