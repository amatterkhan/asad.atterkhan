"""Tiny pixel-art rig: shaded shape masks composed into a frame, with selective outlines.
Shapes are evaluated at pixel centres, so every frame is crisp, hand-sized pixel art."""
import math
import numpy as np


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [255], np.uint8)


class Frame:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = np.zeros((h, w, 4), np.uint8)
        self.Y, self.X = np.mgrid[0:h, 0:w] + 0.5

    # ---------------------------------------------------------------- masks
    def ellipse(self, cx, cy, rx, ry, rot=0.0):
        dx, dy = self.X - cx, self.Y - cy
        if rot:
            c, s = math.cos(rot), math.sin(rot)
            dx, dy = dx * c + dy * s, -dx * s + dy * c
        return (dx / rx) ** 2 + (dy / ry) ** 2 <= 1

    def capsule(self, x0, y0, x1, y1, r):
        vx, vy = x1 - x0, y1 - y0
        L = vx * vx + vy * vy or 1e-6
        t = np.clip(((self.X - x0) * vx + (self.Y - y0) * vy) / L, 0, 1)
        return (self.X - x0 - t * vx) ** 2 + (self.Y - y0 - t * vy) ** 2 <= r * r

    def limb(self, pts, r):
        m = np.zeros((self.h, self.w), bool)
        for a, b in zip(pts[:-1], pts[1:]):
            m |= self.capsule(*a, *b, r)
        return m

    def poly(self, pts):  # convex polygon, any winding
        m = np.ones((self.h, self.w), bool)
        sgn = None
        n = len(pts)
        area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
        sgn = 1 if area > 0 else -1
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            m &= sgn * ((x1 - x0) * (self.Y - y0) - (y1 - y0) * (self.X - x0)) >= 0
        return m

    def rect(self, x0, y0, x1, y1):
        return (self.X >= x0) & (self.X < x1) & (self.Y >= y0) & (self.Y < y1)

    def curve(self, p0, p1, p2, r0, r1, steps=24):
        """Quadratic bezier stroke tapering from r0 to r1 (tails). Returns mask and per-pixel t."""
        m = np.zeros((self.h, self.w), bool)
        tt = np.zeros((self.h, self.w))
        prev = p0
        for i in range(1, steps + 1):
            t = i / steps
            p = ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                 (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
            seg = self.capsule(*prev, *p, r0 + (r1 - r0) * t)
            tt[seg & ~m] = t
            m |= seg
            prev = p
        return m, tt

    # ---------------------------------------------------------------- paint
    def fill(self, mask, color):
        self.px[mask] = hexc(color) if isinstance(color, str) else color

    def shade(self, mask, ramp, cx, cy, rx, ry, light=(-0.55, -0.85), edge=True, bias=0.0):
        """Fill mask with a ramp (dark..light) lit from `light`, like a rounded volume."""
        nx, ny = (self.X - cx) / rx, (self.Y - cy) / ry
        t = np.clip(0.55 + bias - 0.42 * (nx * light[0] + ny * light[1]), 0, 0.999)
        idx = (t * len(ramp)).astype(int)
        cols = np.stack([hexc(c) for c in ramp])
        out = cols[idx]
        if edge:  # darker rim on the shadow side keeps forms readable at this size
            inner = mask.copy()
            inner[1:, :] &= mask[:-1, :]; inner[:-1, :] &= mask[1:, :]
            inner[:, 1:] &= mask[:, :-1]; inner[:, :-1] &= mask[:, 1:]
            rim = mask & ~inner & ((nx * light[0] + ny * light[1]) < 0.1)
            out[rim] = cols[np.maximum(idx[rim] - 1, 0)]
        self.px[mask] = out[mask]

    def outline(self, color="#1b1322"):
        a = self.px[..., 3] > 0
        n = np.zeros_like(a)
        n[1:, :] |= a[:-1, :]; n[:-1, :] |= a[1:, :]; n[:, 1:] |= a[:, :-1]; n[:, :-1] |= a[:, 1:]
        self.px[n & ~a] = hexc(color)

    def dot(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[int(y), int(x)] = hexc(color)

    def line(self, x0, y0, x1, y1, color):
        n = int(max(abs(x1 - x0), abs(y1 - y0), 1))
        for i in range(n + 1):
            self.dot(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), color)
