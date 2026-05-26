"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";

export default function ProActivatedBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { refresh } = useSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const purchase = searchParams.get("purchase");
    const product = searchParams.get("product");

    if (purchase === "success" && product === "pro") {
      setVisible(true);
      void refresh();

      // Clean URL params while preserving other query params
      const next = new URLSearchParams(searchParams.toString());
      next.delete("purchase");
      next.delete("product");
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });

      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, router, refresh]);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: "fixed",
        top: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        background: "rgba(0,0,0,0.92)",
        border: "1px solid #ffb000",
        color: "#ffb000",
        fontFamily: "var(--font-vt323), monospace",
        fontSize: "18px",
        letterSpacing: "0.18em",
        textShadow: "0 0 10px #ffb000",
        boxShadow: "0 0 28px rgba(255,176,0,0.45)",
        padding: "0.75rem 1.5rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      ▸ PRO ACTIVATED · unlimited scans, share links, all artifacts
    </div>
  );
}
