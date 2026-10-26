"""Builds Asad's wardrobe: one folder per outfit under public/art/outfits/<id>/.

Deterministic recolour, no regeneration. The classic sheets exported from art/ase/ by
export_ase.sh (public/sprites/asad-*.png) are the source: pose, face, hair, glasses, goatee,
frames and timing stay exactly as they are; only the hoodie pixels change colour.

    python3 scripts/outfits.py            # rebuild every outfit + public/art/outfits/index.json
    python3 scripts/outfits.py --preview  # also write art/previews/outfits.png (all frames, all outfits)

Add an outfit: create public/art/outfits/<id>/outfit.json with a palette (see forest/), run this.
Run with Python 3 + Pillow + numpy.
"""
from pathlib import Path
import colorsys, json, shutil, sys
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public/sprites"
OUTFITS = ROOT / "public/art/outfits"
# The Vue rebuild serves the same files, and the Go API validates ids against the same index.
SITE_OUTFITS = ROOT.parent / "site/public/art/outfits"
API_INDEX = ROOT.parent / "api/internal/content/data/outfits.json"
STATES = ["asad-idle", "asad-typing", "asad-coffee", "asad-happy"]
DEFAULT = "forest"

# Where the hoodie is, per animation, in 128px frame coordinates: polygons around the torso and
# sleeves that stop above the shoulders (long hair) and short of the laptop, mug and jeans. Frames
# of one animation keep the body in place to within a pixel or two, so one region per animation.
REGIONS = {
    "asad-idle": [[(34, 85), (72, 85), (72, 92), (69, 92), (69, 111), (34, 111)]],
    "asad-typing": [[(34, 85), (72, 85), (72, 92), (69, 92), (69, 111), (34, 111)]],
    "asad-happy": [[(34, 84), (72, 84), (72, 92), (69, 92), (69, 111), (34, 111)]],
    "asad-coffee": [[(34, 86), (64, 86), (66, 84), (90, 84), (90, 107), (68, 107), (68, 110), (34, 110)]],
}


MUG = [(245, 219, 196), (130, 102, 113), (113, 72, 78)]


def hsv(rgb):
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in rgb))
    return h * 360, s, v


def is_skin(rgb):
    h, s, v = hsv(rgb)
    return h < 40 and v > 0.45


def is_cloth(rgb):
    """Hoodie shades: the plum-charcoal family (violet greys, mauves, the warm lamp rim)."""
    h, s, v = hsv(rgb)
    if v < 0.09:  # outlines and the black tee stay
        return False
    if 230 <= h < 244:  # navy belongs to the jeans and the laptop (hoodie navy is near-black)
        return v < 0.3 and s < 0.45
    return h >= 244 or (h < 12 and v < 0.5)


def luma(rgb):
    r, g, b = (c / 255 for c in rgb)
    return 0.299 * r + 0.587 * g + 0.114 * b


def hexrgb(h):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def ramp_at(ramp, t):
    t = min(max(t, 0), 1) * (len(ramp) - 1)
    i = min(int(t), len(ramp) - 2)
    return lerp(ramp[i], ramp[i + 1], t - i)


def region_mask(state):
    m = Image.new("L", (128, 128), 0)
    d = ImageDraw.Draw(m)
    for poly in REGIONS[state]:
        d.polygon(poly, fill=255)
    return np.array(m) > 0


def components(mask):
    """4-connected components of a boolean mask: list of pixel lists."""
    seen = np.zeros_like(mask)
    out = []
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        stack, comp = [(y, x)], []
        seen[y, x] = True
        while stack:
            cy, cx = stack.pop()
            comp.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < 128 and 0 <= nx < 128 and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        out.append(comp)
    return out


def hoodie_pixels(frame, region):
    """(cloth, strings): boolean masks of hoodie pixels and drawstring pixels in one frame."""
    rgb, alpha = frame[:, :, :3], frame[:, :, 3] > 0
    skin = np.zeros((128, 128), bool)
    cloth = np.zeros((128, 128), bool)
    for y, x in zip(*np.nonzero(alpha)):
        c = tuple(int(v) for v in rgb[y, x])
        skin[y, x] = is_skin(c)
        cloth[y, x] = is_cloth(c)
    # Protect the face: anything on a row between the face's own skin pixels (goatee, glasses,
    # lips, shadows under the chin). The face is the skin component that reaches highest.
    comps = components(skin)
    face = min(comps, key=lambda c: min(p[0] for p in c))
    protect = np.zeros((128, 128), bool)
    rows = {}
    for y, x in face:
        lo, hi = rows.get(y, (x, x))
        rows[y] = (min(lo, x), max(hi, x))
    for y, (lo, hi) in rows.items():
        protect[y, lo : hi + 1] = True
    # Skin-coloured outlines of hands keep their warm edge: dark reds touching skin.
    near_skin = np.zeros((128, 128), bool)
    near_skin[1:, :] |= skin[:-1, :]
    near_skin[:-1, :] |= skin[1:, :]
    near_skin[:, 1:] |= skin[:, :-1]
    near_skin[:, :-1] |= skin[:, 1:]
    warm_edge = np.zeros((128, 128), bool)
    for y, x in zip(*np.nonzero(cloth & near_skin)):
        h, s, v = hsv(tuple(int(c) for c in rgb[y, x]))
        warm_edge[y, x] = (h >= 330 or h < 12) and s >= 0.55
    # The mug (cream, with grey-mauve shading that matches the hoodie highlight) is not cloth.
    mug = np.zeros((128, 128), bool)
    stack = [(y, x) for y, x in zip(*np.nonzero((rgb == MUG[0]).all(axis=2)))]
    for y, x in stack:
        mug[y, x] = True
    while stack:
        cy, cx = stack.pop()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < 128 and 0 <= nx < 128 and not mug[ny, nx] and tuple(int(v) for v in rgb[ny, nx]) in MUG:
                mug[ny, nx] = True
                stack.append((ny, nx))
    hood = cloth & region & ~protect & ~warm_edge & ~mug
    # Drawstrings: thin peach strokes inside the hoodie, at most two pixels wide and not part of a
    # hand, the neck or the mug.
    strings = np.zeros((128, 128), bool)
    for comp in components(skin & region & ~protect):
        ys = [p[0] for p in comp]
        xs = [p[1] for p in comp]
        if len(comp) <= 14 and max(xs) - min(xs) <= 1 and max(ys) - min(ys) >= 3:
            for y, x in comp:
                strings[y, x] = True
    return hood, strings


def recolour(frame, region, palette, lo, hi):
    out = frame.copy()
    hood, strings = hoodie_pixels(frame, region)
    ramp = [hexrgb(h) for h in palette["hoodie"]]
    warm = hexrgb(palette.get("rim", "#a0623a"))
    for y, x in zip(*np.nonzero(hood)):
        c = tuple(int(v) for v in frame[y, x, :3])
        t = (luma(c) - lo) / (hi - lo)
        new = ramp_at(ramp, t)
        h, s, v = hsv(c)
        # The lamp's warm rim light (mauve-red source pixels) stays faintly warm.
        if (h >= 300 or h < 12) and s > 0.3:
            new = lerp(new, warm, 0.22)
        out[y, x, :3] = new
    if "drawstring" in palette:
        light, dark = (hexrgb(h) for h in palette["drawstring"])
        for y, x in zip(*np.nonzero(strings)):
            out[y, x, :3] = light if luma(tuple(int(v) for v in frame[y, x, :3])) > 0.62 else dark
    return out


def cloth_range():
    """Luma range of the classic hoodie across every frame, so all outfits share one mapping."""
    vals = []
    for state in STATES:
        sheet = np.array(Image.open(SPRITES / f"{state}.png").convert("RGBA"))
        region = region_mask(state)
        for i in range(sheet.shape[1] // 128):
            frame = sheet[:, i * 128 : (i + 1) * 128]
            hood, _ = hoodie_pixels(frame, region)
            vals += [luma(tuple(int(v) for v in frame[y, x, :3])) for y, x in zip(*np.nonzero(hood))]
    vals = np.array(vals)
    return float(np.percentile(vals, 1)), float(np.percentile(vals, 99.5))


def build():
    base = json.loads((SPRITES / "manifest.json").read_text())
    lo, hi = cloth_range()
    entries = []
    for meta_path in sorted(OUTFITS.glob("*/outfit.json")):
        meta = json.loads(meta_path.read_text())
        folder = meta_path.parent
        if meta["id"] != folder.name:
            raise ValueError(f"{meta_path}: id must match its folder")
        states = {}
        for state in STATES:
            src = SPRITES / f"{state}.png"
            if meta.get("palette"):
                sheet = np.array(Image.open(src).convert("RGBA"))
                region = region_mask(state)
                for i in range(sheet.shape[1] // 128):
                    sl = slice(i * 128, (i + 1) * 128)
                    sheet[:, sl] = recolour(sheet[:, sl], region, meta["palette"], lo, hi)
                Image.fromarray(sheet).save(folder / f"{state}.png", optimize=True)
            else:
                shutil.copyfile(src, folder / f"{state}.png")
            sheet = Image.open(folder / f"{state}.png")
            sheet.crop((0, 0, 128, 128)).save(folder / f"{state}-still.png", optimize=True)
            s = dict(base["states"][state])
            s["sheet"] = f"/art/outfits/{meta['id']}/{state}.png"
            s["still"] = f"/art/outfits/{meta['id']}/{state}-still.png"
            states[state] = s
        # Admin thumbnail: the typing still, cropped to Asad.
        Image.open(folder / "asad-typing-still.png").crop((32, 48, 96, 124)).save(folder / "preview.png", optimize=True)
        manifest = {"version": base["version"], "outfit": meta["id"], "logicalSize": base["logicalSize"], "states": states}
        (folder / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        entries.append({k: meta[k] for k in ("id", "name", "description", "createdAt")} | {"preview": f"/art/outfits/{meta['id']}/preview.png"})
    ids = [e["id"] for e in entries]
    if DEFAULT not in ids or "classic" not in ids:
        raise ValueError("The wardrobe needs a classic outfit and the default outfit")
    entries.sort(key=lambda e: (e["id"] != DEFAULT, e["id"] != "classic", e["createdAt"], e["id"]))
    index = {"version": base["version"], "default": DEFAULT, "outfits": entries}
    (OUTFITS / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    print(f"{len(entries)} outfits: {', '.join(ids)} (hoodie luma {lo:.3f}–{hi:.3f})")
    if SITE_OUTFITS.parent.parent.exists():
        shutil.rmtree(SITE_OUTFITS, ignore_errors=True)
        shutil.copytree(OUTFITS, SITE_OUTFITS)
        print(f"mirrored to {SITE_OUTFITS.relative_to(ROOT.parent)}")
    if API_INDEX.parent.exists():
        shutil.copyfile(OUTFITS / "index.json", API_INDEX)
    return entries


def preview(entries):
    """Every frame of every animation, one row per outfit, on the room's night wall colour."""
    rows = []
    for e in entries:
        frames = []
        for state in STATES:
            sheet = Image.open(OUTFITS / e["id"] / f"{state}.png").convert("RGBA")
            frames += [sheet.crop((i * 128 + 32, 48, i * 128 + 96, 124)) for i in range(sheet.width // 128)]
        rows.append(frames)
    w, h = 64, 76
    out = Image.new("RGBA", (w * len(rows[0]), h * len(rows)), (43, 36, 44, 255))
    for r, frames in enumerate(rows):
        for c, f in enumerate(frames):
            out.alpha_composite(f, (c * w, r * h))
    dest = ROOT / "art/previews"
    dest.mkdir(parents=True, exist_ok=True)
    out.resize((out.width * 3, out.height * 3), Image.NEAREST).save(dest / "outfits.png")
    print(f"preview: {dest / 'outfits.png'}")


if __name__ == "__main__":
    entries = build()
    if "--preview" in sys.argv:
        preview(entries)
