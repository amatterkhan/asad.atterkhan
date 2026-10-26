"""QROVER, the desk robot: one PixelLab sprite (art/pixellab/robot/robot.png, no QR code) animated
here into an idle/drive loop (body bob, wheel spokes turning, camera head panning, antenna blink),
built as art/ase/robot-idle.aseprite with Aseprite and exported with the other sprites.
Run: python3 scripts/robot.py"""
import json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art/pixellab/robot/robot.png"
OUT = ROOT / "art/pixellab/build/robot-idle"
SIZE, FEET = 48, 44

def trimmed():
    a = np.array(Image.open(SRC).convert("RGBA"))
    a[a[..., 3] < 128] = 0; a[a[..., 3] >= 128, 3] = 255
    rgb = a[..., :3].astype(int)
    ys = np.nonzero(a[..., 3].any(1))[0]
    pale = (rgb.min(-1) > 150) & (rgb[..., 2] >= rgb[..., 0])     # the generated ground shadow
    a[ys[-1] - 3:][pale[ys[-1] - 3:]] = 0
    im = Image.fromarray(a); im = im.crop(im.getbbox())
    s = 28 / im.height                                             # desk-sized, same area filter as the characters
    p = np.array(im).astype(float); p[..., :3] *= p[..., 3:4] / 255
    sm = np.array(Image.fromarray(p.astype(np.uint8)).resize((round(im.width * s), 28), Image.LANCZOS)).astype(float)
    al = sm[..., 3]
    sm[..., :3] = np.where(al[..., None] > 0, sm[..., :3] * 255 / np.maximum(al[..., None], 1), 0)
    sm[..., 3] = np.where(al > 110, 255, 0)
    return sm.clip(0, 255).astype(np.uint8)

def frames():
    base = trimmed()
    h, w = base.shape[:2]
    rgb = base[..., :3].astype(int)
    dark = (base[..., 3] > 0) & (rgb.sum(-1) < 150)
    # wheels: dark pixels in the bottom third; spokes = the lighter pixels inside them
    wheel_rows = slice(int(h * 0.62), h)
    red = (base[..., 3] > 0) & (rgb[..., 0] > 170) & (rgb[..., 1] < 90) & (rgb[..., 2] < 110)
    head = slice(0, int(h * 0.38))
    out = []
    for i in range(8):
        f = base.copy()
        if i % 2:  # one-pixel bob on the suspension (everything above the wheels)
            top = f[:int(h * 0.62)].copy(); f[:int(h * 0.62)] = 0; f[1:int(h * 0.62) + 1] = np.where(top[..., 3:4] > 0, top, f[1:int(h * 0.62) + 1])
        pan = (0, 1, 1, 0, 0, -1, -1, 0)[i]  # camera head looks around
        if pan:
            hd = f[head].copy(); f[head] = 0
            f[head] = np.roll(hd, pan, axis=1)
        wr = f[wheel_rows]
        spokes = dark[wheel_rows] & ((np.add.outer(np.arange(wr.shape[0]), np.arange(w)) + i) % 4 == 0)
        wr[spokes, :3] = (90, 92, 110)
        if i in (2, 3, 6):
            f[red & (f[..., 3] > 0), :3] = (110, 40, 50)  # antenna LED blinks
        canvas = np.zeros((SIZE, SIZE, 4), np.uint8)
        ox, oy = (SIZE - w) // 2, FEET - h
        canvas[oy:oy + h, ox:ox + w] = np.where(f[..., 3:4] > 0, f, canvas[oy:oy + h, ox:ox + w])
        out.append(canvas)
    return out

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(frames()):
        Image.fromarray(f).save(OUT / f"{i:02d}.png")
    Image.open(OUT / "00.png").save(ROOT / "public/sprites/robot-idle-still.png")
    subprocess.run(["/Applications/Aseprite.app/Contents/MacOS/aseprite", "-b", "--script-param", f"dir={OUT}",
                    "--script-param", f"out={ROOT / 'art/ase/robot-idle.aseprite'}", "--script-param", "ms=150",
                    "--script", str(ROOT / "scripts/frames_to_aseprite.lua")], check=True, capture_output=True)
    man_p = ROOT / "public/sprites/manifest.json"
    man = json.loads(man_p.read_text())
    man["states"].setdefault("robot-idle", {"sheet": "/sprites/robot-idle.png", "still": "/sprites/robot-idle-still.png"})["anchor"] = [SIZE // 2, FEET]
    man_p.write_text(json.dumps(man, indent=2) + "\n")
    subprocess.run([str(ROOT / "scripts/export_ase.sh")], check=True)
    print("robot-idle: 8 frames")
