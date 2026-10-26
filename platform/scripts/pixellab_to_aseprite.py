"""PixelLab frames (art/pixellab/<who>/<anim>/NN.png) -> art/ase/<state>.aseprite -> site sheets.
Scales each character to the room's pixel density with an area filter (stable between frames),
snaps all of a character's frames to one shared palette, and puts every animation on a common
square canvas registered on the first frame's feet, so switching animations doesn't jump.
Aseprite builds the documents (scripts/frames_to_aseprite.lua); export_ase.sh makes the sheets.
Run: python3 scripts/pixellab_to_aseprite.py"""
import json, shutil, subprocess
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC, BUILD, ASE = ROOT / "art/pixellab", ROOT / "art/pixellab/build", ROOT / "art/ase"
ASEPRITE = "/Applications/Aseprite.app/Contents/MacOS/aseprite"
SCALE = 0.75

# state: (character, source animation, ms per frame, frame indices or None for all)
STATES = {
    "asad-typing": ("asad", "typing", 140, None),
    "asad-coffee": ("asad", "coffee", 200, None),
    "asad-idle": ("asad", "thinking", 220, None),
    "asad-happy": ("asad", "happy", 170, [2, 3, 4, 5, 6, 7]),  # frames 0-1 had a moustache
    "storm-standing": ("storm", "walk", 110, None),
    "storm-idle": ("storm", "idle", 180, None),
    "storm-sit": ("storm", "idle", 220, None),
    "storm-stretch": ("storm", "stretch", 140, None),
    "storm-sleeping": ("storm-curled", "sleep-ball", 300, None),          # curled into a ball (character state)
    "storm-dream": ("storm", "sleep-dream", 240, list(range(2, 16))),   # kneading paws, head shift
    "storm-nap": ("storm-curled", "sleep-ball", 300, None),               # small, for the Lab chair
}
CANVAS = {"asad": (128, 122), "storm": (64, 58), "storm-nap": (40, 36)}  # square size, feet line
SCALES = {"storm-nap": 0.45}  # per-state scale override

def scale(im, s_=None):
    a = np.array(im).astype(float)
    a[..., :3] *= a[..., 3:4] / 255
    k = s_ or SCALE
    w, h = round(im.width * k), round(im.height * k)
    s = np.array(Image.fromarray(a.astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(float)
    al = s[..., 3]
    s[..., :3] = np.where(al[..., None] > 0, s[..., :3] * 255 / np.maximum(al[..., None], 1), 0)
    s[..., 3] = np.where(al > 110, 255, 0)
    return s.clip(0, 255).astype(np.uint8)

def feet(a):
    m = a[..., 3] > 0
    ys = np.nonzero(m.any(1))[0]
    bottom = ys[-1]
    low = m[max(0, bottom - 6):bottom + 1]
    return np.nonzero(low.any(0))[0].mean(), bottom

def build():
    shutil.rmtree(BUILD, ignore_errors=True)
    by_char = {}
    for state, (who, anim, ms, idx) in STATES.items():
        files = sorted((SRC / who / anim).glob("[0-9][0-9].png"))
        frames = [scale(Image.open(f).convert("RGBA"), SCALES.get(state)) for f in files]
        if idx: frames = [frames[i] for i in idx]
        by_char.setdefault(who.split("-")[0], []).append((state, frames, ms))
    for who, items in by_char.items():
        opaque = np.concatenate([f[f[..., 3] > 0][:, :3] for _, fs, _ in items for f in fs])
        pal = Image.fromarray(opaque.reshape(1, -1, 3)).quantize(colors=64, method=Image.Quantize.MEDIANCUT)
        for state, frames, ms in items:
            size, foot = CANVAS.get(state, CANVAS[who])
            cx, bottom = feet(frames[0])
            ox, oy = int(round(size / 2 - cx)), foot - bottom
            out = BUILD / state
            out.mkdir(parents=True)
            for i, f in enumerate(frames):
                q = np.array(Image.fromarray(f[..., :3]).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
                canvas = np.zeros((size, size, 4), np.uint8)
                h, w = f.shape[:2]
                x0, y0 = max(0, ox), max(0, oy)
                x1, y1 = min(size, ox + w), min(size, oy + h)
                src = f[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
                qs = q[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
                m = src[..., 3] > 0
                canvas[y0:y1, x0:x1][m] = np.concatenate([qs[m], np.full((m.sum(), 1), 255, np.uint8)], 1)
                Image.fromarray(canvas).save(out / f"{i:02d}.png")
            for old in (ASE / f"{state}.ase", ASE / f"{state}.aseprite"):
                old.unlink(missing_ok=True)
            subprocess.run([ASEPRITE, "-b", "--script-param", f"dir={out}", "--script-param", f"out={ASE / (state + '.aseprite')}",
                            "--script-param", f"ms={ms}", "--script", str(ROOT / "scripts/frames_to_aseprite.lua")],
                           check=True, capture_output=True)
            Image.open(out / "00.png").save(ROOT / "public/sprites" / f"{state}-still.png")
            print(state, len(frames), "frames ->", f"art/ase/{state}.aseprite")

if __name__ == "__main__":
    build()
    man_p = ROOT / "public/sprites/manifest.json"
    man = json.loads(man_p.read_text())
    for stale in ("asad-stand", "asad-phone", "asad-walk"):
        man["states"].pop(stale, None)
        for f in (ASE / f"{stale}.ase", ROOT / f"public/sprites/{stale}.png", ROOT / f"public/sprites/{stale}-still.png"):
            f.unlink(missing_ok=True)
    for state, (who, *_rest) in STATES.items():
        size, foot = CANVAS.get(state, CANVAS[who.split("-")[0]])
        man["states"].setdefault(state, {"sheet": f"/sprites/{state}.png", "still": f"/sprites/{state}-still.png"})["anchor"] = [size // 2, foot]
    man["strideRoomPx"] = 9
    man["walkCycleMs"] = 8 * STATES["storm-standing"][2]
    man_p.write_text(json.dumps(man, indent=2) + "\n")
    subprocess.run([str(ROOT / "scripts/export_ase.sh")], check=True)
