#!/bin/sh
# Exports every layer of art/ase/room.ase (edit it in LibreSprite) to site/public/room/<layer>.png.
set -e
cd "$(dirname "$0")/.."
LS=/Applications/libresprite.app/Contents/MacOS/libresprite
mkdir -p ../site/public/room
for layer in sky-night stars-a stars-b sky-day clouds room sunbeam night dark glow bulb; do
  "$LS" -b --layer "$layer" ase/room.ase --save-as "../site/public/room/$layer.png" >/dev/null 2>&1
done
