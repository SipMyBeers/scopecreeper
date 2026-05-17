"use client";

import { useSession } from "@/hooks/useSession";

/**
 * Compact credit balance display, top-right of the canvas.
 * onClick is wired up by the parent (Hero) to open the buy modal.
 */
export default function CreditsHud({ onClick }: { onClick: () => void }) {
  const { session } = useSession();
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 z-40 px-2 py-1 border uppercase"
      style={{
        background: "rgba(0,0,0,0.6)",
        borderColor: "rgba(57,255,20,0.5)",
        color: "#39ff14",
        fontFamily: "var(--font-vt323), monospace",
        fontSize: 14,
        letterSpacing: "0.2em",
        textShadow: "0 0 6px #39ff14",
        backdropFilter: "blur(2px)",
      }}
    >
      {session
        ? `CREDITS · ${String(session.credits).padStart(3, "0")}`
        : "CREDITS · ---"}
    </button>
  );
}
