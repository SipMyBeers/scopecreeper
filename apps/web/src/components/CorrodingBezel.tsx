"use client";

import { useEffect, useRef } from "react";

/**
 * Live pixel-corroding bezel.
 *
 * Loads bezel.png onto a <canvas>, then on every animation tick picks
 * ~250 random bezel pixels and:
 *   - kills them (alpha → 0)              ← decay
 *   - recolors them to a random neon hue  ← infection
 *   - restores them to the original color ← regrowth
 *
 * The asset itself never changes; only the live framebuffer does.
 */
export default function CorrodingBezel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let raf = 0;
    let stopped = false;

    const img = new Image();
    img.src = "/assets/bezel.png";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const w = canvas.width;
      const h = canvas.height;
      const live = ctx.getImageData(0, 0, w, h);
      const original = new Uint8ClampedArray(live.data);

      // Pre-compute the indices of pixels that are part of the bezel
      // (alpha > 0) so we can sample only those.
      const bezelIndices: number[] = [];
      for (let i = 3; i < original.length; i += 4) {
        if (original[i] > 0) bezelIndices.push(i - 3);
      }
      const N = bezelIndices.length;
      if (N === 0) return;

      const NEONS: Array<[number, number, number]> = [
        [57, 255, 20],   // green
        [255, 0, 127],   // magenta
        [0, 255, 255],   // cyan
        [255, 176, 0],   // amber
        [255, 60, 60],   // red
      ];

      const MUTATIONS_PER_TICK = 280;
      let frame = 0;

      const tick = () => {
        if (stopped) return;
        frame++;

        const data = live.data;
        for (let m = 0; m < MUTATIONS_PER_TICK; m++) {
          const base = bezelIndices[(Math.random() * N) | 0];
          const action = Math.random();
          if (action < 0.45) {
            // Kill pixel
            data[base + 3] = 0;
          } else if (action < 0.75) {
            // Infect — replace with a random neon at full alpha
            const c = NEONS[(Math.random() * NEONS.length) | 0];
            data[base] = c[0];
            data[base + 1] = c[1];
            data[base + 2] = c[2];
            data[base + 3] = 255;
          } else {
            // Restore from original
            data[base]     = original[base];
            data[base + 1] = original[base + 1];
            data[base + 2] = original[base + 2];
            data[base + 3] = original[base + 3];
          }
        }

        // Slow ambient regrowth — once every ~10 frames, restore an
        // extra batch so the bezel doesn't decay into nothing.
        if (frame % 10 === 0) {
          for (let m = 0; m < 600; m++) {
            const base = bezelIndices[(Math.random() * N) | 0];
            data[base]     = original[base];
            data[base + 1] = original[base + 1];
            data[base + 2] = original[base + 2];
            data[base + 3] = original[base + 3];
          }
        }

        ctx.putImageData(live, 0, 0);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        imageRendering: "pixelated",
        objectFit: "fill",
        filter:
          "drop-shadow(0 0 6px rgba(255,0,127,0.45)) drop-shadow(0 0 10px rgba(57,255,20,0.35))",
        zIndex: 20,
      }}
    />
  );
}
