# Sprites and the room

## Characters (PixelLab → Aseprite)

Asad and Storm are PixelLab characters (Asad from `references/asad-sprite-sheet-reference.png`,
Storm from a description), animated with PixelLab and assembled in Aseprite.

- `pixellab/asad.json`, `pixellab/storm.json`: PixelLab character IDs (add animations to these).
- `pixellab/<who>/<anim>/NN.png`: raw frames as generated.
- `scripts/pl_animate.py <who> <name> <direction> <frames> <start.png|-> "<action>"`: generate one
  more animation (needs `PIXELLAB_API_TOKEN` in `platform/.env.local`; the free tier runs one job at a time).
- `scripts/pixellab_to_aseprite.py`: scales to room density (75%), shared palette per character,
  aligns animations on the feet, writes `ase/<state>.aseprite` via Aseprite, then exports.

Once you start editing an `.aseprite` file by hand in Aseprite, don't re-run
`pixellab_to_aseprite.py` for that state (it rebuilds from the raw frames); just run
`./scripts/export_ase.sh`.

| State | Source | Frames |
| --- | --- | --- |
| asad-typing | typing | 8 |
| asad-coffee | coffee | 8 |
| asad-idle | thinking | 8 |
| asad-happy | happy (when Storm is petted) | 8 |
| storm-standing | walk | 8 |
| storm-idle / storm-sit | idle | 8 |
| storm-stretch | stretch | 8 |
| storm-sleeping | sleep, curled frames 4–7 breathing | 6 |

Canvas: Asad 128×128 with feet at y=122; Storm 64×64 with feet at y=58; both face right.
Placement lives in `src/app/globals.css` (`.actor.asad`, `.actor.storm`, `.vignette ...`).
Storm's walking speed is `strideRoomPx / walkCycleMs` in `public/sprites/manifest.json`.

Facial hair rule for Asad (keep in prompts and references): a short, neat dark goatee under the
lower lip; no moustache, no cheek beard or sideburns. `scripts/paint_goatee.py` paints it into the
references before any regeneration.

## Exporting

`./scripts/export_ase.sh` exports every `art/ase/*.aseprite|*.ase` (Aseprite if installed, else
LibreSprite) and syncs frame count, size and timing into the manifest.

## Room

`scripts/room.py` → `ase/room.ase` (11 layers) → `scripts/export_room.sh`. Once `room.ase` is
painted by hand, stop running `room.py`.
