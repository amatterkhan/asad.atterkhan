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
| asad-standup (played once; backwards to sit down), asad-walk-left, asad-walk-right | 8 |
| asad-stand (standing still, breathing) | 4 |
| asad-window (standing at the window, his back to us) | 6 |
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

### How the walk to the window was made (October 2026)

Same client, same character. `asad-standup` is animated `south` from the raw typing frame ("lifts the
open laptop with both hands and sets it down flat on the floor just in front of his knees, then …
stands up"; an earlier take that closed the laptop morphed it mid-air); the walks are `west` and
`east` and the window is `north`, each from the character's own rotation, so the two walks are
drawn separately rather than mirrored (his ponytail stays on its side). About 10 cents in all. The
stand-up was scaled ×0.75 like the seated states; the others at whatever scale makes his standing
height match the stand-up's last frame (about ×0.82), centred where the stand-up leaves him, feet on
y 122. Both walks had a moustache: on every frame, the first dark stroke under his eyes near the
front of his face (between nose and mouth) was refilled with the skin beside it. `asad-stand` is
the stand-up's last frame without the laptop, breathing by hand (everything above his waistband one
pixel lower on two of its four frames); PixelLab's own idle for it opened his mouth and pointed.
Colours snapped to his palette as above.

`site/public/sprites/laptop-floor.png` is the laptop he leaves on the rug, cut from the stand-up's
last frame (frame box 71,104 → room 137,182). In the room it shows while he's away from it.
His walking speed (37 px per walk cycle), the window spot and the floor he may follow the pointer
along are constants in `Room.vue`.

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
for those frames, traced beside the hair, never over it. Standing (the stand-up from frame 2, standing
still, the walks, the window) his body moves too much for one polygon and his hair shares the hoodie's colours,
so `BANDED` frames get a region found from the frame itself: a band from his neck (the narrowest row
under his head) to the waistband (where the jeans take over), with the laptop on the rug kept out.
The hoodie's brightness range is measured on the original four states only, so a new state never
shifts existing outfits.

`labcoat/` is the Steins Gate lab coat. `"hidden": true` keeps it out of `index.json`, so the admin
wardrobe and the API never offer it; the room swaps it in while the Steins Gate worldline lasts and the
saved outfit never changes. It is `"prebuilt"`: drawn, not recoloured. Its source is
`ase/labcoat/<state>.aseprite` (exported by `export_ase.sh`), one document for each of Asad's states
with the same frames and timing. Made October 2026 with PixelLab's *Edit images* on his real frames
("an open white lab coat with collar and lapels over his dark tee"), one request per state so its
frames match; each result was aligned back onto the original frame (PixelLab redraws a few pixels off)
and only clothing was taken from it (hoodie pixels, the hood around his neck, and the coat's tail on
the floor, kept still across each animation); face, glasses, goatee, hair, hands, laptop, mug and
jeans are the original pixels. About 56 cents of PixelLab credit. The standing poses were added the
same way, except that the coat's hem below his hoodie is taken frame by frame (it swings as he walks).

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
