"""Builds Asad's sprites from the approved sprite-sheet reference
(art/references/asad-sprite-sheet-reference.png, RGBA): each frame is cut out, its coloured halo
removed, scaled by one shared factor to the room's pixel density, snapped to one shared palette,
outlined, and aligned on its feet so animations don't jitter. Writes art/ase/asad-*.ase and exports
the sheets through LibreSprite. Run: python3 scripts/extract_reference.py"""
import colorsys, json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image
from ase import write_ase

ROOT = Path(__file__).resolve().parents[1]
SHEET = Image.open(ROOT / "art/references/asad-sprite-sheet-reference.png").convert("RGBA")
SEATED_H, STANDING_H = 66, 82  # figure heights in room pixels; rows of the reference vary in size
CANVAS, FEET = 96, 92   # 96x96 frames, feet resting on y=92
OUTLINE = (20, 15, 28, 255)

# (x0, y0, x1, y1) boxes on the reference sheet, found by connected components on its alpha.
def split(box, n):
    x0, y0, x1, y1 = box
    a = np.array(SHEET.crop(box))[..., 3] > 140
    cols = a.sum(0)
    cuts, w = [], (x1 - x0) / n
    for i in range(1, n):
        lo, hi = int(i * w - w * 0.25), int(i * w + w * 0.25)
        cuts.append(lo + int(np.argmin(cols[lo:hi])))
    edges = [0] + cuts + [x1 - x0]
    return [(x0 + edges[i], y0, x0 + edges[i + 1], y1) for i in range(n)]

IDLE = [(107, 157, 192, 253), (198, 157, 280, 253), (284, 157, 359, 253), (368, 158, 449, 253),
        (454, 157, 529, 253), (537, 158, 619, 253), (627, 157, 710, 254), (714, 158, 798, 253)]
DRINK = [(16, 558, 87, 651)] + split((89, 555, 228, 651), 2)
TYPE = split((241, 560, 437, 651), 3)
STAND = [(457, 551, 506, 660), (522, 547, 570, 660), (582, 543, 632, 660)]
PHONE = [(660, 552, 711, 660), (718, 551, 769, 660), (776, 552, 826, 660)]
WALK = [(92, 270, 154, 378), (154, 270, 215, 378), (218, 271, 276, 378), (276, 273, 334, 378),
        (332, 275, 394, 378), (397, 275, 453, 378)]

def halo(rgba):
    """Drop the saturated purple/red fringe the reference has around its outline."""
    a = rgba[..., 3] > 140
    edge = a.copy()
    for _ in range(3):
        n = edge.copy()
        n[1:] &= edge[:-1]; n[:-1] &= edge[1:]; n[:, 1:] &= edge[:, :-1]; n[:, :-1] &= edge[:, 1:]
        edge = n
    near_edge = a & ~edge
    rgb = rgba[..., :3] / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    hue = np.vectorize(lambda r, g, b: colorsys.rgb_to_hsv(r, g, b)[0])(rgb[..., 0], rgb[..., 1], rgb[..., 2])
    fringe = near_edge & (sat > 0.45) & (mx > 0.3) & ((hue > 0.7) | (hue < 0.03))
    out = rgba.copy()
    out[~a | fringe] = 0
    return out

def height(box):
    a = np.array(SHEET.crop(box))[..., 3] > 140
    ys = np.nonzero(a.any(1))[0]
    return ys[-1] - ys[0] + 1

def cut(box, scale):
    src = halo(np.array(SHEET.crop(box)))
    img = Image.fromarray(src)
    w, h = img.size
    pm = np.array(img).astype(float)
    pm[..., :3] *= pm[..., 3:4] / 255  # premultiply so edges don't pick up black
    small = Image.fromarray(pm.astype(np.uint8)).resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    s = np.array(small).astype(float)
    alpha = s[..., 3]
    s[..., :3] = np.where(alpha[..., None] > 0, s[..., :3] * 255 / np.maximum(alpha[..., None], 1), 0)
    s[..., 3] = np.where(alpha > 110, 255, 0)
    return s.clip(0, 255).astype(np.uint8)

def place(frames):
    """Align on the feet: bottom of the figure, and the horizontal centre of its lowest rows."""
    out = []
    for f in frames:
        a = f[..., 3] > 0
        ys = np.nonzero(a.any(1))[0]
        bottom = ys[-1]
        low = a[max(0, bottom - 12):bottom + 1]
        cx = np.nonzero(low.any(0))[0].mean()
        canvas = np.zeros((CANVAS, CANVAS, 4), np.uint8)
        ox, oy = int(round(CANVAS / 2 - cx)), FEET - bottom
        h, w = f.shape[:2]
        x0, y0 = max(0, ox), max(0, oy)
        x1, y1 = min(CANVAS, ox + w), min(CANVAS, oy + h)
        canvas[y0:y1, x0:x1] = f[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
        out.append(canvas)
    return out

def palette(all_frames, n=40):
    opaque = np.concatenate([f[f[..., 3] > 0][:, :3] for f in all_frames])
    strip = Image.fromarray(opaque.reshape(1, -1, 3))
    return strip.quantize(colors=n, method=Image.Quantize.MEDIANCUT)

def finish(f, pal):
    a = f[..., 3] > 0
    q = np.array(Image.fromarray(f[..., :3]).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
    out = np.zeros_like(f)
    out[a, :3] = q[a]; out[a, 3] = 255
    n = np.zeros_like(a)
    n[1:] |= a[:-1]; n[:-1] |= a[1:]; n[:, 1:] |= a[:, :-1]; n[:, :-1] |= a[:, 1:]
    out[n & ~a] = OUTLINE
    return out

def despeck(f, keep=5):
    """Remove tiny islands left over from neighbouring frames (keeps the heart and music note)."""
    a = f[..., 3] > 0
    seen = np.zeros_like(a)
    for y, x in zip(*np.nonzero(a)):
        if seen[y, x]: continue
        stack, comp = [(y, x)], []
        seen[y, x] = True
        while stack:
            cy, cx = stack.pop(); comp.append((cy, cx))
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < a.shape[0] and 0 <= nx < a.shape[1] and a[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; stack.append((ny, nx))
        if len(comp) < keep:
            for cy, cx in comp: f[cy, cx] = 0
    return f

def group(boxes, target):
    scale = target / float(np.median([height(b) for b in boxes]))
    return place([despeck(cut(b, scale)) for b in boxes])

groups = {"idle": group(IDLE, SEATED_H), "drink": group(DRINK, SEATED_H), "type": group(TYPE, SEATED_H),
          "stand": group(STAND, STANDING_H), "phone": group(PHONE, STANDING_H), "walk": group(WALK, STANDING_H)}
PAL = palette([f for fs in groups.values() for f in fs])
G = {k: [finish(f, PAL) for f in fs] for k, fs in groups.items()}

T, I, D = G["type"], G["idle"], G["drink"]
STATES = {
    # name: (frame sequence, ms per frame)
    "asad-typing": ([T[0], T[1], T[2], T[1]] * 3 + [I[0], I[0], T[0], T[2], I[4], I[4], T[1], T[0]], 150),
    "asad-coffee": ([D[0], D[0], D[1], D[2], D[2], D[2], D[2], D[1], D[0], D[0]], 260),
    "asad-idle": ([I[2]] * 6 + [I[3]] * 6 + [I[5]] * 4, 300),     # thinking, a hummed tune, "…"
    "asad-happy": ([I[1], I[1], I[7], I[7], I[7], I[7], I[1]], 220),
    "asad-stand": (G["stand"] + G["stand"][1:2], 380),
    "asad-phone": (G["phone"] + G["phone"][1:2], 420),
    "asad-walk": (G["walk"], 120),
}

if __name__ == "__main__":
    man_p = ROOT / "public/sprites/manifest.json"
    man = json.loads(man_p.read_text())
    for name, (frames, ms) in STATES.items():
        imgs = [Image.fromarray(f) for f in frames]
        write_ase(ROOT / "art/ase" / f"{name}.ase", CANVAS, CANVAS, [("Layer 1", imgs)], ms)
        imgs[0].save(ROOT / "public/sprites" / f"{name}-still.png")
        s = man["states"].setdefault(name, {"sheet": f"/sprites/{name}.png", "still": f"/sprites/{name}-still.png"})
        s.update(frames=len(frames), frameMs=ms, frameWidth=CANVAS, frameHeight=CANVAS, anchor=[48, FEET], durationsMs=[ms] * len(frames))
    man_p.write_text(json.dumps(man, indent=2) + "\n")
    subprocess.run([str(ROOT / "scripts/export_ase.sh")], check=True)
    print("built", ", ".join(f"{k}:{len(v[0])}" for k, v in STATES.items()))
