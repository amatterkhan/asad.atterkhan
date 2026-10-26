"""Asad, 48x48, hand-placed pixel art after art/references/asad-sprite-sheet-reference.png.
Each part is a dict {(x, y): colour key}. Poses are built from parts with small offsets, so the
animation moves like a puppet: breathing, nods, blinks, typing fingers, a coffee sip, a happy heart.
scripts/build_asad.py hands these pixels to LibreSprite, which draws them into layered .ase files."""

PAL = {
    "K": "#1a1220",
    "h": "#1c1416", "H": "#2c201e", "j": "#47302a", "J": "#7a4c33",           # hair
    "s": "#f2b583", "S": "#df9564", "T": "#b96f49", "U": "#8a4c34",           # skin
    "b": "#33201c", "g": "#3a2318", "w": "#fbf3e4", "e": "#22130f",           # beard, glasses, glint, eye
    "o": "#2d2c40", "O": "#1e1d2c", "p": "#44435e", "t": "#22212f", "d": "#dccfb5",  # hoodie, tee, strings
    "n": "#2e3a6a", "N": "#1f284b", "q": "#45539a", "x": "#ece6dd", "X": "#b9b0a6",  # jeans, shoes
    "l": "#353b6e", "L": "#262a52", "m": "#4d56a0", "k": "#191b33", "z": "#e2e6fa",  # laptop
    "c": "#f1e6d1", "C": "#c8b79c", "f": "#5b3a2a",                           # mug
    "r": "#f38ba8", "R": "#d2607e", "v": "#cba6f7",                           # heart, note
}

def part():
    return {}

def span(P, y, x0, x1, ch):
    for x in range(x0, x1 + 1):
        P[(x, y)] = ch

def dots(P, ch, *pts):
    for (x, y) in pts:
        P[(x, y)] = ch

# ------------------------------------------------------------------ legs (crossed)
LEGS = part()
for y, (x0, x1) in zip(range(37, 46), [(10, 39), (8, 41), (6, 43), (5, 44), (5, 44), (5, 44), (6, 43), (7, 42), (9, 40)]):
    span(LEGS, y, x0, x1, "n")
for y, (x0, x1) in zip(range(37, 40), [(10, 16), (8, 13), (7, 10)]): span(LEGS, y, x0, x1, "q")        # near knee light
for y, (x0, x1) in zip(range(37, 40), [(34, 39), (37, 41), (40, 42)]): span(LEGS, y, x0, x1, "q")      # far knee light
for y in range(43, 46): span(LEGS, y, 6 + (y - 43), 42 - (y - 43), "N")                              # under-shadow
for i in range(7): dots(LEGS, "N", (13 + i * 2, 39 + i), (14 + i * 2, 39 + i), (36 - i * 2, 39 + i))     # crossing folds
span(LEGS, 42, 19, 24, "x"); span(LEGS, 43, 18, 25, "x"); span(LEGS, 44, 18, 25, "X"); span(LEGS, 45, 19, 24, "X")
dots(LEGS, "X", (19, 42), (18, 43)); dots(LEGS, "N", (25, 42), (26, 43))

# ------------------------------------------------------------------ body (hoodie, tee, strings)
BODY = part()
for y, (x0, x1) in zip(range(24, 40), [(15, 30), (13, 31), (12, 32), (11, 33)] + [(11, 33)] * 9 + [(12, 32)] * 3):
    span(BODY, y, x0, x1, "o")
for y in range(25, 40): span(BODY, y, 11 if y > 26 else 13, 13, "O"); span(BODY, y, 31, 33 if y > 26 else 31, "O")
span(BODY, 25, 14, 19, "p"); span(BODY, 26, 13, 17, "p")
for y in range(25, 38): span(BODY, y, 22, 27, "t")
for y in range(25, 39): dots(BODY, "p", (21, y), (28, y))
for y in range(26, 32): dots(BODY, "d", (22, y), (27, y))
dots(BODY, "X", (22, 32), (27, 32))
span(BODY, 24, 15, 20, "O"); span(BODY, 24, 27, 30, "O")                                              # hood behind the neck

# ------------------------------------------------------------------ laptop (lid back toward us)
LAPTOP = part()
rows = {27: (25, 32), 28: (25, 36), 29: (25, 40), 30: (25, 40), 31: (25, 40), 32: (25, 40), 33: (25, 41), 34: (25, 41),
        35: (26, 41), 36: (26, 41), 37: (26, 41), 38: (26, 41), 39: (26, 36)}
for y, (x0, x1) in rows.items():
    span(LAPTOP, y, x0, x1, "l"); dots(LAPTOP, "L", (x0, y))
span(LAPTOP, 27, 26, 32, "m"); span(LAPTOP, 28, 32, 36, "m"); span(LAPTOP, 29, 36, 40, "m")
for y in range(30, 39): dots(LAPTOP, "m", (41 if y > 32 else 40, y))
span(LAPTOP, 39, 26, 41, "k"); span(LAPTOP, 40, 20, 41, "k")
dots(LAPTOP, "z", (33, 33), (34, 33), (33, 34), (34, 34), (34, 32))

# ------------------------------------------------------------------ arm poses
def arm(pose):
    A = part()
    if pose == "type":
        for y, (x0, x1) in zip(range(27, 37), [(10, 14), (9, 14), (9, 14), (9, 14), (9, 14), (9, 15), (10, 17), (11, 20), (13, 22), (16, 22)]):
            span(A, y, x0, x1, "o")
        for y in range(27, 33): dots(A, "O", (9 if y > 27 else 10, y))
        span(A, 36, 16, 22, "O"); span(A, 35, 13, 15, "O"); dots(A, "p", (11, 28), (11, 29), (12, 27))
        span(A, 34, 23, 26, "S"); span(A, 35, 23, 27, "S"); span(A, 36, 23, 27, "T"); dots(A, "s", (24, 34), (25, 34))
    elif pose == "hold":      # mug held at the chest
        for y, (x0, x1) in zip(range(27, 36), [(10, 14), (9, 14), (9, 14), (9, 14), (9, 15), (10, 18), (12, 21), (15, 21), (17, 20)]):
            span(A, y, x0, x1, "o")
        for y in range(27, 32): dots(A, "O", (9 if y > 27 else 10, y))
        mug(A, 21, 28); span(A, 32, 19, 21, "S"); span(A, 33, 19, 21, "T")
    elif pose == "sip":       # forearm raised, mug at the mouth
        for y, (x0, x1) in zip(range(21, 33), [(22, 25), (20, 26), (18, 26), (16, 25), (14, 23), (12, 21), (10, 19), (9, 17),
                                             (9, 15), (9, 14), (9, 14), (10, 14)]):
            span(A, y, x0, x1, "o")
        for y in range(27, 33): dots(A, "O", (9 if y > 27 else 10, y))
        dots(A, "p", (19, 22), (17, 24), (15, 26))
        span(A, 20, 25, 27, "S"); span(A, 21, 26, 28, "S"); span(A, 22, 26, 27, "T")
        mug(A, 28, 16)
    elif pose == "chin":      # thinking: hand under the chin
        for y, (x0, x1) in zip(range(27, 36), [(10, 14), (9, 15), (9, 16), (10, 18), (11, 19), (13, 20), (15, 21), (17, 22), (19, 22)]):
            span(A, y, x0, x1, "o")
        for y in range(24, 31): span(A, y, 19, 22, "o")
        span(A, 22, 20, 24, "S"); span(A, 23, 19, 24, "S"); dots(A, "T", (19, 23), (20, 24), (21, 24)); dots(A, "s", (21, 22), (22, 22))
    return A

def mug(A, x, y):
    for yy in range(y, y + 6): span(A, yy, x, x + 4, "c")
    span(A, y, x, x + 4, "f"); dots(A, "C", *[(x + 4, yy) for yy in range(y + 1, y + 6)])
    dots(A, "c", (x + 5, y + 2), (x + 6, y + 3), (x + 5, y + 4)); dots(A, "C", (x + 6, y + 2), (x + 6, y + 4))

# ------------------------------------------------------------------ face (skin, ear, beard, glasses, eyes)
def face(eyes="down"):
    F = part()
    for y, (x0, x1) in zip(range(9, 24), [(22, 30), (20, 31), (19, 32), (18, 32), (18, 33), (18, 33), (18, 33), (18, 33),
                                        (18, 32), (19, 32), (19, 31), (20, 31), (21, 30), (22, 29), (24, 27)]):
        span(F, y, x0, x1, "S"); dots(F, "T", (x0, y))
    span(F, 10, 25, 30, "s"); span(F, 11, 27, 31, "s"); span(F, 18, 29, 31, "s")
    span(F, 10, 20, 23, "T"); span(F, 11, 19, 21, "T")                                          # shadow under the fringe
    for y, (x0, x1) in zip(range(13, 19), [(16, 17), (15, 18), (15, 18), (15, 18), (16, 18), (17, 18)]):
        span(F, y, x0, x1, "S")                                                                 # ear
    dots(F, "T", (15, 14), (15, 15), (15, 16), (16, 17), (16, 13)); dots(F, "U", (17, 15), (17, 16))
    dots(F, "S", (34, 15), (34, 16)); dots(F, "T", (33, 17), (34, 17))                          # nose
    for y, (x0, x1) in zip(range(18, 25), [(18, 19), (19, 21), (19, 22), (20, 23), (21, 29), (22, 28), (24, 27)]):
        span(F, y, x0, x1, "b")                                                                 # jawline beard
    span(F, 19, 28, 31, "b"); dots(F, "U", (28, 20), (29, 20), (30, 20)); dots(F, "b", (31, 20))   # moustache, smile
    span(F, 21, 24, 27, "S"); span(F, 22, 25, 26, "b")                                          # lip, goatee
    for y in range(23, 26): span(F, y, 21, 26, "T")                                             # neck
    # big round glasses: near lens 7x7, far lens 5x6, bridge, arm back to the ear
    span(F, 11, 21, 25, "g"); span(F, 17, 21, 25, "g")
    for y in range(12, 17): dots(F, "g", (20, y), (26, y))
    span(F, 11, 29, 32, "g"); span(F, 17, 29, 32, "g")
    for y in range(12, 17): dots(F, "g", (28, y), (33, y))
    dots(F, "g", (27, 13), (19, 13), (18, 13))
    dots(F, "w", (21, 12), (22, 12), (29, 12))
    span(F, 9, 21, 25, "h"); dots(F, "h", (20, 10)); span(F, 9, 29, 32, "h")                    # brows
    E = {"down": [(23, 15), (24, 15), (23, 16), (24, 16), (30, 15), (31, 15), (30, 16), (31, 16)],
         "up": [(22, 13), (23, 13), (22, 14), (23, 14), (30, 13), (31, 13), (30, 14), (31, 14)],
         "shut": [], "happy": []}[eyes]
    for (x, y) in E: F[(x, y)] = "e"
    if E: dots(F, "w", (E[0][0], E[0][1]), (E[4][0], E[4][1]))
    if eyes == "shut":
        span(F, 15, 22, 25, "U"); span(F, 15, 29, 32, "U")
    if eyes == "happy":
        dots(F, "e", (22, 15), (23, 14), (24, 14), (25, 15), (29, 15), (30, 14), (31, 14), (32, 15))
    return F

# ------------------------------------------------------------------ hair (big wavy mop, tied low at the back)
HAIR_ROWS = [(17, 21), (14, 29), (12, 31), (10, 32), (9, 33), (8, 34), (7, 35), (7, 35), (6, 35), (6, 21), (6, 19), (5, 18),
             (5, 15), (5, 15), (5, 15), (5, 15), (6, 15), (6, 16), (6, 16), (7, 17), (7, 17), (8, 17), (9, 16), (10, 15), (11, 14)]
def hair(sway=0):
    R = part()
    for i, (x0, x1) in enumerate(HAIR_ROWS):
        y = 1 + i
        lean = sway if y > 14 else 0
        span(R, y, x0 + lean, x1 + lean, "h")
    span(R, 0, 18, 20, "h"); span(R, 1, 24, 27, "h")                                          # tufts on the crown
    for y in range(10, 16): span(R, y, 33, 35 - (y > 13), "h")                                  # far side behind the face
    for (x, y) in [(4, 12), (4, 15), (5, 19), (6, 22), (36, 8), (34, 4), (8, 25)]:                # stray curls on the edge
        dots(R, "h", (x + (sway if y > 14 else 0), y))
    # wavy strands sweeping back from the parting: continuous lines, lit from the top right
    def stroke(pts, ch, lean=0):
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            n = max(abs(x1 - x0), abs(y1 - y0), 1)
            for i in range(n + 1):
                x, y = round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)
                R[(x + (lean if y > 14 else 0), y)] = ch
    stroke([(28, 2), (23, 3), (18, 5), (14, 8), (12, 11)], "j")
    stroke([(26, 2), (22, 3)], "J")
    stroke([(32, 5), (27, 5), (22, 6), (18, 8)], "j")
    stroke([(30, 5), (27, 5)], "J")
    stroke([(20, 2), (15, 4), (11, 7), (9, 10)], "H")
    stroke([(34, 8), (30, 8)], "H")
    for k, x0 in enumerate((9, 12)):                                                            # wavy locks down the back
        pts = [(x0 + (1 if (y // 3) % 2 else 0), y) for y in range(12, 25, 1)]
        stroke(pts, "j" if k else "H", sway)
    for (x, y) in [(10, 16), (13, 19), (9, 21), (12, 23)]:
        dots(R, "J", (x + sway, y))
    span(R, 3, 13, 16, "H"); span(R, 2, 15, 19, "H")
    dots(R, "v", (6, 14), (6, 15), (7, 15))                                                     # hair tie
    # fringe: locks sweeping right over the forehead and one by the temple
    span(R, 9, 21, 27, "h"); span(R, 10, 23, 25, "h"); dots(R, "H", (24, 11), (25, 10), (26, 9)); dots(R, "j", (22, 9), (24, 9))
    dots(R, "h", (20, 11), (19, 12), (19, 13)); dots(R, "h", (34, 9), (35, 10), (35, 11), (34, 12))
    return R

# ------------------------------------------------------------------ fx
def heart(dy=0):
    F = part()
    dots(F, "r", (37, 6 + dy), (38, 5 + dy), (40, 5 + dy), (41, 6 + dy), (38, 7 + dy), (39, 6 + dy), (40, 7 + dy),
         (37, 7 + dy), (41, 7 + dy), (38, 8 + dy), (39, 8 + dy), (40, 8 + dy), (39, 9 + dy), (39, 7 + dy))
    dots(F, "R", (40, 8 + dy), (41, 7 + dy), (39, 9 + dy)); dots(F, "w", (38, 6 + dy))
    return F

def note(dy=0):
    F = part()
    dots(F, "v", (39, 4 + dy), (40, 4 + dy), (41, 5 + dy), (39, 5 + dy), (39, 6 + dy), (39, 7 + dy), (38, 8 + dy), (37, 8 + dy), (38, 7 + dy))
    return F

def dots3(n):
    F = part()
    for i in range(n): dots(F, "v", (36 + i * 2, 9))
    return F

# ------------------------------------------------------------------ frames
LAYERS = ["legs", "body", "laptop", "face", "hair", "arm", "fx"]

def frame(arm_pose="type", eyes="down", breath=0, nod=0, sway=0, fx=None, finger=0, laptop=True):
    """Returns {layer: part}. breath/nod lift (negative) or drop the upper body and head."""
    def shift(P, dx, dy):
        return {(x + dx, y + dy): c for (x, y), c in P.items()}
    up = breath
    a = arm(arm_pose)
    if arm_pose == "type" and finger:
        a = dict(a)
        for x in range(23, 28):
            if (x + finger) % 2: a[(x, 36)] = "S"
        a[(23 + finger % 4, 34)] = "s"
    return {
        "legs": LEGS,
        "body": shift(BODY, 0, up),
        "laptop": LAPTOP if laptop else {},
        "arm": shift(a, 0, up),
        "face": shift(face(eyes), 0, up + nod),
        "hair": shift(hair(sway), 0, up + nod),
        "fx": fx or {},
    }

TYPE = [frame(finger=i % 4, breath=-1 if (i // 4) % 2 else 0, nod=1 if i in (5, 6) else 0, eyes="shut" if i == 10 else "down",
              sway=1 if i % 8 >= 4 else 0) for i in range(16)]
COFFEE = ([frame("type")] * 2 + [frame("hold", eyes="down"), frame("hold", eyes="up", breath=-1),
          frame("sip", eyes="shut"), frame("sip", eyes="shut", breath=-1), frame("sip", eyes="shut"), frame("sip", eyes="shut", breath=-1),
          frame("hold", eyes="up"), frame("hold", eyes="down", breath=-1), frame("type")])
IDLE = ([frame("chin", eyes="up", breath=-1 if i % 4 < 2 else 0, fx=dots3(min(3, i // 2)) if i >= 2 else None) for i in range(8)]
        + [frame("type", eyes="down", sway=i % 2, fx=note(-(i % 3))) for i in range(6)]
        + [frame("chin", eyes="shut")] + [frame("chin", eyes="up")])
HAPPY = [frame("type", eyes="happy", fx=heart(-(i % 2)), breath=-1 if i % 2 else 0) for i in range(6)] + [frame("type")]

ANIMS = {"asad-typing": (TYPE, 130), "asad-coffee": (COFFEE, 230), "asad-idle": (IDLE, 260), "asad-happy": (HAPPY, 200)}
SIZE, FEET = 48, 45
