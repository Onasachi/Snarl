"""Draws the app icon: Bub, freed, on night. Run from the project root.

    python3 -I scripts/make-icons.py

The brand doc asks for one creature, freed, on night. Bub is the first creature every
player frees, and four beads survive being shrunk to a home-screen tile.

Everything stays inside the middle 60% of the square so a maskable icon can be cropped to
a circle without losing an eye. No dependencies: the PNGs are written by hand.
"""

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"

BG = (13, 21, 39)
# oklch(0.80 0.13 190) and oklch(0.91 0.05 190), the night theme's colour and tint for
# Bub's hue, resolved to sRGB here so the file needs no colour engine.
BEAD = (94, 212, 206)
STRING = (190, 236, 233)
EYE = BG

# Bub's solved layout, scaled into the middle of the square.
NODES = [(28.0, 31.85), (72.0, 31.85), (72.0, 68.15), (28.0, 68.15)]
EDGES = [(0, 1), (1, 2), (2, 3), (3, 0)]
BEAD_R = 8.0
STRING_W = 3.0
EYE_BEAD = 0

SS = 4  # supersampling factor, for edges that are not staircases


def blend(dst, src, alpha):
    return tuple(round(d + (s - d) * alpha) for d, s in zip(dst, src))


def draw(size: int) -> bytes:
    n = size * SS
    scale = n / 100.0
    pixels = [[BG] * n for _ in range(n)]

    def disc(cx, cy, r, colour):
        cx, cy, r = cx * scale, cy * scale, r * scale
        for y in range(max(0, int(cy - r - 1)), min(n, int(cy + r + 2))):
            for x in range(max(0, int(cx - r - 1)), min(n, int(cx + r + 2))):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                    pixels[y][x] = colour

    def capsule(ax, ay, bx, by, w, colour):
        ax, ay, bx, by, w = ax * scale, ay * scale, bx * scale, by * scale, w * scale / 2
        dx, dy = bx - ax, by - ay
        length2 = dx * dx + dy * dy
        lo_x, hi_x = int(min(ax, bx) - w - 1), int(max(ax, bx) + w + 2)
        lo_y, hi_y = int(min(ay, by) - w - 1), int(max(ay, by) + w + 2)
        for y in range(max(0, lo_y), min(n, hi_y)):
            for x in range(max(0, lo_x), min(n, hi_x)):
                px, py = x + 0.5 - ax, y + 0.5 - ay
                t = 0.0 if length2 == 0 else max(0.0, min(1.0, (px * dx + py * dy) / length2))
                if (px - t * dx) ** 2 + (py - t * dy) ** 2 <= w * w:
                    pixels[y][x] = colour

    for a, b in EDGES:
        capsule(*NODES[a], *NODES[b], STRING_W, STRING)
    for i, (x, y) in enumerate(NODES):
        r = BEAD_R * (1.32 if i == EYE_BEAD else 1.0)
        disc(x, y, r, BEAD)
        # The highlight every bead carries, at 32% of the radius, up and to the left.
        disc(x - r * 0.32, y - r * 0.36, r * 0.32, blend(BEAD, (255, 255, 255), 0.42))
        if i == EYE_BEAD:
            for side in (-1, 1):
                disc(x + side * r * 0.4, y + r * 0.04, r * 0.2, EYE)

    # Downsample: this is where the anti-aliasing comes from.
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            r = g = b = 0
            for sy in range(SS):
                for sx in range(SS):
                    pr, pg, pb = pixels[y * SS + sy][x * SS + sx]
                    r += pr
                    g += pg
                    b += pb
            count = SS * SS
            row += bytes((r // count, g // count, b // count, 255))
        rows.append(bytes(row))
    return b"".join(rows)


def png(size: int, raw: bytes) -> bytes:
    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")):
        path = OUT / name
        path.write_bytes(png(size, draw(size)))
        print(f"{path.relative_to(ROOT)}  {size}x{size}  {path.stat().st_size} bytes")


main()
