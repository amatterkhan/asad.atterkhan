"""Asad's head, placed pixel by pixel (3/4 view, looking down-right at the laptop), after
art/references/asad-storm-cozy-reference.png: hair swept back off the forehead into a tie, curls at the
nape, a loose strand at the temple, thin round glasses, short jawline beard into a goatee, a small smile.
Edit the spans below (or the exported .ase in LibreSprite) to adjust a pixel."""
PAL = {
    "O": "#140f1c", "1": "#0d080b", "2": "#1a1113", "3": "#2a1c1a", "4": "#432b24", "5": "#64412f",
    "a": "#7c4631", "b": "#ad6844", "c": "#d18b5a", "d": "#e9a974", "g": "#17111d", "w": "#dfe5ff",
    "e": "#26140f", "m": "#74392d", "z": "#21151a", "y": "#3a251f", "t": "#5b4a8a",
}
W, H = 32, 31
_g = [["."] * W for _ in range(H)]
def s(y, x0, x1, ch):  # inclusive span
    for x in range(x0, x1 + 1):
        if 0 <= x < W: _g[y][x] = ch
def p(*pts):
    for (x, y, ch) in pts: _g[y][x] = ch

# --- hair mass, swept back (crown + back of the head) ---
for y, (x0, x1) in enumerate([(11, 19), (8, 23), (6, 26), (5, 28), (4, 29), (3, 29), (2, 29), (2, 29), (1, 16), (1, 14), (0, 12),
                               (0, 11), (0, 10), (0, 10), (0, 10), (0, 9), (0, 9), (1, 9), (1, 9), (1, 9), (1, 9), (2, 9), (2, 8),
                               (3, 8), (3, 7), (4, 7), (5, 6)]):
    s(y, x0, x1, "2")
    s(y, x0, x0, "1")
for (y, x0, x1) in [(1, 12, 17), (2, 14, 21), (3, 16, 25), (4, 18, 27), (5, 21, 28), (6, 24, 28)]:  # top, catching the light
    s(y, x0, x1, "3")
streaks = [(2, 11, 13, "4"), (3, 10, 14, "4"), (3, 15, 17, "5"), (4, 8, 11, "4"), (4, 12, 16, "5"), (4, 20, 23, "4"),
           (5, 6, 9, "4"), (5, 10, 13, "5"), (5, 17, 21, "5"), (5, 24, 26, "4"), (6, 4, 7, "4"), (6, 13, 17, "4"),
           (6, 21, 23, "5"), (7, 3, 5, "4"), (7, 9, 13, "3"), (7, 18, 20, "4")]
for (y, x0, x1, ch) in streaks: s(y, x0, x1, ch)
s(9, 1, 2, "t"); s(10, 0, 2, "t")  # the hair tie
for (y, x0, x1, ch) in [(12, 1, 3, "4"), (13, 4, 5, "4"), (14, 2, 3, "3"), (15, 5, 6, "4"), (16, 1, 2, "4"), (17, 3, 4, "3"),
                        (18, 6, 7, "4"), (19, 2, 3, "4"), (20, 5, 6, "3"), (21, 3, 4, "4"), (22, 6, 7, "4"), (23, 4, 5, "3"),
                        (24, 5, 6, "4")]:  # curls at the nape
    s(y, x0, x1, ch)
# far side of the head, a little hair beyond the face
for y in range(7, 14): s(y, 29, 30 if y < 12 else 29, "2")
p((30, 8, "3"), (30, 10, "3"))

# --- face ---
face = [(8, 16, 28), (9, 14, 28), (10, 13, 28), (11, 12, 28), (12, 11, 28), (13, 11, 28), (14, 11, 28), (15, 11, 28),
        (16, 11, 29), (17, 11, 29), (18, 11, 28), (19, 11, 28), (20, 12, 28), (21, 13, 28), (22, 14, 27), (23, 15, 27),
        (24, 16, 26), (25, 17, 25), (26, 19, 23)]
for (y, x0, x1) in face:
    s(y, x0, x1, "c")
    s(y, x0, x0, "b")
for (y, x0, x1) in [(8, 18, 25), (9, 16, 26), (10, 17, 22), (17, 21, 25), (18, 22, 25)]:  # forehead + cheek light
    s(y, x0, x1, "d")
s(7, 18, 27, "2"); s(8, 15, 15, "2"); s(8, 27, 28, "3"); s(9, 13, 13, "2")  # hairline
for (x, y) in [(13, 8), (12, 9), (12, 10), (11, 11), (11, 12), (12, 13)]: p((x, y, "2"))  # loose strand by the temple
# ear
s(13, 8, 10, "b"); s(14, 7, 10, "c"); s(15, 7, 10, "c"); s(16, 7, 10, "b"); s(17, 8, 10, "b"); s(18, 9, 10, "a")
p((8, 14, "d"), (9, 15, "a"), (9, 16, "a"), (7, 14, "O"), (7, 17, "O"), (8, 18, "O"))
# brows
s(9, 15, 18, "z"); p((14, 10, "z"), (19, 10, "y")); s(9, 23, 26, "z"); p((27, 10, "z"))
# glasses: two thin rings + bridge + arm to the ear
for (x0, x1) in [(13, 19), (22, 27)]:  # round rims: corners stepped in
    s(11, x0 + 2, x1 - 2, "g"); s(17, x0 + 2, x1 - 2, "g")
    p((x0 + 1, 12, "g"), (x1 - 1, 12, "g"), (x0 + 1, 16, "g"), (x1 - 1, 16, "g"))
    for y in range(13, 16): p((x0, y, "g"), (x1, y, "g"))
s(13, 20, 21, "g"); s(13, 10, 12, "g")
p((14, 12, "w"), (23, 12, "w"))
# nose (profile bump on the right) + nostril
p((29, 15, "c"), (29, 16, "c"), (30, 16, "b"), (30, 17, "O"), (29, 18, "a"), (28, 18, "b"), (31, 16, "O"), (30, 15, "O"))
# beard: jawline into a goatee, thin moustache, smile
for (y, x0, x1) in [(18, 11, 12), (19, 11, 13), (20, 12, 14), (21, 13, 15), (22, 14, 17), (23, 15, 18), (24, 16, 20), (25, 17, 25), (26, 19, 23)]:
    s(y, x0, x1, "y")
s(19, 25, 28, "y")
s(20, 23, 26, "m"); p((27, 19, "m"), (22, 20, "b"))
s(21, 21, 27, "c"); s(22, 21, 26, "z"); s(23, 21, 26, "z"); s(24, 21, 25, "z"); s(25, 21, 24, "z"); s(26, 21, 22, "z")
p((27, 21, "b"), (21, 22, "y"), (26, 24, "y"))
# chin/neck
for y in range(27, 31): s(y, 14, 21, "b"); s(y, 14, 15, "a")
p((22, 26, "a"))

HEAD = ["".join(r) for r in _g]
EYES_OPEN = [(16, 15, "e"), (17, 15, "e"), (25, 15, "e"), (26, 15, "e")]
EYES_UP = [(16, 14, "e"), (17, 14, "e"), (25, 14, "e"), (26, 14, "e")]
EYES_SHUT = [(15, 15, "a"), (16, 15, "a"), (17, 15, "a"), (24, 15, "a"), (25, 15, "a"), (26, 15, "a")]
