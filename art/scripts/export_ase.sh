#!/bin/sh
# Exports every sprite document in art/ase/ (*.ase or *.aseprite, e.g. from Aseprite/PixelLab or
# LibreSprite) to site/public/sprites/<name>.png as a horizontal sheet, and syncs site/public/sprites/manifest.json
# (frame count, frame size, per-frame durations) from the document itself. The file name is the
# animation name: asad-typing.aseprite -> state "asad-typing". room.ase is handled by export_room.sh.
set -e
cd "$(dirname "$0")/.."
if [ -x /Applications/Aseprite.app/Contents/MacOS/aseprite ]; then
  TOOL=/Applications/Aseprite.app/Contents/MacOS/aseprite
else
  TOOL=/Applications/libresprite.app/Contents/MacOS/libresprite
fi
mkdir -p .sprite-data
for f in ase/*.ase ase/*.aseprite; do
  [ -e "$f" ] || continue
  n=$(basename "$f"); n=${n%.*}
  [ "$n" = room ] && continue
  "$TOOL" -b "$f" --sheet "../site/public/sprites/$n.png" --sheet-type horizontal \
    --data ".sprite-data/$n.json" --format json-array >/dev/null 2>&1
done
# Prebuilt outfits (drawn, not recoloured): ase/<outfit>/<state>.aseprite -> site/public/art/outfits/<outfit>/
for f in ase/*/*.aseprite; do
  [ -e "$f" ] || continue
  o=$(basename "$(dirname "$f")"); n=$(basename "$f"); n=${n%.*}
  "$TOOL" -b "$f" --sheet "../site/public/art/outfits/$o/$n.png" --sheet-type horizontal >/dev/null 2>&1
done
python3 - <<'PY'
import json
from pathlib import Path
p = Path("../site/public/sprites/manifest.json"); m = json.loads(p.read_text())
for d in sorted(Path(".sprite-data").glob("*.json")):
    n = d.stem
    frames = json.loads(d.read_text())["frames"]
    w, h = frames[0]["frame"]["w"], frames[0]["frame"]["h"]
    durs = [f.get("duration", 100) for f in frames]
    s = m["states"].setdefault(n, {"sheet": f"/sprites/{n}.png", "still": f"/sprites/{n}-still.png"})
    s.update(frames=len(frames), frameWidth=w, frameHeight=h, durationsMs=durs,
             frameMs=round(sum(durs) / len(durs)))
    s.setdefault("anchor", [w // 2, h - 4])
m["version"] += 1
p.write_text(json.dumps(m, indent=2) + "\n")
PY
rm -rf .sprite-data
