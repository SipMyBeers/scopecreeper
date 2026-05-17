#!/usr/bin/env python3
"""Bake a swirl animation INTO an arcade sprite by rotating the
ORIGINAL screen interior pixels per frame.

Every pixel inside the screen rect moves because we crop a region
LARGER than the screen rect (overscan), rotate that, then center-crop
back. The corners of the destination rect get pixels from outside the
rect — which include some bezel/cabinet pixels that rotate into the
screen and read as "screen infection" without leaving holes.

Cabinet, cables, and bezel pixels OUTSIDE the screen rect stay
pixel-identical between frames.

Output: horizontal sprite sheet (W*frames × H) + JSON metadata.

Usage:
    python3 animate_swirl.py <input.png> <output_sheet.png> [frames=8]
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image


# Screen interior rect (where the actual swirl pixels live) in the
# 580x440 arcade asset. Measured from the magenta swirl blob bbox.
SCREEN = {
    "left":   0.300,
    "top":    0.290,
    "width":  0.195,
    "height": 0.205,
}


def _screen_rect(w: int, h: int) -> tuple[int, int, int, int]:
    x = int(SCREEN["left"] * w)
    y = int(SCREEN["top"] * h)
    width = int(SCREEN["width"] * w)
    height = int(SCREEN["height"] * h)
    return x, y, width, height


def _rotate_frame(base: Image.Image, angle: float) -> Image.Image:
    """Return a copy of base with the screen rect's interior rotated by
    `angle` degrees. Uses an overscan crop so the rotation never leaves
    empty corners — every pixel in the destination rect is filled."""
    w, h = base.size
    sx, sy, sw, sh = _screen_rect(w, h)

    # Overscan side = ceil(sqrt(w²+h²)) — the rotation diagonal. A crop
    # this size, when rotated by any angle, still fully covers the
    # destination sw × sh rect.
    diag = int(math.ceil(math.sqrt(sw * sw + sh * sh))) + 2
    half = diag // 2
    cx = sx + sw // 2
    cy = sy + sh // 2

    # Clamp the overscan crop to the image bounds.
    ox0 = max(0, cx - half)
    oy0 = max(0, cy - half)
    ox1 = min(w, cx + half)
    oy1 = min(h, cy + half)
    overscan = base.crop((ox0, oy0, ox1, oy1))

    # Rotate the overscan in place (keep its size).
    rotated = overscan.rotate(angle, resample=Image.NEAREST, expand=False)

    # Crop the screen-sized window from the center of the rotated overscan.
    rcx = rotated.size[0] // 2
    rcy = rotated.size[1] // 2
    interior = rotated.crop(
        (rcx - sw // 2, rcy - sh // 2,
         rcx - sw // 2 + sw, rcy - sh // 2 + sh)
    )

    out = base.copy()
    out.paste(interior, (sx, sy))
    return out


def make_frames(base: Image.Image, frames: int) -> list[Image.Image]:
    base_rgba = base.convert("RGBA")
    step = 360.0 / max(1, frames)
    return [_rotate_frame(base_rgba, i * step) for i in range(frames)]


def write_sprite_sheet(frames: list[Image.Image], sheet_path: Path) -> dict:
    w, h = frames[0].size
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * w, 0))
    sheet.save(sheet_path, optimize=True)
    return {
        "image": sheet_path.name,
        "frameCount": len(frames),
        "frameWidth": w,
        "frameHeight": h,
        "totalWidth": sheet.width,
        "totalHeight": sheet.height,
    }


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    frames = int(sys.argv[3]) if len(sys.argv) >= 4 else 8
    if not inp.exists():
        print(f"input not found: {inp}", file=sys.stderr)
        return 1
    out.parent.mkdir(parents=True, exist_ok=True)
    base = Image.open(inp)
    meta = write_sprite_sheet(make_frames(base, frames), out)
    out.with_suffix(".json").write_text(json.dumps(meta, indent=2))
    print(f"wrote {out} + {out.with_suffix('.json')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
