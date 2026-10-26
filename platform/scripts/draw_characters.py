"""Draws Storm as rigged pixel art (Asad comes from scripts/extract_reference.py) (reference: art/references/asad-storm-cozy-reference.png),
at the room's pixel density. Every animation is posed from the same rig, so motion is continuous:
Storm walks with a four-beat lateral-sequence gait whose planted paws travel exactly one stride per
cycle (the page moves him at stride / cycle-time, so his feet never slide).
Output: art/ase/<state>.ase per animation, then LibreSprite exports the sheets (scripts/export_ase.sh).
Run: python3 scripts/draw_characters.py"""
import json, math, subprocess
from pathlib import Path
from PIL import Image
from pixelrig import Frame
from ase import write_ase

ROOT = Path(__file__).resolve().parents[1]
TAU = math.tau

# ============================================================== Storm (64x64, faces left, floor y=58)
FUR = ["#3a2d2b", "#5b473e", "#82695a", "#a88e78", "#c8b39a"]
FUR_FAR = ["#2a201f", "#43352f", "#5f4d43", "#7c6656"]
WHITE = ["#c9bdb4", "#e8e0d8", "#fbf7f2"]
PINK, EYE, OUT = "#ec9aa7", "#9fd36a", "#1f1620"
STRIDE, SW, SH = 10.0, 64, 64
FLOOR = 57

def storm(gait=None, tail=0.0, bob=0, blink=False, ear=0, tilt=0.0, breath=0, look=0):
    """gait: dict leg -> (dx, lift) paw offsets; tilt > 0 lowers the front (play-bow stretch)."""
    f = Frame(SW, SH)
    sh_x, hip_x = 22, 42
    sh_y = 44 + bob + round(tilt * 1.2)
    hip_y = 43 + bob - round(tilt * 0.6)
    legs = gait or {k: (0, 0) for k in ("bn", "fn", "bf", "ff")}

    def leg(hx, hy, front, far, dx, lift):
        px_, py_ = hx + dx, FLOOR - lift
        kx = (hx + px_) / 2 + (1.2 if front else -2.2)
        ky = (hy + py_) / 2
        if far: hx, px_, kx = hx + 2, px_ + 2, kx + 2
        m = f.limb([(hx, hy), (kx, ky), (px_, py_ - 1)], 1.9)
        f.shade(m, FUR_FAR if far else FUR, hx, (hy + py_) / 2, 3, 8)
        paw = f.ellipse(px_ - 0.5, py_ - 0.6, 2.4, 1.4)
        f.shade(paw, WHITE[:2] if far else WHITE, px_, py_, 3, 2)

    leg(hip_x, hip_y, False, True, *legs["bf"])
    leg(sh_x, sh_y, True, True, *legs["ff"])

    # tail (behind body), sways and lifts
    a = tail
    tm, tt = f.curve((45, 38 + bob), (57 + 3 * math.sin(a), 37 + bob), (54 + 6 * math.sin(a), 19 + bob + 2 * abs(math.cos(a))), 2.7, 1.9)
    f.shade(tm, FUR, 52, 28, 6, 12)
    stripes = tm & ((tt * 9).astype(int) % 2 == 1)
    f.px[stripes, :3] = (f.px[stripes, :3] * 0.62).astype("uint8")

    # body + chest
    rot = -0.12 * tilt / 4
    body = f.ellipse(33, 39 + bob + tilt * 0.3, 13.5, 7.5 + breath * 0.5, rot)
    chest = f.ellipse(22, 40 + bob + tilt, 7.5, 7.2)
    torso = body | chest
    f.shade(torso, FUR, 31, 37 + bob, 15, 9)
    tabby = torso & (((f.X * 0.8 + f.Y * 0.32) % 4.2) < 1.3) & (f.Y < 43 + bob + tilt)
    f.px[tabby, :3] = (f.px[tabby, :3] * 0.66).astype("uint8")
    belly = torso & (f.Y > 42.5 + bob + tilt * 0.5) & (f.X < 40)
    bib = f.ellipse(19, 42 + bob + tilt, 5.5, 6.5)
    f.shade(belly | bib, WHITE, 22, 44, 10, 5)

    leg(hip_x - 1, hip_y + 1, False, False, *legs["bn"])
    leg(sh_x - 1, sh_y + 1, True, False, *legs["fn"])

    # head
    hx, hy = 14 + (look * 0.5), 31 + bob * 0 + round(tilt * 1.5) - (1 if bob == 0 and gait else 0)
    far_ear = f.poly([(hx + 1, hy - 4), (hx + 7, hy - 11 + ear * 0), (hx + 8, hy - 2)])
    f.shade(far_ear, FUR_FAR, hx + 5, hy - 6, 3, 4)
    head = f.ellipse(hx, hy, 8.2, 7.2) | f.ellipse(hx - 1, hy + 2.6, 7.8, 5)
    f.shade(head, FUR, hx - 1, hy - 1, 8, 7)
    stripe_h = head & (f.Y < hy - 2) & (((f.X * 1.1) % 3.4) < 1.1) & (f.X > hx - 5)
    f.px[stripe_h, :3] = (f.px[stripe_h, :3] * 0.66).astype("uint8")
    near_ear = f.poly([(hx - 7, hy - 3), (hx - 6 + ear, hy - 12), (hx - 1, hy - 5)])
    f.shade(near_ear, FUR, hx - 5, hy - 7, 3, 5)
    f.fill(f.poly([(hx - 5.5, hy - 4), (hx - 5 + ear, hy - 9.5), (hx - 2.5, hy - 5)]), PINK)
    muzzle = f.ellipse(hx - 4, hy + 3.2, 4.4, 3) | f.ellipse(hx + 1, hy + 4.5, 4, 2.2)
    f.shade(muzzle, WHITE, hx - 4, hy + 2, 4, 3)
    ex, ey = int(hx - 4), int(hy)
    if blink:
        f.line(ex - 1, ey, ex + 1, ey, OUT)
    else:
        f.dot(ex - 1, ey, EYE); f.dot(ex, ey, EYE); f.dot(ex, ey - 1, EYE); f.dot(ex - 1, ey - 1, "#d9f5a8")
        f.dot(ex + (0 if look >= 0 else -1), ey, OUT)
    f.dot(int(hx - 8), int(hy + 2), PINK); f.dot(int(hx - 7), int(hy + 4), "#7a4a50")
    f.outline(OUT)
    for dy in (2, 4):  # whiskers sit outside the outline
        f.line(int(hx - 8), int(hy + dy + 1), int(hx - 12), int(hy + dy + (dy - 3)), "#e8dfd4")
    return f.px


def gait_at(p):
    """Lateral-sequence walk. Stance (65%) sweeps the paw back one stride; swing lifts it forward."""
    out = {}
    for leg, ph in (("bn", 0.0), ("fn", 0.25), ("bf", 0.5), ("ff", 0.75)):
        q = (p + ph) % 1
        if q < 0.65:
            out[leg] = (-STRIDE / 2 + STRIDE * q / 0.65, 0)
        else:
            s = (q - 0.65) / 0.35
            out[leg] = (STRIDE / 2 - STRIDE * s, round(3.2 * math.sin(math.pi * s)))
    return out

N_WALK = 10
storm_walk = [storm(gait_at(i / N_WALK), tail=0.5 * math.sin(TAU * i / N_WALK),
                    bob=1 if (i % 5) in (1, 2) else 0) for i in range(N_WALK)]
idle_pose = {"bn": (2, 0), "fn": (-2, 0), "bf": (-1, 0), "ff": (1, 0)}
storm_idle = []
for i in range(24):
    storm_idle.append(storm(idle_pose, tail=0.45 * math.sin(TAU * i / 24), breath=1 if i % 6 < 3 else 0,
                            blink=i in (9, 21), ear=1 if i in (15, 16) else 0, look=-1 if 4 <= i < 8 else 0))
storm_stretch = []
for k in (0, 1, 2, 3, 4, 5, 6, 6, 6, 6, 5, 4, 3, 2, 1, 0):
    pose = {"bn": (3, 0), "fn": (-2 - k * 1.3, 0), "bf": (0, 0), "ff": (-1 - k * 1.3, 0)}
    storm_stretch.append(storm(pose, tail=0.2 * k, tilt=k * 0.9, blink=k >= 5))

def storm_sleep_frame(i):
    f = Frame(SW, SH)
    br = 0.6 * math.sin(TAU * i / 8)
    tm, tt = f.curve((47, 50), (44, 60), (17, 57), 2.8, 2.0)
    body = f.ellipse(34, 48 - br * 0.5, 16, 9 + br)
    f.shade(body, FUR, 32, 45, 16, 10)
    tabby = body & (((f.X * 0.75 - f.Y * 0.3) % 4.4) < 1.4) & (f.Y < 52)
    f.px[tabby, :3] = (f.px[tabby, :3] * 0.66).astype("uint8")
    f.shade(f.ellipse(22, 54, 6, 3), WHITE, 22, 53, 6, 3)  # tucked paws
    f.shade(tm, FUR, 30, 57, 16, 4)
    st = tm & ((tt * 8).astype(int) % 2 == 1)
    f.px[st, :3] = (f.px[st, :3] * 0.62).astype("uint8")
    hx, hy = 18, 47
    f.shade(f.poly([(hx + 1, hy - 4), (hx + 6, hy - 10), (hx + 7, hy - 2)]), FUR_FAR, hx + 4, hy - 5, 3, 4)
    head = f.ellipse(hx, hy, 7.2, 6) | f.ellipse(hx - 1, hy + 2, 6.8, 4.2)
    f.shade(head, FUR, hx - 1, hy - 1, 8, 7)
    f.shade(f.poly([(hx - 7, hy - 2), (hx - 6, hy - 11), (hx - 1, hy - 5)]), FUR, hx - 5, hy - 6, 3, 5)
    f.fill(f.poly([(hx - 5.5, hy - 3), (hx - 5, hy - 8.5), (hx - 2.5, hy - 4.5)]), PINK)
    f.shade(f.ellipse(hx - 4, hy + 3, 3.5, 2.5), WHITE, hx - 4, hy + 2, 4, 3)
    f.line(hx - 5, hy, hx - 3, hy + 1, OUT)
    f.dot(hx - 8, hy + 2, PINK)
    f.outline(OUT)
    return f.px
storm_sleep = [storm_sleep_frame(i) for i in range(8)]

STATES = {
    # name: (frames, frame ms, w, h, anchor)
    "storm-standing": (storm_walk, 80, SW, SH, [32, 58]),
    "storm-idle": (storm_idle, 160, SW, SH, [32, 58]),
    "storm-stretch": (storm_stretch, 95, SW, SH, [32, 58]),
    "storm-sleeping": (storm_sleep, 380, SW, SH, [32, 58]),
    "storm-sit": (storm_idle[:8], 200, SW, SH, [32, 58]),
}

if __name__ == "__main__":
    man_p = ROOT / "public/sprites/manifest.json"
    man = json.loads(man_p.read_text())
    for name, (frames, ms, w, h, anchor) in STATES.items():
        imgs = [Image.fromarray(fr) for fr in frames]
        write_ase(ROOT / "art/ase" / f"{name}.ase", w, h, [("Layer 1", imgs)], ms)
        s = man["states"].setdefault(name, {"sheet": f"/sprites/{name}.png", "still": f"/sprites/{name}-still.png"})
        s.update(frames=len(frames), frameMs=ms, frameWidth=w, frameHeight=h, anchor=anchor, durationsMs=[ms] * len(frames))
        imgs[0].save(ROOT / "public/sprites" / f"{name}-still.png")
    man["strideRoomPx"] = STRIDE
    man["walkCycleMs"] = N_WALK * 80
    man_p.write_text(json.dumps(man, indent=2) + "\n")
    subprocess.run([str(ROOT / "scripts/export_ase.sh")], check=True)
    print("drew", ", ".join(f"{k}:{len(v[0])}" for k, v in STATES.items()))
