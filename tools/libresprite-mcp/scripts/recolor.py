#!/usr/bin/env python3
"""Recolor an arcade-style PNG into a tier palette.

Each tier shifts the dominant neon hues (magenta + cyan + green) to a
tier-appropriate palette while preserving anti-aliased edges and alpha.

Usage:
    python3 recolor.py <input.png> <output.png> <tier>
        tier in: corpse | sweetspot | abyss | delusion
"""

import sys
from pathlib import Path
from typing import Tuple

from PIL import Image
import numpy as np


# Tier → (magenta_replacement, cyan_replacement, green_replacement, amber_replacement)
# Each replacement is an RGB triple. We map the original brand neons
# (magenta=#ff007f, cyan=#00ffff, green=#39ff14, amber=#ffb000) onto the
# tier's palette, preserving luminance.
PALETTES = {
    # CORPSE — desaturated grey/blue, low energy
    "corpse": dict(
        magenta=(120, 100, 130),
        cyan=(140, 160, 170),
        green=(110, 130, 110),
        amber=(160, 150, 130),
    ),
    # SWEETSPOT — bright neon green dominant
    "sweetspot": dict(
        magenta=(57, 255, 80),
        cyan=(120, 255, 180),
        green=(57, 255, 20),
        amber=(180, 255, 60),
    ),
    # ABYSS — amber/yellow warning palette
    "abyss": dict(
        magenta=(255, 176, 0),
        cyan=(255, 220, 60),
        green=(255, 200, 40),
        amber=(255, 176, 0),
    ),
    # DELUSION — original magenta/cyan but pushed redder / hotter
    "delusion": dict(
        magenta=(255, 30, 110),
        cyan=(255, 80, 200),
        green=(255, 0, 130),
        amber=(255, 60, 60),
    ),
}


def _closest(c: Tuple[int, int, int], anchors: dict) -> str:
    """Return the anchor name closest to color `c` in hue space."""
    r, g, b = c
    # Quick & dirty: which brand neon is `c` nearest to?
    anchor_rgbs = {
        "magenta": (255, 0, 127),
        "cyan": (0, 255, 255),
        "green": (57, 255, 20),
        "amber": (255, 176, 0),
    }
    best_name = "magenta"
    best_d = 1 << 30
    for name, (ar, ag, ab) in anchor_rgbs.items():
        d = (r - ar) ** 2 + (g - ag) ** 2 + (b - ab) ** 2
        if d < best_d:
            best_d = d
            best_name = name
    return best_name


def recolor(input_path: Path, output_path: Path, tier: str) -> None:
    if tier not in PALETTES:
        raise ValueError(f"unknown tier {tier!r}; expected one of {list(PALETTES)}")
    pal = PALETTES[tier]
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    H, W = arr.shape[:2]
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    a = arr[..., 3]

    # Build masks for each neon hue. We look for highly-saturated pixels
    # in the expected hue band — anti-aliased edges keep their alpha.
    sat = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(b - r)])

    magenta_mask = (r > 170) & (g < 130) & (b > 90) & (sat > 60)
    cyan_mask    = (r < 130) & (g > 170) & (b > 170) & (sat > 60)
    green_mask   = (r < 150) & (g > 200) & (b < 150) & (sat > 60)
    amber_mask   = (r > 200) & (g > 130) & (g < 210) & (b < 90) & (sat > 60)

    out = arr.copy()

    def repaint(mask: np.ndarray, replacement: Tuple[int, int, int]) -> None:
        if not mask.any():
            return
        # Preserve luminance — blend the replacement RGB with the source
        # luminance so highlights remain bright and shadows dark.
        lum = (r[mask] * 0.3 + g[mask] * 0.59 + b[mask] * 0.11) / 255.0
        # mix replacement * lum_scale
        out[mask, 0] = np.clip(replacement[0] * lum, 0, 255).astype(np.uint8)
        out[mask, 1] = np.clip(replacement[1] * lum, 0, 255).astype(np.uint8)
        out[mask, 2] = np.clip(replacement[2] * lum, 0, 255).astype(np.uint8)
        # Alpha untouched.

    repaint(magenta_mask, pal["magenta"])
    repaint(cyan_mask,    pal["cyan"])
    repaint(green_mask,   pal["green"])
    repaint(amber_mask,   pal["amber"])

    out[..., 3] = a
    Image.fromarray(out).save(output_path, optimize=True)


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__, file=sys.stderr)
        return 2
    inp, out, tier = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    if not inp.exists():
        print(f"input not found: {inp}", file=sys.stderr)
        return 1
    out.parent.mkdir(parents=True, exist_ok=True)
    recolor(inp, out, tier)
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
