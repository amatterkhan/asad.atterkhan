"""Draws the homepage room as a layered 384x216 pixel-art document (art/ase/room.ase), at the
same pixel density as the 128px Asad sprite, then exports every layer with LibreSprite to
site/public/room/<layer>.png. Edit room.ase in LibreSprite and run scripts/export_room.sh to republish.
Lighting is baked as separate layers (night shade, lamp glow, sunbeam) so the page can switch
day/night and lamp on/off by toggling layer opacity, and so the characters get lit too.
Run: python3 scripts/room.py   (Pillow + numpy + LibreSprite)"""
from pathlib import Path
import math, random, subprocess
import numpy as np
from PIL import Image
from ase import write_ase

ROOT = Path(__file__).resolve().parents[1]
W, H = 384, 216
B4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16
rng = random.Random(7)

def c(h, a=255):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
def new(): return np.zeros((H, W, 4), np.uint8)
def bay(x, y): return B4[y % 4, x % 4]
def rect(L, x0, y0, x1, y1, col):
    L[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] = col
def px(L, x, y, col):
    if 0 <= x < W and 0 <= y < H: L[y, x] = col
def bevel(L, x0, y0, x1, y1, base, hi, sh):
    rect(L, x0, y0, x1, y1, base); rect(L, x0, y0, x1, y0 + 1, hi); rect(L, x0, y0, x0 + 1, y1, hi)
    rect(L, x0, y1 - 1, x1, y1, sh); rect(L, x1 - 1, y0, x1, y1, sh)
def ramp(r, t, x, y):
    t = min(max(t, 0), 0.9999) * (len(r) - 1); i = int(t)
    return r[i + 1] if (t - i) > bay(x, y) and i + 1 < len(r) else r[i]
def ellipse(L, cx, cy, rx, ry, col, ring=None):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1 and (ring is None or d >= ring): px(L, x, y, col)
def line(L, x0, y0, x1, y1, col):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        px(L, round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), col)

# ---------------------------------------------------------------- palette (daylight)
WALL, WALL_S, WALL_D = c("#6a6798"), c("#706d9f"), c("#5a5788")
WAIN, WAIN_HI, WAIN_SH = c("#56527f"), c("#67638f"), c("#423e68")
RAIL, RAIL_HI, RAIL_SH = c("#8580b4"), c("#a29dcf"), c("#4a4673")
BASE, BASE_HI, BASE_SH = c("#9a8fc4"), c("#b8aedf"), c("#4f4878")
FLOOR = [c("#7d5348"), c("#8a5d4f"), c("#95675a")]
SEAM, GRAIN, FLOOR_HI = c("#5c3b37"), c("#744c43"), c("#a87766")
WOOD = dict(top=c("#c48a5f"), hi=c("#dba679"), front=c("#a06c47"), sh=c("#7a4f35"), deep=c("#553425"))
FRAME, FRAME_HI, FRAME_SH = c("#a79be0"), c("#cbc2f2"), c("#7266b0")
CURTAIN = [c("#7a4258"), c("#a35c73"), c("#c97a8f"), c("#e3a0b0")]
PAPER, PAPER_SH, INK = c("#efe7d6"), c("#cfc5ae"), c("#6c7086")
METAL, METAL_HI, METAL_SH, BLACK = c("#9399b2"), c("#bac2de"), c("#585b70"), c("#181825")
BOOKS = ["#cba6f7", "#89b4fa", "#fab387", "#a6e3a1", "#f38ba8", "#f9e2af", "#94e2d5", "#b4befe", "#eba0ac"]
def shade(col, f): return tuple(int(min(255, v * f)) for v in col[:3]) + (255,)

GLASS = (37, 25, 115, 95)  # x0, y0, x1, y1 of the window opening
BULB = (348, 99)

# ---------------------------------------------------------------- room (base layer)
def room():
    L = new()
    for y in range(0, 112):  # wallpaper: soft stripes, darker toward the ceiling
        for x in range(W):
            col = WALL_S if (x % 16) in (0, 1) else WALL
            if y < 18 and (18 - y) / 18 > bay(x, y) + 0.15: col = WALL_D
            L[y, x] = col
    for i in range(160):  # tiny wallpaper flecks
        x, y = rng.randrange(W), rng.randrange(20, 110)
        if (x % 16) > 3: px(L, x, y, WALL_S)
    rect(L, 0, 112, W, 117, RAIL); rect(L, 0, 112, W, 113, RAIL_HI); rect(L, 0, 116, W, 117, RAIL_SH)
    rect(L, 0, 117, W, 162, WAIN)
    for x0 in range(6, W, 48):  # raised panels
        rect(L, x0, 122, x0 + 40, 157, WAIN)
        rect(L, x0, 122, x0 + 40, 123, WAIN_SH); rect(L, x0, 122, x0 + 1, 157, WAIN_SH)
        rect(L, x0, 156, x0 + 40, 157, WAIN_HI); rect(L, x0 + 39, 122, x0 + 40, 157, WAIN_HI)
    rect(L, 0, 162, W, 168, BASE); rect(L, 0, 162, W, 163, BASE_HI); rect(L, 0, 167, W, 168, BASE_SH)
    # floor planks
    for row, y0 in enumerate(range(168, H, 8)):
        base = FLOOR[row % 2 + (1 if row % 3 == 0 else 0)]
        rect(L, 0, y0, W, y0 + 8, base); rect(L, 0, y0, W, y0 + 1, SEAM); rect(L, 0, y0 + 1, W, y0 + 2, FLOOR_HI)
        off = (row * 37) % 64
        for x in range(off, W, 64):
            rect(L, x, y0 + 1, x + 1, y0 + 8, SEAM); rect(L, x + 1, y0 + 2, x + 2, y0 + 8, FLOOR_HI)
        for _ in range(18):
            gx, gy = rng.randrange(W), y0 + rng.randrange(3, 7)
            rect(L, gx, gy, gx + rng.randrange(3, 9), gy + 1, GRAIN)
    for y in range(168, 174):  # contact shadow where floor meets wall
        for x in range(W):
            if (174 - y) / 7 > bay(x, y): px(L, x, y, shade(L[y, x], 0.82))

    # window
    bevel(L, 32, 20, 120, 100, FRAME, FRAME_HI, FRAME_SH)
    rect(L, *GLASS, (0, 0, 0, 0))
    rect(L, 37, 25, 115, 26, FRAME_SH); rect(L, 37, 25, 38, 95, FRAME_SH)  # inner shadow
    rect(L, 74, 25, 78, 95, FRAME); rect(L, 74, 25, 75, 95, FRAME_HI); rect(L, 77, 25, 78, 95, FRAME_SH)
    rect(L, 37, 58, 115, 62, FRAME); rect(L, 37, 58, 115, 59, FRAME_HI); rect(L, 37, 61, 115, 62, FRAME_SH)
    for (gx, gy) in [(42, 30), (80, 30), (42, 64), (80, 64)]:  # glass glints
        for i in range(7): px(L, gx + i, gy + 6 - i, (255, 255, 255, 46))
        for i in range(3): px(L, gx + 3 + i, gy + 8 - i, (255, 255, 255, 30))
    bevel(L, 26, 100, 126, 106, FRAME, FRAME_HI, FRAME_SH)
    for y in range(106, 110):
        for x in range(28, 124):
            if (110 - y) / 4 > bay(x, y): px(L, x, y, shade(L[y, x], 0.78))
    # plant on the sill
    PX = -56
    rect(L, 96 + PX, 92, 106 + PX, 100, c("#d77a54")); rect(L, 95 + PX, 91, 107 + PX, 93, c("#e8946c")); rect(L, 105 + PX, 93, 106 + PX, 100, c("#a85a3c"))
    for (x0, y0, x1, y1) in [(100, 91, 96, 80), (101, 91, 103, 78), (102, 91, 108, 82), (100, 91, 98, 84)]:
        line(L, x0 + PX, y0, x1 + PX, y1, c("#40a02b"))
    for (x, y) in [(96, 80), (95, 81), (103, 78), (102, 77), (108, 82), (109, 81), (98, 84), (97, 85)]:
        px(L, x + PX, y, c("#a6e3a1"))
    # curtain rod + curtains
    rect(L, 16, 14, 136, 16, c("#e5c07b")); rect(L, 16, 16, 136, 17, c("#b08a4f"))
    rect(L, 14, 12, 18, 18, c("#e5c07b")); rect(L, 134, 12, 138, 18, c("#e5c07b"))
    def curtain(xa, side):
        for y in range(17, 114):
            tie = 70
            w = 20 - int(11 * math.exp(-((y - tie) / 14) ** 2)) + (max(0, y - 100) // 3)
            for i in range(w):
                x = xa + i if side > 0 else xa - i
                fold = 0.5 + 0.5 * math.sin((i + (y - 17) * 0.05) * 1.1)
                edge = 0.15 if i >= w - 1 else 0
                px(L, x, y, ramp(CURTAIN, fold * 0.85 + 0.1 - edge, x, y))
            if abs(y - tie) <= 1:
                for i in range(w): px(L, xa + i * side, y, c("#f9e2af") if y != tie + 1 else c("#df8e1d"))
    curtain(18, 1); curtain(134, -1)

    # shelf + books + vine + router
    for y in range(50, 54):
        for x in range(146, 256):
            if (54 - y) / 4 > bay(x, y): px(L, x, y, shade(L[y, x], 0.8))
    x = 150
    for i, (w, h) in enumerate([(7, 30), (6, 26), (8, 33), (5, 24), (7, 28), (6, 22), (9, 31), (6, 27), (7, 25)]):
        col = c(BOOKS[i]); top = 46 - h
        rect(L, x, top, x + w, 46, col); rect(L, x, top, x + 1, 46, shade(col, 1.12)); rect(L, x + w - 1, top, x + w, 46, shade(col, 0.72))
        rect(L, x, top, x + w, top + 1, shade(col, 1.15))
        rect(L, x + 1, top + 4, x + w - 1, top + 5, shade(col, 0.7)); rect(L, x + 1, 40, x + w - 1, 41, shade(col, 0.7))
        if w > 6: rect(L, x + 2, top + 8, x + w - 2, top + 9, c("#f9e2af"))
        x += w + (1 if i in (2, 5) else 0)
    for r in range(24):  # a leaning book
        sx = x + 2 + r // 3
        rect(L, sx, 45 - r, sx + 6, 46 - r, c("#89dceb") if r < 23 else shade(c("#89dceb"), 1.2))
        px(L, sx + 5, 45 - r, shade(c("#89dceb"), 0.7))
    bevel(L, 146, 46, 256, 50, WOOD["front"], WOOD["hi"], WOOD["deep"])
    for bx in (156, 244):
        rect(L, bx, 50, bx + 2, 58, METAL_SH); rect(L, bx, 50, bx + 6, 52, METAL_SH)
    rect(L, 214, 37, 226, 46, c("#d77a54")); rect(L, 213, 35, 227, 38, c("#e8946c")); rect(L, 225, 38, 226, 46, c("#a85a3c"))
    vine = [(216, 36), (214, 40), (212, 46), (211, 52), (212, 58), (214, 64), (213, 70), (224, 36), (227, 42), (229, 50), (228, 57)]
    for (a, b) in zip(vine[:-1], vine[1:]):
        if abs(a[0] - b[0]) < 10: line(L, *a, *b, c("#40a02b"))
    for (lx, ly) in vine[1:]:
        rect(L, lx - 1, ly, lx + 2, ly + 2, c("#a6e3a1")); px(L, lx - 1, ly + 1, c("#40a02b"))
    bevel(L, 232, 38, 252, 46, c("#45475a"), c("#6c7086"), c("#181825"))
    line(L, 236, 38, 234, 30, METAL); line(L, 248, 38, 250, 30, METAL)

    # framed certificate (achievements)
    line(L, 296, 26, 310, 14, METAL_SH); line(L, 324, 26, 310, 14, METAL_SH); rect(L, 309, 13, 312, 15, c("#e5c07b"))
    bevel(L, 284, 24, 336, 66, c("#8b6bb0"), c("#b296d6"), c("#5d4580"))
    rect(L, 288, 28, 332, 62, PAPER); rect(L, 288, 28, 332, 29, PAPER_SH); rect(L, 288, 28, 289, 62, PAPER_SH)
    rect(L, 300, 33, 320, 35, c("#4c4f69"))
    for y in (39, 43, 47): rect(L, 294, y, 326, y + 1, INK)
    ellipse(L, 322, 54, 4, 4, c("#f38ba8")); ellipse(L, 322, 54, 2, 2, c("#eba0ac"))
    line(L, 320, 58, 318, 62, c("#d20f39")); line(L, 324, 58, 326, 62, c("#d20f39"))
    for i in range(10): px(L, 295 + i, 55 + (i % 3 == 1), c("#1e66f5"))

    # clipboard (experience)
    rect(L, 358, 22, 360, 25, c("#e5c07b"))
    bevel(L, 344, 30, 374, 80, c("#b07d52"), c("#cd9a6c"), c("#7a4f35"))
    rect(L, 348, 36, 370, 77, PAPER); rect(L, 369, 36, 370, 77, PAPER_SH)
    bevel(L, 352, 26, 366, 36, METAL, METAL_HI, METAL_SH); rect(L, 357, 29, 361, 31, METAL_SH)
    for i, y in enumerate(range(42, 74, 5)):
        px(L, 351, y, c("#8839ef")); rect(L, 353, y, 353 + (14 if i % 2 else 11), y + 1, INK)

    # postcard (say hello)
    rect(L, 258, 66, 282, 82, c("#f9e2af")); rect(L, 258, 81, 282, 82, c("#dfc48a")); rect(L, 281, 66, 282, 82, c("#dfc48a"))
    for x in range(274, 280):
        for y in range(68, 74): px(L, x, y, c("#f38ba8") if (x + y) % 5 else c("#ffffff"))
    for y in (75, 78): rect(L, 270, y, 279, y + 1, c("#a6733c"))
    for y in (70, 73, 76): rect(L, 261, y, 268, y + 1, c("#7c7f93"))
    rect(L, 269, 68, 270, 80, c("#d8bf86"))
    ellipse(L, 270, 65, 2, 2, c("#d20f39")); px(L, 269, 64, c("#ff8fa3"))

    # desk
    for y in range(168, 176):  # floor shadow under desk
        for x in range(196, W):
            if (176 - y) / 9 + 0.15 > bay(x, y): px(L, x, y, shade(L[y, x], 0.7))
    rect(L, 212, 131, 300, 168, c("#2e2645"))
    for y in range(131, 168):
        for x in range(212, 300):
            if (y - 131) / 37 > bay(x, y) + 0.2: px(L, x, y, c("#3a3155"))
    bevel(L, 200, 131, 212, 168, WOOD["front"], WOOD["hi"], WOOD["sh"])
    bevel(L, 300, 131, 384, 160, WOOD["front"], WOOD["hi"], WOOD["sh"])
    rect(L, 300, 160, 306, 168, WOOD["sh"]); rect(L, 376, 160, 384, 168, WOOD["sh"])
    for y0 in (134, 147):
        bevel(L, 306, y0, 376, y0 + 11, WOOD["front"], WOOD["sh"], WOOD["hi"])
        rect(L, 335, y0 + 5, 347, y0 + 7, c("#e5c07b")); rect(L, 335, y0 + 6, 347, y0 + 7, c("#b08a4f"))
    rect(L, 196, 124, W, 128, WOOD["top"]); rect(L, 196, 124, W, 125, WOOD["hi"])
    rect(L, 196, 128, W, 131, WOOD["front"]); rect(L, 196, 131, W, 132, WOOD["deep"])
    rect(L, 196, 124, 197, 132, WOOD["hi"])

    # desk: book stack, open notebook (the Lab) and pen
    bevel(L, 199, 116, 213, 120, c("#89b4fa"), c("#b4d0fb"), c("#5a7fc4")); rect(L, 211, 117, 213, 120, PAPER)
    bevel(L, 200, 120, 212, 124, c("#a6e3a1"), c("#c8f0c4"), c("#6fae6a")); rect(L, 210, 121, 212, 124, PAPER)
    rect(L, 214, 122, 254, 124, c("#8b6bb0"))
    for y in range(116, 123):
        sag = 1 if y < 118 else 0
        rect(L, 216 + sag, y, 234, y + 1, PAPER); rect(L, 235, y, 252 - sag, y + 1, PAPER)
    rect(L, 234, 116, 235, 123, PAPER_SH); rect(L, 233, 117, 234, 123, c("#ddd3bd"))
    for y in (118, 120):
        rect(L, 219, y, 231, y + 1, c("#b7b9d3")); rect(L, 238, y, 250, y + 1, c("#b7b9d3"))
    for x in (220, 224, 227, 240, 243, 247): px(L, x, 118, INK); px(L, x + 1, 120, INK)
    rect(L, 243, 114, 244, 123, c("#f38ba8"))  # ribbon
    for i in range(14): px(L, 252 + i, 123 - i // 5, c("#1e66f5") if i > 2 else c("#e5c07b"))

    # ESP32-CAM (+ cable over the desk edge)
    bevel(L, 260, 118, 290, 124, c("#2f7a55"), c("#46a274"), c("#1d4f37"))
    rect(L, 274, 119, 284, 123, METAL_HI); rect(L, 275, 120, 283, 122, METAL)
    for x in range(262, 289, 2): px(L, x, 123, c("#e5c07b"))
    bevel(L, 262, 112, 270, 119, BLACK, c("#45475a"), BLACK)
    rect(L, 265, 114, 267, 116, c("#89b4fa")); px(L, 265, 114, c("#dce6ff"))
    line(L, 260, 122, 256, 124, BLACK); line(L, 256, 124, 255, 136, BLACK); line(L, 255, 136, 258, 150, BLACK)

    # (the QROVER robot is its own animated sprite: scripts/robot.py)

    # mug with cat ears
    bevel(L, 332, 113, 343, 124, c("#f5e0dc"), c("#ffffff"), c("#d9b9b4"))
    rect(L, 332, 113, 343, 115, c("#6e4a35")); px(L, 333, 112, c("#f5e0dc")); px(L, 341, 112, c("#f5e0dc"))
    rect(L, 343, 116, 346, 117, c("#f5e0dc")); rect(L, 345, 116, 346, 122, c("#f5e0dc")); rect(L, 343, 121, 346, 122, c("#f5e0dc"))
    px(L, 336, 118, INK); px(L, 339, 118, INK); px(L, 337, 120, c("#f38ba8")); px(L, 338, 120, c("#f38ba8"))

    # lamp
    ellipse(L, 362, 122, 9, 3, c("#45475a")); rect(L, 353, 121, 372, 124, c("#45475a")); rect(L, 354, 121, 371, 122, c("#6c7086"))
    line(L, 362, 121, 366, 96, c("#585b70")); line(L, 363, 121, 367, 96, c("#6c7086"))
    ellipse(L, 366, 95, 2, 2, c("#45475a"))
    line(L, 366, 95, 352, 87, c("#585b70")); line(L, 366, 96, 352, 88, c("#6c7086"))
    SHADE = [c("#3f8f84"), c("#5aa79a"), c("#94e2d5"), c("#c7f2ea")]
    for i, y in enumerate(range(86, 98)):  # dome shade, opening downward
        half = 2 + i * 0.62
        for x in range(round(348 - half), round(348 + half) + 1):
            t = 1 - (x - (348 - half)) / (2 * half + 1)
            px(L, x, y, ramp(SHADE, t * 0.9 + (0.1 if i < 3 else 0), x, y))
    rect(L, 340, 97, 357, 98, c("#2f6e66"))
    ellipse(L, 352, 86, 1.5, 1.5, c("#45475a"))

    # rug + Asad's contact shadow
    ellipse(L, 132, 194, 84, 14, c("#c97a8f"))
    ellipse(L, 132, 194, 81, 12.5, c("#4e4380"))
    ellipse(L, 132, 194, 72, 10, c("#5d5196"), ring=0.82)
    for i, x in enumerate(range(70, 196, 9)):
        y = 194 + (1 if i % 2 else -1)
        for d in range(3): px(L, x + d, y - d + 1, c("#f9e2af")); px(L, x + d, y + d - 1, c("#f9e2af"))
    for y in range(186, 203, 2):
        for side in (-1, 1):
            ex = 132 + side * int(84 * math.sqrt(max(0, 1 - ((y - 194) / 14) ** 2)))
            px(L, ex + side, y, c("#efe7d6")); px(L, ex + 2 * side, y, c("#efe7d6"))
    for y in range(193, 203):
        for x in range(92, 176):
            if ((x - 133) / 42) ** 2 + ((y - 198) / 5) ** 2 <= 1 and 0.55 > bay(x, y):
                px(L, x, y, shade(L[y, x], 0.72))
    # office chair, pulled out from the desk and turned toward the room
    CH = [c("#3b3d52"), c("#4c4f69"), c("#6c6f85")]
    CU = [c("#5b4a8a"), c("#7a64b0"), c("#9a86cc")]
    for i, x in enumerate((172, 180, 190, 200, 207)):              # star base + casters
        line(L, 189, 178, x, 183 + (i % 2), CH[0]); rect(L, x - 1, 184 + (i % 2), x + 2, 186 + (i % 2), c("#1e1e2e"))
    rect(L, 187, 157, 191, 179, CH[1]); rect(L, 187, 157, 188, 179, CH[2])  # gas lift
    for y in range(149, 158):                                         # seat, seen at an angle
        x0, x1 = 172 + (157 - y) // 2, 206 - (y - 149) // 3
        rect(L, x0, y, x1, y + 1, CU[1] if y < 155 else CU[0])
    rect(L, 173, 149, 205, 150, CU[2])
    for y in range(114, 150):                                         # backrest, turned
        x0 = 176 + (y - 114) // 9
        x1 = 196 + (y - 114) // 12
        rect(L, x0, y, x1, y + 1, CU[1])
        px(L, x0, y, CU[2]); px(L, x1, y, CU[0])
    rect(L, 177, 113, 196, 115, CU[2]); rect(L, 194, 134, 198, 150, CH[0])  # top edge, arm of the back support
    for y in range(120, 146, 6): rect(L, 180 + (y - 114) // 9, y, 192 + (y - 114) // 12, y + 1, CU[0])  # stitching
    return L

# ---------------------------------------------------------------- sky layers (seen through the glass)
def ridge(x, far):
    if far: return 70 - 9 * math.exp(-((x - 95) / 14) ** 2) - 4 * math.exp(-((x - 50) / 20) ** 2)
    pouce = 6 * math.exp(-((x - 62) / 1.6) ** 2)  # Le Pouce's thumb
    return 82 - 22 * math.exp(-((x - 60) / 13) ** 2) - pouce - 8 * math.exp(-((x - 100) / 10) ** 2)

def sky(day):
    L = new(); x0, y0, x1, y1 = GLASS
    top, mid, bot = (c("#6fb7ea"), c("#9fd4f5"), c("#d4f0ff")) if day else (c("#0a0e2c"), c("#151640"), c("#262357"))
    for y in range(y0, y1):
        for x in range(x0, x1):
            t = (y - y0) / 60
            band = [top, mid, bot]
            f = t * 2; i = min(1, int(f)); fr = f - i
            L[y, x] = band[i + 1] if fr > 0.75 + bay(x, y) * 0.25 or (i == 1 and fr > 0.5) else band[i]
    if day:
        ellipse(L, 100, 38, 9, 9, c("#fff6cf")); ellipse(L, 100, 38, 6, 6, c("#fffbe8"))
    else:
        ellipse(L, 98, 38, 6, 6, c("#fdf3d0")); ellipse(L, 101, 36, 5.5, 5.5, top)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if y >= ridge(x, True): L[y, x] = c("#8fc7a8") if day else c("#1d1c48")
            if y >= ridge(x, False): L[y, x] = c("#4f9a6c") if day else c("#141336")
            if y >= 86:
                L[y, x] = c("#3f9ccc") if day else c("#101a40")
                if (x * 7 + y * 3) % 23 == 0: L[y, x] = c("#d8f3ff") if day else c("#2b3a70")
    if day:
        for x in range(60, 112, 6): px(L, x, 84 + (x % 3), c("#cfe9b4"))
    else:
        for (x, y) in [(52, 83), (57, 84), (66, 82), (88, 84), (104, 83)]: px(L, x, y, c("#f9e2af"))
        for y in range(87, 95, 2): rect(L, 97, y, 99 + (y % 4 == 1), y + 1, c("#c9c3a2"))
    return L

def stars(seed):
    L = new(); r = random.Random(seed); x0, y0, x1, y1 = GLASS
    for _ in range(14):
        x, y = r.randrange(x0 + 1, x1 - 1), r.randrange(y0 + 1, 60)
        px(L, x, y, c("#f5e0dc"))
        if r.random() < 0.3:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): px(L, x + dx, y + dy, c("#f5e0dc", 120))
    return L

def clouds():
    L = new()
    for k in range(0, W + 96, 96):  # periodic, so the page can drift it by 96px seamlessly
        for (cx, cy, rx, ry) in [(k + 20, 40, 10, 4), (k + 28, 37, 8, 5), (k + 36, 41, 9, 3.5), (k + 70, 52, 7, 3), (k + 76, 50, 6, 3.5)]:
            ellipse(L, cx, cy, rx, ry, c("#ffffff"))
        for x in range(k + 12, k + 46): px(L, x, 43, c("#dfe9f8"))
        for x in range(k + 64, k + 83): px(L, x, 54, c("#dfe9f8"))
    return L

# ---------------------------------------------------------------- light layers (drawn above the characters)
def quant_alpha(L, col, alpha_fn, step=0.07):
    for y in range(H):
        for x in range(W):
            a = alpha_fn(x, y)
            if a <= 0: continue
            q = math.floor(a / step + bay(x, y)) * step
            if q > 0: L[y, x] = col[:3] + (int(min(1, q) * 255),)
    return L

def glass(x, y): return GLASS[0] <= x < GLASS[2] and GLASS[1] <= y < GLASS[3]
def night():
    bx, by = BULB
    def a(x, y):
        if glass(x, y): return 0.08
        d = math.hypot((x - bx) * 0.8, (y - by - 18) * 1.15)
        return 0.58 * min(1, (d / 170) ** 1.1) + 0.06
    return quant_alpha(new(), c("#0a1442"), a)
def dark():
    def a(x, y):
        if glass(x, y): return 0.1
        if y >= 168:  # moonlight falling through the window onto the floor
            s = (y - 168) * 0.9 + 64
            if 37 + s <= x < 115 + s: return 0.48
        return 0.68
    return quant_alpha(new(), c("#060d30"), a)
def glow():
    bx, by = BULB
    def a(x, y):
        dx, dy = x - bx, y - by
        d = math.hypot(dx, dy)
        halo = 0.55 * max(0, 1 - d / 16)
        cone = max(0, (dy * 0.55 - dx * 0.85) / (d + 1e-6) - 0.2) * max(0, 1 - d / 120) * 0.5 * min(1, max(0, (dy + 1) / 12))
        return min(0.6, halo + cone)
    return quant_alpha(new(), c("#ffd08a"), a, 0.06)
def sunbeam():
    def a(x, y):
        if y < 170: return 0
        s = (y - 170) * 1.1 + 66
        u = x - s
        if not (37 <= u < 115): return 0
        if 74 <= u < 78 or abs((y - 170) - 22) <= 1: return 0.04
        return 0.2 + 0.05 * ((y - 170) / 46)
    return quant_alpha(new(), c("#fff3d0"), a, 0.05)
def bulb():
    L = new(); bx, by = BULB
    ellipse(L, bx, by, 3.5, 2, c("#fffbe0")); ellipse(L, bx, by, 2, 1.2, c("#ffffff"))
    return L

# The base room is the PixelLab restyle of this layout (art/pixellab/room/room-v2.png, made with
# create-image-pixflux from the procedural room as init image). Its window view becomes the day
# sky; a darkened copy becomes the night sky, so the mountains match in both themes.
PAINTED = ROOT / "pixellab/room/room-v2.png"
PANES = [(39, 26, 74, 58), (78, 26, 115, 58), (39, 61, 74, 95), (78, 61, 115, 95)]  # x0, y0, x1, y1 inclusive
PLANT = (36, 74, 58, 101)

WALL_HUE, WALL_SAT, WALL_LIFT = 0.085, 0.26, 1.22   # warm sand / oat walls
SEAM_HUE = 0.055                                     # floor seams: darker wood

def recolour(src):
    """Turn the restyle's lavender walls (low-saturation purples) warm; keep saturated purple
    accents (chair, rug, certificate frame). Night shading then cools the warm walls."""
    rgb = src[..., :3].astype(float) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    v = mx; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    purple = (h > 0.62) & (h < 0.80) & (s <= 0.45) & (src[..., 3] > 0)
    floor = np.zeros_like(purple); floor[168:] = True
    accent = (h > 0.62) & (h < 0.86) & (s > 0.45) & (src[..., 3] > 0)
    def box(x0, y0, x1, y1):
        m = np.zeros_like(purple); m[y0:y1, x0:x1] = True; return m
    chair, rug, frame = box(170, 100, 225, 178), box(40, 176, 230, 210), box(280, 20, 338, 70)
    out = src.copy()
    for mask, hue, sat, lift in ((purple & ~floor, WALL_HUE, WALL_SAT, WALL_LIFT), (purple & floor, SEAM_HUE, 0.45, 0.85),
                                 (accent & chair, 0.47, 0.42, 0.95),    # chair: muted teal, like the lamp
                                 (accent & rug, 0.97, 0.38, 1.05),      # rug: dusty rose
                                 (accent & frame, 0.07, 0.55, 0.85)):   # certificate frame: walnut
        vv = np.clip(v[mask] * lift, 0, 1)
        ss = np.clip(sat * (0.6 + s[mask]), 0, 1)
        i = np.floor(hue * 6); f = hue * 6 - i
        p_, q_, t_ = vv * (1 - ss), vv * (1 - ss * f), vv * (1 - ss * (1 - f))
        sector = int(i) % 6
        cols = [(vv, t_, p_), (q_, vv, p_), (p_, vv, t_), (p_, q_, vv), (t_, p_, vv), (vv, p_, q_)][sector]
        out[mask, 0], out[mask, 1], out[mask, 2] = [(c * 255).astype(np.uint8) for c in cols]
    return curtains(out, h, s)

CURTAIN_RAMP = [c("#3f5a4a"), c("#58765f"), c("#77967a"), c("#9cb89a")]   # muted sage, dark -> light

def curtains(out, h, s):
    """Replace the speckled pink curtains with smooth sage folds: median along each column (folds run
    vertically), then a clean 4-tone ramp. The brass rod and tie-backs (yellow hues) are kept."""
    for (x0, y0, x1, y1) in ((14, 14, 42, 118), (110, 14, 140, 118)):
        reg = out[y0:y1, x0:x1]
        hh, ss = h[y0:y1, x0:x1], s[y0:y1, x0:x1]
        pink = ((hh > 0.70) | (hh < 0.03)) & (ss > 0.06) & (reg[..., 3] > 0)
        val = reg[..., :3].astype(float).max(-1)
        sm = val.copy()
        for x in range(val.shape[1]):
            col = val[:, x]
            for y in range(len(col)):
                sm[y, x] = np.median(col[max(0, y - 3):y + 4])
        lo, hi = np.percentile(sm[pink], 5), np.percentile(sm[pink], 95)
        t = np.clip((sm - lo) / max(hi - lo, 1), 0, 0.999)
        idx = (t * len(CURTAIN_RAMP)).astype(int)
        ramp = np.array(CURTAIN_RAMP, np.uint8)
        reg[pink] = ramp[idx[pink]]
    return out

def remove_mug(src):
    """The restyle put a second mug at the left end of the desk; paint it out (wall from the same
    wainscot two periods left, desk top from the plain wood beside it)."""
    out = src.copy()
    for y in range(115, 124):
        for x in range(201, 216):
            out[y, x] = src[y, x - 48]
    for y in range(124, 127):
        for x in range(201, 216):
            out[y, x] = src[125 if y < 125 else y, 216]
    return out

CHAIR_BOX, LEG_X, CHAIR_SHIFT = (174, 100, 226, 180), (200, 212), 24

def move_chair(src):
    """Slide the chair one wainscot period (24px) left, out from under the desk, so its whole seat
    shows (Storm naps on it). The seat hidden behind the desk leg is rebuilt from its visible edges;
    the wall behind the old spot is copied from the same rows 48px to the left."""
    x0, y0, x1, y1 = CHAIR_BOX
    rgb = src[..., :3].astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    teal = (g > r + 15) & (b > r) & (src[..., 3] > 0)
    region = np.zeros(src.shape[:2], bool)
    region[y0:y1, x0:LEG_X[0]] = True               # backrest and front of the seat
    region[140:y1, LEG_X[0]:x1] = True              # seat end and back legs (not the mug on the desk)
    leg = np.zeros_like(region); leg[:, LEG_X[0]:LEG_X[1]] = True
    chair = teal & region & ~leg
    near = np.zeros_like(chair)                         # the chair's dark outline
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        near |= np.roll(np.roll(chair, dy, 0), dx, 1)
    chair |= near & region & ~leg & (rgb.sum(-1) < 160)
    layer = np.zeros_like(src); layer[chair] = src[chair]
    for y in range(y0, y1):                             # rebuild the seat behind the desk leg
        if chair[y, LEG_X[0] - 1] and chair[y, LEG_X[1]:LEG_X[1] + 3].any():
            layer[y, LEG_X[0]:LEG_X[1]] = src[y, LEG_X[0] - 2]
    out = src.copy()
    mx = rgb.max(-1); mn = rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    wall_like = (sat < 0.38) & (r >= b) & ~teal                # sand wall / wainscot, not curtain or window
    leftover = teal & region & ~chair
    for y, x in zip(*np.nonzero(chair | leftover)):
        for k in (1, 2, 3, 4, 5):                               # whole wainscot periods to the left (plain wall)
            sx = x - 24 * k
            if 0 <= sx < src.shape[1] and not chair[y, sx] and (wall_like[y, sx] or y >= 166):
                out[y, x] = src[y, sx]; break
    moved = np.roll(layer, -CHAIR_SHIFT, axis=1)
    m = moved[..., 3] > 0
    out[m] = moved[m]
    return out

def painted_layers():
    src = move_chair(recolour(remove_mug(np.array(Image.open(PAINTED).convert("RGBA")))))
    room_l, day, night = src.copy(), new(), new()
    for (x0, y0, x1, y1) in PANES:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                r, g, b, _ = (int(v) for v in src[y, x])
                plant = PLANT[0] <= x <= PLANT[2] and PLANT[1] <= y <= PLANT[3] and (
                    (g > 110 and b < 70 and r > 60) or (r > 150 and b < 90 and g < 170))
                day[y, x] = src[y, x]
                if r > 230 and g > 220 and b > 150:            # the sun becomes the moon
                    night[y, x] = (238, 232, 205, 255)
                else:
                    night[y, x] = (int(r * .16 + 6), int(g * .18 + 8), int(b * .34 + 22), 255)
                if not plant:
                    room_l[y, x] = (0, 0, 0, 0)
    # certificate: replace the gibberish heading with a plain title rule
    paper = tuple(int(v) for v in src[29, 304])
    rect(room_l, 297, 29, 322, 36, paper)
    rect(room_l, 300, 31, 319, 33, c("#4c3b45")); rect(room_l, 303, 34, 316, 35, c("#9c8a86"))
    return room_l, day, night

LAYERS = [("sky-night", sky(False)), ("stars-a", stars(1)), ("stars-b", stars(2)), ("sky-day", sky(True)),
          ("clouds", clouds()), ("room", room()), ("sunbeam", sunbeam()), ("night", night()),
          ("dark", dark()), ("glow", glow()), ("bulb", bulb())]

if PAINTED.exists():
    _room, _day, _night = painted_layers()
    LAYERS = [(n, {"room": _room, "sky-day": _day, "sky-night": _night}.get(n, a)) for n, a in LAYERS]

if __name__ == "__main__":
    out = ROOT / "ase/room.ase"
    write_ase(out, W, H, [(n, [Image.fromarray(a)]) for n, a in LAYERS])
    subprocess.run([str(ROOT / "scripts/export_room.sh")], check=True)
    print("wrote", out)
