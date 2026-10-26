"""Draws Asad in LibreSprite. For each animation it creates a blank layered document
(outline, legs, body, laptop, face, hair, arm, fx), then runs a LibreSprite script that paints every
pixel from scripts/asad_pixels.py into its layer and frame and saves art/ase/<anim>.ase.
Those documents are the source of truth: open them in LibreSprite to keep drawing, then run
scripts/export_ase.sh. Re-running this script redraws them from asad_pixels.py.
Run: python3 scripts/build_asad.py"""
import json, subprocess, tempfile
from pathlib import Path
from PIL import Image
import asad_pixels as A
from ase import write_ase

ROOT = Path(__file__).resolve().parents[1]
LS = "/Applications/libresprite.app/Contents/MacOS/libresprite"
LAYERS = ["outline"] + A.LAYERS

def rgb(key):
    h = A.PAL[key]
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]

def outline(fr):
    solid = {p for L in A.LAYERS for p in fr[L] if 0 <= p[0] < A.SIZE and 0 <= p[1] < A.SIZE}
    ring = set()
    for (x, y) in solid:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in solid and 0 <= q[0] < A.SIZE and 0 <= q[1] < A.SIZE:
                ring.add(q)
    return {p: "K" for p in ring}

DRAW_JS = """
var data = %s;
var s = app.activeSprite, col = app.pixelColor;
for (var f = 0; f < data.length; f++) {
  for (var li = 0; li < data[f].length; li++) {
    var img = s.layer(li).cel(f).image, px = data[f][li];
    for (var i = 0; i < px.length; i++) img.putPixel(px[i][0], px[i][1], col.rgba(px[i][2], px[i][3], px[i][4], 255));
  }
}
s.commit && s.commit();
s.saveAs("%s");
console.log("drew " + data.length + " frames");
"""

def build(name, frames, ms):
    blank = Image.new("RGBA", (A.SIZE, A.SIZE))
    data = []
    for fr in frames:
        layers = [outline(fr)] + [fr[L] for L in A.LAYERS]
        data.append([[[x, y] + rgb(c) for (x, y), c in L.items() if 0 <= x < A.SIZE and 0 <= y < A.SIZE] for L in layers])
    out = ROOT / "art/ase" / f"{name}.ase"
    with tempfile.TemporaryDirectory() as d:
        tpl, js = Path(d) / "blank.ase", Path(d) / "draw.js"
        write_ase(tpl, A.SIZE, A.SIZE, [(L, [blank] * len(frames)) for L in LAYERS], ms)
        js.write_text(DRAW_JS % (json.dumps(data), out))
        r = subprocess.run([LS, "-b", str(tpl), "--script", str(js)], capture_output=True, text=True)
        if "drew" not in r.stdout + r.stderr:
            raise SystemExit(f"LibreSprite failed for {name}:\n{r.stdout}\n{r.stderr}")
    return len(frames)

if __name__ == "__main__":
    man_p = ROOT / "public/sprites/manifest.json"
    man = json.loads(man_p.read_text())
    for stale in ("asad-stand", "asad-phone", "asad-walk"):
        man["states"].pop(stale, None)
        for f in (ROOT / "art/ase" / f"{stale}.ase", ROOT / "public/sprites" / f"{stale}.png", ROOT / "public/sprites" / f"{stale}-still.png"):
            f.unlink(missing_ok=True)
    for name, (frames, ms) in A.ANIMS.items():
        n = build(name, frames, ms)
        s = man["states"].setdefault(name, {"sheet": f"/sprites/{name}.png", "still": f"/sprites/{name}-still.png"})
        s.update(frames=n, frameMs=ms, frameWidth=A.SIZE, frameHeight=A.SIZE, anchor=[A.SIZE // 2, A.FEET], durationsMs=[ms] * n)
        print(name, n, "frames drawn in LibreSprite")
    man_p.write_text(json.dumps(man, indent=2) + "\n")
    subprocess.run([str(ROOT / "scripts/export_ase.sh")], check=True)
    for name in A.ANIMS:  # stills = first frame of each exported sheet
        Image.open(ROOT / "public/sprites" / f"{name}.png").crop((0, 0, A.SIZE, A.SIZE)).save(ROOT / "public/sprites" / f"{name}-still.png")
