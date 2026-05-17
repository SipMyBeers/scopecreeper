#!/usr/bin/env python3
"""Generate an N-frame animated sprite sheet from a base arcade PNG.

The animation simulates a powered-on CRT scanning: per-frame pixel
jitter, glow intensity modulation, and chromatic-aberration offset on
the magenta swirl region. Output is a horizontal sprite sheet PNG of
size (W * frames) x H, plus a sidecar JSON with frame metadata so the
React app can play it.

Usage:
    python3 animate.py <input.png> <output_sheet.png> [frames]
        frames defaults to 4
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter
import numpy as np


def _jitter(arr: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """Roll the image by (dx, dy) and zero the wrap-around alpha."""
    out = np.roll(arr, shift=(dy, dx), axis=(0, 1))
    # Zero alpha in wrap-around strips to prevent ghosts on the edges.
    if dy > 0:
        out[:dy, :, 3] = 0
    elif dy < 0:
        out[dy:, :, 3] = 0
    if dx > 0:
        out[:, :dx, 3] = 0
    elif dx < 0:
        out[:, dx:, 3] = 0
    return out


def _glow(img: Image.Image, intensity: float) -> Image.Image:
    """Add a soft outer glow proportional to intensity (0..1)."""
    if intensity <= 0:
        return img.copy()
    radius = 2 + intensity * 4
    glowed = img.filter(ImageFilter.GaussianBlur(radius=radius))
    # Blend the glow on top using SCREEN (additive-ish for RGBA).
    return ImageChops.screen(img.convert("RGBA"), glowed.convert("RGBA"))


def make_frames(base: Image.Image, frames: int) -> list[Image.Image]:
    """Generate `frames` per-frame variants of `base`."""
    np.random.seed(42)  # deterministic frames
    base_arr = np.array(base.convert("RGBA"), dtype=np.int16)
    out: list[Image.Image] = []
    for i in range(frames):
        # Slight integer jitter (±1px) for screen flicker.
        dx = int((np.random.rand() - 0.5) * 2.4)
        dy = int((np.random.rand() - 0.5) * 1.5)
        arr = _jitter(base_arr.copy(), dx, dy)
        # Brightness pulse on a sine wave so the cabinet breathes.
        phase = i / max(1, frames)
        pulse = 0.85 + 0.15 * np.sin(phase * np.pi * 2)
        arr[..., :3] = np.clip(arr[..., :3] * pulse, 0, 255)
        img = Image.fromarray(arr.astype(np.uint8))
        # Periodic glow burst on odd frames.
        if i % 2 == 1:
            img = _glow(img, intensity=0.4)
        out.append(img)
    return out


def write_sprite_sheet(frames: list[Image.Image], sheet_path: Path) -> dict:
    """Write a horizontal sprite sheet and return its JSON metadata."""
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
    frames = int(sys.argv[3]) if len(sys.argv) >= 4 else 4
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
