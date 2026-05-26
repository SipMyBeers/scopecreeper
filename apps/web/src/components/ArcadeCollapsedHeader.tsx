"use client";
import { motion } from "framer-motion";
import type { RatingTier } from "@/core";

const TIER_COLOR: Record<RatingTier, string> = {
  corpse:    "#888888",
  sweetspot: "#39ff14",
  abyss:     "#ffb000",
  delusion:  "#ff007f",
};

interface Props {
  score: number;
  tier: RatingTier;
  onNewScan: () => void;
}

export default function ArcadeCollapsedHeader({ score, tier, onNewScan }: Props) {
  const color = TIER_COLOR[tier];

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 50,
        height: 64,
        background: "rgba(0,0,0,0.92)",
        borderBottom: `1px solid ${color}40`,
        backdropFilter: "blur(4px)",
        boxShadow: `0 2px 16px ${color}22`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      {/* Left: score + tier badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
        <span
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            fontSize: 13,
            color,
            textShadow: `0 0 8px ${color}`,
            letterSpacing: "0.05em",
          }}
        >
          {score}/100
        </span>
        <span
          style={{
            fontFamily: "var(--font-vt323), monospace",
            fontSize: 15,
            color,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            border: `1px solid ${color}60`,
            padding: "2px 8px",
          }}
        >
          {tier}
        </span>
      </div>

      {/* Center: wordmark — absolutely positioned */}
      <span
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-press-start-2p), monospace",
          fontSize: 8,
          color: "rgba(255,255,255,0.22)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        SCOPE CREEPER
      </span>

      {/* Right: NEW SCAN button */}
      <button
        onClick={onNewScan}
        style={{
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 16,
          color,
          border: `1px solid ${color}60`,
          background: "transparent",
          padding: "6px 14px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          cursor: "pointer",
          textShadow: `0 0 6px ${color}`,
          boxShadow: `0 0 8px ${color}22`,
          zIndex: 1,
        }}
      >
        ▸ NEW SCAN
      </button>
    </motion.div>
  );
}
