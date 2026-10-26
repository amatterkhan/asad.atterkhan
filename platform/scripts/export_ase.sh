#!/bin/sh
# Exports art/ase/*.ase (edited in LibreSprite) to public/sprites/<state>.png horizontal sheets,
# updates frame counts in manifest.json, and bumps the cache-buster version.
set -e
cd "$(dirname "$0")/.."
LS=/Applications/libresprite.app/Contents/MacOS/libresprite
for f in art/ase/*.ase; do
  [ "$(basename "$f")" = room.ase ] && continue
  n=$(basename "$f" .ase)
  "$LS" -b "$f" --sheet "public/sprites/$n.png" --sheet-type horizontal >/dev/null 2>&1
done
python3 - <<'PY'
import json
from pathlib import Path
from PIL import Image
p = Path("public/sprites/manifest.json"); m = json.loads(p.read_text())
for n, s in m["states"].items():
    s["frames"] = Image.open(f"public/sprites/{n}.png").width // s["frameWidth"]
    s["durationsMs"] = [s["frameMs"]] * s["frames"]
m["version"] += 1
p.write_text(json.dumps(m, indent=2) + "\n")
PY
