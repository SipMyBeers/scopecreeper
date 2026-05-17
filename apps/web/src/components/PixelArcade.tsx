"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { RatingTier } from "@/core";
import type { ScanState } from "@/hooks/useScanHistory";

/** Y-float intensity by state. */
const FLOAT_BY_STATE: Record<ScanState, number[]> = {
  idle: [0, -6, 0],
  scanning: [0, -12, 2, -8, 0],
  done: [0, -4, 0],
  error: [0, 4, 0, -4, 0],
  out_of_credits: [0, 2, 0, -2, 0],
};

/** Per-tier swirl-baked sprite sheet (8 frames each). The swirl
 *  interior rotates pixel-art-style; the cabinet itself stays static. */
const TIER_ANIM_SHEET: Record<RatingTier, string> = {
  corpse:    "/assets/arcade/arcade-corpse-anim.png",
  sweetspot: "/assets/arcade/arcade-sweetspot-anim.png",
  abyss:     "/assets/arcade/arcade-abyss-anim.png",
  delusion:  "/assets/arcade/arcade-delusion-anim.png",
};
const TIER_FRAMES = 8;

/** Legacy glow-pulse sheet used while a scan is in flight (no tier yet). */
const SCANNING_SHEET = "/assets/arcade/arcade-animated.png";
const SCANNING_FRAMES = 6;

/**
 * Arcade asset + animated screen overlay.
 *
 * When a tier is known we play the tier's swirl-baked sheet (8 frames,
 * screen-only rotation). While a scan is in flight (no tier), we play
 * the legacy 6-frame glow-pulse sheet. With no tier and no scan, we
 * fall back to the static base render.
 */
export function PixelArcade({
  state = "idle",
  tier,
  screenChildren,
}: {
  state?: ScanState;
  tier?: RatingTier | null;
  screenChildren?: ReactNode;
}) {
  const isScanning = state === "scanning";
  const tierSheet = tier ? TIER_ANIM_SHEET[tier] : null;

  // Pick the layer. Priority: scanning > tier > default-tier animation
  // (always animate, never freeze on a static frame).
  let sheetSrc: string;
  let frames: number;
  let cycleSec: number;
  if (isScanning) {
    sheetSrc = SCANNING_SHEET;
    frames = SCANNING_FRAMES;
    cycleSec = SCANNING_FRAMES * 0.12;
  } else if (tierSheet) {
    sheetSrc = tierSheet;
    frames = TIER_FRAMES;
    cycleSec = TIER_FRAMES * 0.2;
  } else {
    // Idle (no tier yet) — play the sweetspot animation as ambient demo.
    sheetSrc = TIER_ANIM_SHEET.sweetspot;
    frames = TIER_FRAMES;
    cycleSec = TIER_FRAMES * 0.25;
  }

  return (
    <motion.div
      animate={{ y: FLOAT_BY_STATE[state] }}
      transition={{
        duration: isScanning ? 0.6 : 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="relative w-full h-full"
      style={{
        imageRendering: "pixelated",
        animation:
          state === "scanning"
            ? "arcade-jitter 0.4s steps(1) infinite"
            : "arcade-jitter 4.2s steps(1) infinite",
      }}
    >
      <div
        aria-label="Pixel arcade machine"
        className="absolute inset-0 select-none"
        style={{
          backgroundImage: `url(${sheetSrc})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${frames * 100}% 100%`,
          animation: `${frames === 8 ? "arcade-anim-8" : "arcade-anim"} ${cycleSec}s steps(${frames}) infinite`,
          imageRendering: "pixelated",
        }}
      />

      {/* CRT screen window — only renders custom screenChildren on top.
          The swirl rotation is now baked into the sprite, so we don't
          render the default CSS swirl anymore. */}
      {screenChildren && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: "28%",
            top: "22%",
            width: "22%",
            height: "26%",
            borderRadius: "3% / 4%",
            boxShadow:
              "inset 0 0 8px rgba(0,0,0,0.85), inset 0 0 3px rgba(255,0,127,0.35)",
          }}
        >
          {screenChildren}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.55) 0 2px, transparent 2px 4px)",
              opacity: 0.35,
            }}
          />
        </div>
      )}

    </motion.div>
  );
}
