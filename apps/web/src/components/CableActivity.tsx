"use client";

import type { ScanState } from "@/hooks/useScanHistory";

/**
 * Overlays over the arcade's cable region. Pulses bright while a scan
 * is running. Idle otherwise (returns nothing visible).
 */
export default function CableActivity({ state }: { state: ScanState }) {
  if (state !== "scanning") return null;

  return (
    <svg
      aria-hidden
      className="absolute pointer-events-none"
      style={{
        left: "48%",
        top: "8%",
        width: "52%",
        height: "70%",
        overflow: "visible",
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {[
        { color: "#39ff14", d: "M 0 50 C 25 35, 45 20, 70 22 S 95 32, 100 28" },
        { color: "#ff007f", d: "M 0 55 C 20 60, 50 70, 75 65 S 95 55, 100 60" },
        { color: "#ffb000", d: "M 0 48 C 30 50, 55 38, 80 42 S 95 45, 100 44" },
        { color: "#00ffff", d: "M 0 60 C 25 78, 55 82, 80 76 S 95 70, 100 72" },
        { color: "#4d4dff", d: "M 0 45 C 20 30, 50 18, 78 24 S 95 30, 100 26" },
      ].map((wire, i) => (
        <path
          key={i}
          d={wire.d}
          stroke={wire.color}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          style={{
            color: wire.color,
            filter: `drop-shadow(0 0 2px ${wire.color}) drop-shadow(0 0 6px ${wire.color})`,
            strokeDasharray: "8 6",
            animation: `wire-pulse 1.1s linear ${i * 0.2}s infinite`,
            opacity: 0.95,
          }}
        />
      ))}
    </svg>
  );
}
