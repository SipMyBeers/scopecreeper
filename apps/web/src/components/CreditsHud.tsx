"use client";

import { useSession } from "@/hooks/useSession";

/**
 * Compact tier/quota display, top-right of the canvas. Renders three states:
 *  - PRO pill (active subscription)
 *  - legacy credits remaining (pre-pricing-flip purchasers carrying through)
 *  - free-tier scan count for the month
 *
 * onClick opens the upgrade modal (parent owns it).
 */
export default function CreditsHud({ onClick }: { onClick: () => void }) {
  const { session } = useSession();

  let label = "—";
  let color = "#39ff14";
  let aria = "Open upgrade modal";

  if (session) {
    if (session.isPro) {
      label = "▸ PRO";
      color = "#ffb000";
      aria = "Pro active";
    } else if (Number.isFinite(session.credits) && session.credits > 0) {
      // Legacy carrythrough path.
      label = `CREDITS · ${String(session.credits).padStart(3, "0")}`;
    } else {
      const remaining = session.freeScansRemaining ?? 5;
      const total = session.freeScansPerMonth ?? 5;
      label = `${remaining}/${total} FREE · UPGRADE`;
      color = remaining === 0 ? "#ff007f" : "#39ff14";
    }
  }

  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className="absolute top-3 right-3 z-40 px-2 py-1 border uppercase"
      style={{
        background: "rgba(0,0,0,0.6)",
        borderColor: `${color}80`,
        color,
        fontFamily: "var(--font-vt323), monospace",
        fontSize: 14,
        letterSpacing: "0.2em",
        textShadow: `0 0 6px ${color}`,
        backdropFilter: "blur(2px)",
      }}
    >
      {label}
    </button>
  );
}
