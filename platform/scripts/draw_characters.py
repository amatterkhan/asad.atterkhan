"""Draws Asad and Storm as rigged pixel art (reference: art/references/asad-storm-cozy-reference.png),
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

# ============================================================== Asad (96x96, 3/4 view, floor y=90)
SKIN = ["#8a4f36", "#b8714c", "#d8925f", "#ecb07d"]
HAIR = ["#0f0a0d", "#1a1114", "#281a1a", "#3e2a24"]
HOOD = ["#141420", "#1f1f2e", "#2c2c40", "#3b3b55"]
PANTS = ["#121427", "#1b1f3b", "#262b52", "#323a68"]
SOCK = ["#b8b2ac", "#e4dfd8", "#fbf8f3"]
LID = ["#3c3f52", "#55596f", "#717690", "#8e93ad"]
BEARD = ["#24161a", "#3a2520", "#563a2e"]
MUG = ["#141420", "#232333", "#34344a"]

def asad(hand=0, blink=False, breath=0, nod=0, sip=0.0, look=0):
    """hand: typing finger phase; sip: 0 (typing) .. 1 (mug at mouth)."""
    f = Frame(96, 96)
    by = breath  # torso rises with breath (0 or -1)
    hy = by + nod
    # crossed legs: thighs out to the knees, shins crossing in front, one sock peeking out
    thighs = f.capsule(34, 78, 17, 82, 7.5) | f.capsule(58, 78, 77, 81, 7.5)
    f.shade(thighs, PANTS, 47, 76, 30, 8)
    shin_back = f.capsule(19, 84, 50, 87, 5.6)
    f.shade(shin_back, PANTS, 34, 84, 18, 5, bias=-0.1)
    shin_front = f.capsule(75, 83, 42, 87, 5.8)
    f.shade(shin_front, PANTS, 58, 84, 18, 5)
    f.shade(f.ellipse(39, 87.5, 5.5, 3.4), SOCK, 38, 86, 5, 4)
    # torso: hoodie with hood around the neck
    torso = f.ellipse(44, 64 + by, 17, 18) & (f.Y < 80) | f.ellipse(44, 52 + by, 15, 9)
    f.shade(torso, HOOD, 42, 58 + by, 18, 18)
    f.fill(f.poly([(45, 48 + by), (55, 48 + by), (53, 72 + by), (47, 72 + by)]), HOOD[1])  # dark tee
    hood = f.ellipse(46, 47 + by, 12.5, 5.2) & ~f.ellipse(47, 46 + by, 7.5, 3.2)
    f.shade(hood, HOOD, 44, 45 + by, 12, 5)
    for x in (45, 52):
        f.line(x, 50 + by, x - (1 if x == 45 else -1), 62 + by, "#d9cfbd")
        f.dot(x - (1 if x == 45 else -1), 63 + by, "#a89c88")
    # neck + head
    f.shade(f.rect(46, 41 + hy, 53, 49 + by), SKIN, 49, 44, 4, 6, bias=-0.1)
    hair_back = (f.ellipse(46, 27 + hy, 15.5, 14) | f.ellipse(35, 38 + hy, 6.5, 10) | f.ellipse(31, 15 + hy, 6, 5.5)
                 | f.ellipse(40, 44 + hy, 4, 4))
    f.shade(hair_back, HAIR, 40, 20 + hy, 16, 16)
    for (cx, cy, r) in [(33, 30, 3.2), (31, 38, 3), (35, 46, 2.8), (38, 20, 3.4), (43, 14, 3.4), (50, 13, 3.2), (57, 16, 3)]:
        curl = f.ellipse(cx, cy + hy, r, r) & ~f.ellipse(cx + 0.8, cy + hy + 0.8, r - 1.2, r - 1.2)
        f.fill(curl, HAIR[2])
    face = f.ellipse(52.5, 33 + hy, 10.2, 12.4) | f.ellipse(55, 38 + hy, 8, 7)
    f.shade(face, SKIN, 53, 30 + hy, 11, 13)
    f.shade(f.ellipse(62.6, 35 + hy, 1.6, 2.2), SKIN, 62, 34 + hy, 2, 2)  # nose
    stubble = face & (f.Y > 38.5 + hy) & ~f.ellipse(57.5, 40.5 + hy, 3.6, 1.4)
    f.shade(stubble, [SKIN[0], SKIN[1]], 52, 40 + hy, 10, 6, edge=False)
    dots = stubble & (((f.X.astype(int) + f.Y.astype(int)) % 2) == 0)
    f.fill(dots, BEARD[1])
    f.shade(f.ellipse(57.5, 44.2 + hy, 3, 2.3), BEARD, 57, 44 + hy, 3, 3)  # goatee
    f.line(55, 38 + hy, 60, 38 + hy, BEARD[1])  # moustache
    f.shade(f.ellipse(42.5, 34 + hy, 2.4, 3.4), SKIN, 42, 33 + hy, 3, 4)  # ear
    f.line(56, 41 + hy, 59, 41 + hy, "#8a4a3a"); f.dot(60, 40 + hy, "#8a4a3a")  # a small smile
    fringe = (f.ellipse(47, 21 + hy, 8, 4.4) | f.ellipse(56, 21 + hy, 6.5, 3.6) | f.ellipse(42, 27 + hy, 3.5, 7)
              | f.ellipse(62, 24 + hy, 2.4, 3.4) | f.ellipse(52, 24.5 + hy, 2, 2.6))
    f.shade(fringe, HAIR, 48, 19 + hy, 11, 6)
    for (cx, cy) in [(45, 19), (50, 19), (55, 19), (59, 21), (40, 24), (62, 23)]:
        f.dot(cx, cy + hy, HAIR[3])
    # glasses + eyes (looking down at the laptop unless sipping)
    for gx, r in ((51.5, 3.9), (60, 3.4)):
        ring = f.ellipse(gx, 31 + hy, r, 3.5) & ~f.ellipse(gx, 31 + hy, r - 1.1, 2.4)
        f.fill(ring, "#1b1322")
    f.line(55, 30 + hy, 56, 30 + hy, "#1b1322"); f.line(47, 30 + hy, 43, 31 + hy, "#1b1322")
    f.dot(49, 29 + hy, "#e8ecff"); f.dot(58, 29 + hy, "#e8ecff")
    ey = 31 + hy + (0 if sip > 0.5 or look else 1)
    if blink:
        f.line(50, 32 + hy, 53, 32 + hy, "#3a221c"); f.line(59, 32 + hy, 61, 32 + hy, "#3a221c")
    else:
        for ex in (52 + look, 60 + look):
            f.dot(ex, ey, "#1b1322"); f.dot(ex - 1, ey, "#3a221c")
    f.line(49, 26 + hy, 53, 26 + hy, HAIR[0]); f.line(58, 26 + hy, 61, 26 + hy, HAIR[0])  # brows
    f.dot(46, 24 + hy, HAIR[1])

    # laptop on the lap
    lid = f.poly([(50, 54 + by * 0), (79, 50), (81, 75), (52, 77)])
    f.shade(lid, LID, 60, 58, 18, 14, bias=0.05)
    f.fill(f.poly([(52, 77), (81, 75), (82, 77), (52, 79)]), "#2a2c3c")
    f.shade(f.ellipse(66, 63, 2.2, 2.2), ["#c8cde6", "#e6e9fa"], 66, 62, 2, 2, edge=False)
    f.dot(65, 60, "#e6e9fa"); f.dot(67, 60, "#e6e9fa")  # tiny cat-ear logo
    # arm + hand: typing at the keyboard edge, or lifting the mug
    sx, sy = 33, 54 + by
    t = sip
    hx_, hy_ = 48 + (hand % 2) * 1.0 * (1 - t) + t * 7, 72 - t * 31 + by
    ex_, ey_ = 34 + t * 2, 70 - t * 6 + by
    arm = f.limb([(sx, sy), (ex_, ey_), (hx_ - 3, hy_)], 4.6)
    f.shade(arm, HOOD, 36, 60 + by, 10, 12)
    cuff = f.ellipse(hx_ - 3.5, hy_, 2.4, 3.6)
    f.shade(cuff, HOOD[1:], hx_ - 3, hy_, 3, 4)
    if t > 0.05:
        mug = f.rect(hx_ - 1, hy_ - 6, hx_ + 6, hy_ + 3)
        f.shade(mug, MUG, hx_ + 2, hy_ - 2, 4, 5)
        f.dot(hx_ + 2, hy_ - 2, "#cdd6f4"); f.dot(hx_ + 1, hy_ - 3, "#cdd6f4"); f.dot(hx_ + 3, hy_ - 3, "#cdd6f4")
        f.shade(f.ellipse(hx_ - 1, hy_, 2.6, 2.4), SKIN, hx_ - 1, hy_ - 1, 3, 3)
        if t > 0.3:
            for i in range(2): f.dot(hx_ + 2 + i * 2, hy_ - 9 - (hand % 2), "#ffffff80" if False else "#c9c4d8")
    else:
        hand_m = f.ellipse(hx_, hy_ - 0.5, 3.6, 2.6)
        f.shade(hand_m, SKIN, hx_ - 1, hy_ - 1, 3, 3)
        for i in range(3):
            if (i + hand) % 3 == 0: f.dot(int(hx_) + 1 + i, int(hy_) - 2, SKIN[3])
    f.outline("#140f1c")
    return f.px

def typing_frames():
    out = []
    pattern = [0, 1, 2, 1, 0, 3, 1, 2, 0, 1, 3, 2, 1, 0, 2, 1, 0, 1, 2, 3, 1, 0, 2, 1]
    for i, h in enumerate(pattern):
        out.append(asad(hand=h, blink=i in (7, 19), breath=-1 if (i // 4) % 2 else 0, nod=1 if i in (11, 12, 13) else 0))
    return out
asad_typing = typing_frames()
ease = lambda x: 0.5 - 0.5 * math.cos(math.pi * x)
sip_curve = [ease(i / 6) for i in range(7)] + [1] * 6 + [ease(1 - i / 6) for i in range(7)]
asad_coffee = [asad(sip=s, breath=-1 if i % 8 < 4 else 0, blink=i == 9, hand=i) for i, s in enumerate(sip_curve)]
asad_idle = [asad(blink=i == 5, breath=-1 if i % 6 < 3 else 0, look=1 if 8 <= i < 12 else 0) for i in range(12)]

STATES = {
    # name: (frames, frame ms, w, h, anchor)
    "storm-standing": (storm_walk, 80, SW, SH, [32, 58]),
    "storm-idle": (storm_idle, 160, SW, SH, [32, 58]),
    "storm-stretch": (storm_stretch, 95, SW, SH, [32, 58]),
    "storm-sleeping": (storm_sleep, 380, SW, SH, [32, 58]),
    "storm-sit": (storm_idle[:8], 200, SW, SH, [32, 58]),
    "asad-typing": (asad_typing, 120, 96, 96, [48, 90]),
    "asad-coffee": (asad_coffee, 140, 96, 96, [48, 90]),
    "asad-idle": (asad_idle, 260, 96, 96, [48, 90]),
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
