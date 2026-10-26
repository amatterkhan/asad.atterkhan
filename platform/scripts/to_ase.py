"""Writes each generated sprite sheet as an editable LibreSprite/Aseprite document
(art/ase/<state>.ase): one RGBA frame per animation frame, frame timing preserved, lossless.
Edit in LibreSprite, then run scripts/export_ase.sh to send the art back to the site."""
import json, struct, zlib
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
man = json.loads((ROOT / "public/sprites/manifest.json").read_text())

def chunk(t, data): return struct.pack("<IH", len(data) + 6, t) + data
def string(s): b = s.encode(); return struct.pack("<H", len(b)) + b

def write(path, frames, ms):
    body = b""
    for i, f in enumerate(frames):
        chunks = b""
        if i == 0:
            chunks += chunk(0x2004, struct.pack("<HHHHHHB3x", 3, 0, 0, 0, 0, 0, 255) + string("Layer 1"))
        chunks += chunk(0x2005, struct.pack("<HhhBH7xHH", 0, 0, 0, 255, 2, 128, 128) + zlib.compress(f.tobytes()))
        n = 2 if i == 0 else 1
        body += struct.pack("<IHHHHI", 16 + len(chunks), 0xF1FA, n, ms, 0, n) + chunks
    head = struct.pack("<IHHHHHIHIIBBBBHBBhhHH", 128 + len(body), 0xA5E0, len(frames), 128, 128, 32, 1, ms, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 16, 16)
    path.write_bytes(head + b"\0" * (128 - len(head)) + body)

for name, st in man["states"].items():
    sheet = Image.open(ROOT / "public/sprites" / f"{name}.png").convert("RGBA")
    frames = [sheet.crop((i * 128, 0, i * 128 + 128, 128)) for i in range(st["frames"])]
    write(ROOT / "art/ase" / f"{name}.ase", frames, st["frameMs"])
    print(name, len(frames), "frames")
