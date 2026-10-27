# Art pipeline

Source art and the scripts that turn it into the site's sprites, room layers and outfits. Run
everything from this folder; outputs are written to `../site/public/` (`sprites/`, `room/`,
`art/outfits/`) and the outfit index is mirrored to `../api/internal/content/data/outfits.json`.

```sh
python3 -m pip install -r requirements.txt   # Pillow, numpy
```

Needs Aseprite or LibreSprite for exporting.

Layout: `ase/` the Aseprite documents (the source of truth), `pixellab/` the robot and room base
images and the PixelLab character IDs, `previews/` the outfit contact sheet, `scripts/` the tools.
`pixellab/build/` is regenerated intermediate output and is not committed.

# Sprites and the room

## Characters

The `.aseprite` files in `ase/` are the source of truth: one document per animation state, named
after the state (`asad-typing.aseprite` is the state `asad-typing`). Edit them in Aseprite, then run
`./scripts/export_ase.sh`. The characters were originally generated with PixelLab and assembled
into these documents; the generation tooling and raw frames were removed (they are in git history,
`git log -- art/pixellab`). `pixellab/asad.json`, `storm.json` and `storm-curled.json` keep the
PixelLab character IDs in case an animation is ever generated again.

| State | Frames |
| --- | --- |
| asad-typing, asad-coffee, asad-idle, asad-happy (when Storm is petted) | 8 |
| asad-stretch (arms up, rarely), asad-look (a glance toward the window) | 8 |
| storm-standing (walk), storm-idle, storm-stretch | 8 |
| storm-sleeping, storm-nap (the small one on the Lab chair), storm-dream | 6–14 |
| robot-idle | see `ase/` |

Canvas: Asad 128×128 with feet at y=122; Storm 64×64 with feet at y=58; both face right.
Placement lives in `site/src/styles/app.css` (`.actor.asad`, `.actor.storm`, `.vignette ...`).
Storm's walking speed is `strideRoomPx / walkCycleMs` in `site/public/sprites/manifest.json`.

Facial hair rule for Asad: a short, neat dark goatee under the lower lip; no moustache, no cheek
beard or sideburns. (The PixelLab character's own prompt still mentions a faint moustache: say "no
mustache" in every action and check each frame.)

### How asad-stretch and asad-look were made (October 2026)

With the PixelLab client and `pl_animate.py` from `git show 79e2ec8^:art/scripts/`, animating
character `5c4707d2…` (direction `south`, 8 frames) from the original raw typing frame
(`git show 79e2ec8^:art/pixellab/asad/typing/00.png`) as the custom start frame, so the pose,
laptop and scale match his other states. Each animation cost about a cent of PixelLab credit. Then:
two motion marks painted out of the stretch's frame 2; frames scaled ×0.75 and registered on frame
0's feet exactly as the original converter did (it reproduces the shipped typing frame's silhouette
pixel for pixel); colours snapped to the 64 colours of Asad's existing sheets; documents built with
`scripts/frames_to_aseprite.lua` (which now takes per-frame `durations`); `export_ase.sh`.

## Making a reference image

References are built from the documents, not stored. Export one with the Aseprite CLI, for example
a frame strip or a single frame:

```sh
aseprite -b ase/asad-typing.aseprite --sheet /tmp/asad-typing.png --sheet-type horizontal
aseprite -b ase/asad-typing.aseprite --frame-range 0,0 --save-as /tmp/asad-typing-0.png
```

## Outfits

Asad's clothes are swappable without touching the character. `site/public/sprites/asad-*.png` (exported
from `ase/`) is the `classic` outfit; `scripts/outfits.py` copies it to `site/public/art/outfits/classic/`
and builds every other `site/public/art/outfits/<id>/` by recolouring only the hoodie pixels (a fixed
region per animation, the face and goatee protected, shades mapped by brightness onto the outfit's
ramp, drawstrings repainted). Pose, hair, glasses, goatee, frames and timing stay identical. Where a
pose moves the sleeves out of that region (the stretch's raised arms), `FRAME_REGIONS` adds polygons
for those frames, traced beside the hair, never over it. The hoodie's brightness range is measured
on the original four states only, so a new state never shifts existing outfits.

`labcoat/` is the Steins Gate lab coat: `"hidden": true` keeps it out of `index.json` (so the admin
wardrobe and the API never offer it), and `"coat": true` adds the coat's tail, spread on the floor
behind him (`coat_tail`, drawn only on transparent pixels, so it sits behind him). The room swaps it in
while the Steins Gate worldline lasts; the saved outfit never changes.

To add one: make `site/public/art/outfits/<id>/outfit.json` (copy `forest/`; `palette.hoodie` is five
colours from shadow to highlight, `rim` tints the lamp-lit edge, `drawstring` is light/dark), run
`python3 scripts/outfits.py --preview`, check `art/previews/outfits.png`, commit the folder. The
owner picks the live outfit in `/admin` → Wardrobe (`siteSettings/wardrobe`). Re-run the script
after any re-export of Asad's sheets so every outfit follows.

## Exporting

`./scripts/export_ase.sh` exports every `ase/*.aseprite|*.ase` (Aseprite if installed, else
LibreSprite) and syncs frame count, size and timing into the manifest.

## Room

`scripts/room.py` → `ase/room.ase` (11 layers) → `scripts/export_room.sh`. Once `room.ase` is
painted by hand, stop running `room.py`.
