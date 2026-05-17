#!/usr/bin/env python3
"""Bake a swirl animation INTO an arcade sprite — every pixel inside the
CRT screen rectangle is procedurally regenerated per frame so the
entire rect moves. Cabinet, cables, bezel stay pixel-identical.

The swirl is a polar conic gradient sampled from the tier's dominant
colors (auto-detected from the source). Pixel (x,y) → color =
palette[ ((θ × ARMS + r × SWIRL_AMOUNT + frame_phase) mod 1) × palette_size ]
where (r, θ) are normalized polar coords relative to the screen-rect
center.

Output: horizontal sprite sheet (W*frames × H) + JSON metadata.

Usage:
    python3 animate_swirl.py <input.png> <output_sheet.png> [frames=8]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image
import numpy as np

# Screen-interior rectangle in the 580x440 arcade asset. Tight to the
# dark interior so we never overwrite cabinet/bezel pixels.
SCREEN = {
    "left":   0.300,
    "top":    0.290,
    "width":  0.195,
    "height": 0.205,
}

ARMS = 3.5            # how many spiral arms
SWIRL_AMOUNT = 1.4    # higher = tighter spiral
PALETTE_REPEAT = 1    # how many times palette repeats around the disk


def _screen_rect(w: int, h: int) -> tuple[int, int, int, int]:
    x = int(SCREEN["left"] * w)
    y = int(SCREEN["top"] * h)
    width = int(SCREEN["width"] * w)
    height = int(SCREEN["height"] * h)
    return x, y, width, height


def _sample_palette(base: Image.Image, rect: tuple[int, int, int, int]) -> np.ndarray:
    """Pull a 6-stop palette from the existing swirl pixels inside the
    rect so the procedural swirl colors match the tier."""
    x, y, w, h = rect
    crop = np.array(base.convert("RGBA").crop((x, y, x + w, y + h)))
    rgb = crop[..., :3]
    # Sort by hue-band and pick representative bright pixels.
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    sat = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(b - r)])
    bright = sat > 50
    if not bright.any():
        # Fall back to a generic neon palette.
        return np.array(
            [[20, 5, 30], [255, 0, 127], [40, 10, 60], [0, 255, 255],
             [20, 5, 30], [57, 255, 20]],
            dtype=np.uint8,
        )
    pix = rgb[bright]
    # k=6 mini-kmeans without sklearn: bucket by hue then average.
    hue = np.arctan2(g[bright].astype(float) - b[bright], r[bright].astype(float) - g[bright])
    hue = (hue + np.pi) / (2 * np.pi)  # [0,1)
    bins = np.linspace(0, 1, 7)
    palette = []
    for i in range(6):
        m = (hue >= bins[i]) & (hue < bins[i + 1])
        if m.any():
            palette.append(pix[m].mean(axis=0).astype(np.uint8))
        else:
            palette.append(np.array([20, 5, 30], dtype=np.uint8))
    # Inject a dark band between bright bands so the spiral reads.
    out = []
    for i, c in enumerate(palette):
        out.append(c)
        if i % 2 == 0:
            out.append(np.array([15, 4, 28], dtype=np.uint8))
    return np.array(out, dtype=np.uint8)


def _swirl_frame(w: int, h: int, phase: float, palette: np.ndarray) -> np.ndarray:
    """Render one swirl frame at the given phase ∈ [0, 1). Returns RGBA."""
    yy, xx = np.indices((h, w), dtype=np.float32)
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    dx = (xx - cx) / max(cx, cy)
    dy = (yy - cy) / max(cx, cy)
    r = np.sqrt(dx * dx + dy * dy)
    theta = np.arctan2(dy, dx) / (2 * np.pi) + 0.5  # [0,1)

    # Conic + spiral coordinate.
    u = (theta * ARMS + r * SWIRL_AMOUNT + phase) * PALETTE_REPEAT
    u = (u - np.floor(u))  # wrap to [0,1)
    idx = np.clip((u * len(palette)).astype(int), 0, len(palette) - 1)
    rgb = palette[idx]  # (h, w, 3)

    # Darken the edges so it looks like a CRT vignette.
    vign = np.clip(1.0 - np.power(r, 3.5), 0.15, 1.0)[..., None]
    rgb = (rgb.astype(np.float32) * vign).astype(np.uint8)

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., :3] = rgb
    out[..., 3] = 255
    return out


def make_frames(base: Image.Image, frames: int) -> list[Image.Image]:
    base_rgba = base.convert("RGBA")
    w, h = base_rgba.size
    sx, sy, sw, sh = _screen_rect(w, h)
    palette = _sample_palette(base_rgba, (sx, sy, sw, sh))
    out_frames: list[Image.Image] = []
    for i in range(frames):
        frame = base_rgba.copy()
        swirl_arr = _swirl_frame(sw, sh, i / frames, palette)
        swirl_img = Image.fromarray(swirl_arr, mode="RGBA")
        frame.paste(swirl_img, (sx, sy))  # opaque paste — fills full rect
        out_frames.append(frame)
    return out_frames


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
    json_path = out.with_suffix(".json")
    json_path.write_text(json.dumps(meta, indent=2))
    print(f"wrote {out} + {json_path}")
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
