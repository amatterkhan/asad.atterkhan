"""Deterministic frame generator. Derives smoother animation sequences from the approved
128x128 source frames (art/source) using only region transforms: row stretch (breathing, bobbing),
row shear (tail sway) and region lifts (coffee sip). No new character art is invented.
Run: python3 scripts/animate_sprites.py   (needs Pillow + numpy)"""
from pathlib import Path
from PIL import Image
import numpy as np, json, math

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art/source"
OUT = ROOT / "public/sprites"

def load(n): return np.array(Image.open(SRC / f"{n}.png").convert("RGBA"))

def stretch(a, y0, y1, new_y0):
    """Remap rows [y0,y1) onto [new_y0,y1): bottom stays put, top moves. Nearest-neighbour."""
    o = a.copy()
    h_old, h_new = y1 - y0, y1 - new_y0
    for y in range(min(y0, new_y0), y1):
        o[y] = 0
    for y in range(new_y0, y1):
        o[y] = a[min(y1 - 1, y0 + int((y - new_y0) * h_old / h_new))]
    return o

def shear(a, box, k, base_y, top_y):
    """Shift rows of box horizontally, 0 at base_y growing to k at top_y (tail/ponytail sway)."""
    x0, y0, x1, y1 = box
    o = a.copy(); o[y0:y1, x0:x1] = 0
    for y in range(y0, y1):
        t = max(0.0, min(1.0, (base_y - y) / max(1, base_y - top_y))) ** 1.4
        dx = int(round(k * t))
        row = a[y, x0:x1]
        lo, hi = max(0, x0 + dx), min(128, x1 + dx)
        o[y, lo:hi] = np.where(row[lo - x0 - dx: hi - x0 - dx, 3:4] > 0, row[lo - x0 - dx: hi - x0 - dx], o[y, lo:hi])
    return o

def lift(a, box, dx, dy):
    x0, y0, x1, y1 = box
    o = a.copy(); piece = a[y0:y1, x0:x1].copy(); o[y0:y1, x0:x1] = 0
    ny0, nx0 = y0 + dy, x0 + dx
    reg = o[ny0:ny0 + (y1 - y0), nx0:nx0 + (x1 - x0)]
    o[ny0:ny0 + (y1 - y0), nx0:nx0 + (x1 - x0)] = np.where(piece[..., 3:4] > 0, piece, reg)
    return o

def top(a): return int(np.argmax(a[..., 3].max(axis=1) > 0))

# ---- Storm -------------------------------------------------------------
st0, st1 = load("storm-standing-0"), load("storm-standing-1")
TAIL = (92, 18, 128, 74)
def bob(a, n): return stretch(a, top(a), 100, top(a) - n) if n else a
# 8-frame walk: the two approved leg poses, with a body bob and a sine tail sway between them.
storm_walk = [bob(shear(f, TAIL, round(3 * math.sin(i * math.pi / 4)), 70, 24), b)
              for i, (f, b) in enumerate(zip([st0, st0, st1, st1] * 2, [0, 1, 0, 1] * 2))]

def colstretch(a, d_fn, floor=100):
    """Per-column stretch: column x keeps its paws (rows >= floor) but its top moves by d_fn(x)."""
    o = a.copy()
    for x in range(128):
        col = a[:floor, x]; ys = np.nonzero(col[:, 3])[0]
        if not len(ys): continue
        t0 = int(ys[0]); d = int(d_fn(x)); nt = max(0, min(floor - 2, t0 + d))
        o[:floor, x] = 0
        for y in range(nt, floor):
            o[y, x] = a[min(floor - 1, t0 + int((y - nt) * (floor - t0) / max(1, floor - nt))), x]
    return o
def bow(a, k):  # play-bow stretch: chest down at the front (left), hips up at the back
    if not k: return a
    a = colstretch(a, lambda x: k * max(0, 1 - x / 62) - (k * 0.45) * max(0, (x - 66) / 50))
    return shear(a, TAIL, -k // 2, 70, 24)
storm_stretch = [bow(st0, k) for k in (0, 3, 6, 9, 11, 12, 12, 12, 12, 11, 8, 5, 2, 0)]

idle0, idle1 = load("storm-idle-0"), load("storm-idle-1")
TIP = (18, 96, 42, 122)
def breathe(a, y1=105): return stretch(a, top(a), y1, top(a) - 1)
def flick(a, n): return lift(a, TIP, 0, -n) if n else a
storm_idle = ([idle0, breathe(idle0)] * 3 + [idle1, breathe(idle0)] + [idle0, breathe(idle0)] * 2
              + [flick(idle0, 2), flick(idle0, 4), flick(breathe(idle0), 5), flick(idle0, 4), flick(idle0, 2), idle0]
              + [breathe(idle0), idle0, idle1, breathe(idle0)])
slp0, slp1 = load("storm-sleeping-0"), load("storm-sleeping-1")
def sbreathe(a, n): return stretch(a, top(a), 112, top(a) - n) if n else a
storm_sleep = [slp0, sbreathe(slp0, 1), sbreathe(slp1, 1), sbreathe(slp1, 2), sbreathe(slp1, 1), slp1, slp0, slp0]
sit0, sit1 = load("storm-sit-0"), load("storm-sit-1")
storm_sit = [sit0, sit0, sit1, sit1]

# ---- Asad --------------------------------------------------------------
ty0, ty1 = load("asad-typing-0"), load("asad-typing-1")
cf0 = load("asad-coffee-0")
HAIR = (26, 36, 58, 90)
def nod(a, n): return stretch(a, top(a), 98, top(a) + n) if n else a
typing_pat = [0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0]
asad_typing = []
for i, p in enumerate(typing_pat):
    f = ty1 if p else ty0
    f = shear(f, HAIR, 2 if (i // 4) % 2 else 0, 80, 40)
    asad_typing.append(nod(f, 1 if i % 8 in (3, 4, 5) else 0))
MUG = (66, 66, 106, 100)
asad_coffee = [cf0] * 6 + [lift(cf0, MUG, -3, -6), lift(cf0, MUG, -6, -12), lift(cf0, MUG, -8, -15)] * 1
asad_coffee += [lift(cf0, MUG, -8, -15)] * 3 + [lift(cf0, MUG, -6, -12), lift(cf0, MUG, -3, -6)] + [cf0] * 6
asad_idle = [nod(load("asad-idle-0"), 0)] * 6 + [nod(load("asad-idle-0"), 1)] * 6

MS = {"asad-idle": 400, "asad-typing": 140, "asad-coffee": 260, "storm-idle": 280,
      "storm-sleeping": 520, "storm-standing": 95, "storm-stretch": 110, "storm-sit": 900}
SHEETS = {"asad-idle": asad_idle, "asad-typing": asad_typing, "asad-coffee": asad_coffee,
          "storm-idle": storm_idle, "storm-stretch": storm_stretch, "storm-sleeping": storm_sleep, "storm-standing": storm_walk, "storm-sit": storm_sit}

man = json.loads((OUT / "manifest.json").read_text())
man["version"] = man.get("version", 1)  # bump when sheets change: used as the cache-buster
for name, frames in SHEETS.items():
    sheet = np.zeros((128, 128 * len(frames), 4), dtype=np.uint8)
    for i, f in enumerate(frames): sheet[:, i * 128:(i + 1) * 128] = f
    Image.fromarray(sheet).save(OUT / f"{name}.png", optimize=True)
    s = man["states"].setdefault(name, {"sheet": f"/sprites/{name}.png", "still": f"/sprites/{name}-still.png", "frameWidth": 128, "frameHeight": 128, "anchor": [64, 120]})
    s["frames"] = len(frames); s["frameMs"] = MS[name]
    s["durationsMs"] = [MS[name]] * len(frames)
    print(name, len(frames), (OUT / f"{name}.png").stat().st_size)
(OUT / "manifest.json").write_text(json.dumps(man, indent=2) + "\n")
