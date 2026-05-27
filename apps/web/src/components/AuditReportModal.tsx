"use client";

import { useEffect } from "react";
import type { AuditReport, AuditFinding } from "@/lib/api";

const SEV_COLOR: Record<AuditFinding["severity"], string> = {
  high: "#ff007f",
  warn: "#ffb000",
  info: "#39ff14",
};

const CAT_LABEL: Record<AuditFinding["category"], string> = {
  SECRET:         "SECRET",
  TODO_DENSITY:   "TODO DENSITY",
  DEAD_TEST:      "DEAD TEST",
  DEAD_CODE:      "DEAD CODE",
  DEP_AGE:        "DEP AGE",
  MIXED_CONCERNS: "MIXED CONCERNS",
};

function severityRank(s: AuditFinding["severity"]): number {
  return s === "high" ? 0 : s === "warn" ? 1 : 2;
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function tierForScore(score: number): { label: string; color: string } {
  if (score >= 96) return { label: "DELUSION",  color: "#ff007f" };
  if (score >= 71) return { label: "ABYSS",     color: "#ffb000" };
  if (score >= 31) return { label: "SWEETSPOT", color: "#39ff14" };
  return                  { label: "CORPSE",    color: "#888888" };
}

export default function AuditReportModal({
  report,
  onClose,
}: {
  report: AuditReport;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tier = tierForScore(report.delusionScore);

  const sorted = [...report.findings].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity)
  );

  const fontMono = "var(--font-vt323), monospace";
  const fontPixel = "var(--font-press-start-2p), monospace";

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black"
      style={{
        background:
          "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
        fontFamily: fontMono,
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Deep audit report"
    >
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">

        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <div
              style={{
                fontFamily: fontPixel,
                fontSize: "clamp(11px, 1.6vw, 16px)",
                color: tier.color,
                textShadow: `0 0 10px ${tier.color}`,
                letterSpacing: "0.08em",
              }}
            >
              DEEP AUDIT
            </div>
            <div
              style={{
                fontFamily: fontMono,
                fontSize: "clamp(16px, 2.2vw, 22px)",
                color: "#e8ffe8",
                textShadow: "0 0 4px #39ff14",
                letterSpacing: "0.05em",
              }}
            >
              {report.repo}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-0.5">
              <span
                style={{
                  fontFamily: fontPixel,
                  fontSize: "clamp(28px, 4vw, 48px)",
                  color: tier.color,
                  textShadow: `0 0 14px ${tier.color}`,
                  lineHeight: 1,
                }}
              >
                {String(report.delusionScore).padStart(3, "0")}
              </span>
              <span
                className="uppercase tracking-widest"
                style={{ fontSize: 11, color: tier.color }}
              >
                {tier.label}
              </span>
            </div>

            <button
              onClick={onClose}
              className="px-3 py-1.5 border uppercase tracking-widest self-start"
              style={{
                borderColor: "#39ff14",
                color: "#39ff14",
                background: "rgba(0,0,0,0.6)",
                fontFamily: fontMono,
                fontSize: 14,
                textShadow: "0 0 6px #39ff14",
              }}
              aria-label="Close audit report"
            >
              [ESC] CLOSE
            </button>
          </div>
        </header>

        <div
          className="flex gap-6 flex-wrap border-b pb-4"
          style={{
            borderColor: "rgba(57,255,20,0.25)",
            color: "#aaffaa",
            fontSize: 15,
            letterSpacing: "0.06em",
          }}
        >
          <span>{report.filesScanned} FILES</span>
          <span>{report.findings.length} FINDINGS</span>
          <span>{fmtBytes(report.bytesScanned)}</span>
          {report.truncated && (
            <span style={{ color: "#ffb000" }}>⚠ PARTIAL SCAN</span>
          )}
        </div>

        {report.truncated && (
          <div
            className="border px-4 py-3 text-sm"
            style={{
              borderColor: "#ffb000",
              background: "rgba(255,176,0,0.07)",
              color: "#ffb000",
              fontSize: 14,
            }}
          >
            SCAN TRUNCATED — hit the 30-second wall or 200-file cap. Results
            cover the files scanned; the rest of the repo was not inspected.
          </div>
        )}

        {report.narrative && (
          <div
            className="border px-4 py-4"
            style={{
              borderColor: "rgba(57,255,20,0.35)",
              background: "rgba(0,0,0,0.55)",
              color: "#e8ffe8",
              fontSize: 18,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
            }}
          >
            {report.narrative}
          </div>
        )}

        {sorted.length === 0 ? (
          <div
            className="border px-4 py-6 text-center"
            style={{
              borderColor: "rgba(57,255,20,0.3)",
              background: "rgba(0,0,0,0.5)",
              color: "#39ff14",
              fontSize: 18,
              textShadow: "0 0 6px #39ff14",
            }}
          >
            NO FINDINGS DETECTED — this repo is suspiciously clean.
          </div>
        ) : (
          <section className="flex flex-col gap-1.5">
            <div
              className="uppercase tracking-[0.3em] mb-2"
              style={{
                fontFamily: fontPixel,
                fontSize: 10,
                color: "#39ff14",
                textShadow: "0 0 6px #39ff14",
              }}
            >
              FINDINGS
            </div>

            {sorted.map((f, i) => {
              const sevColor = SEV_COLOR[f.severity];
              return (
                <div
                  key={i}
                  className="border px-3 py-2 flex items-start gap-3 flex-wrap"
                  style={{
                    borderColor: `${sevColor}40`,
                    background: `${sevColor}08`,
                  }}
                >
                  <span
                    className="shrink-0 uppercase tracking-widest"
                    style={{
                      fontFamily: fontPixel,
                      fontSize: 8,
                      color: sevColor,
                      textShadow: `0 0 4px ${sevColor}`,
                      paddingTop: 2,
                      minWidth: 36,
                    }}
                  >
                    {f.severity}
                  </span>

                  <span
                    className="shrink-0 uppercase tracking-widest opacity-75"
                    style={{ fontSize: 13, color: sevColor, minWidth: 120 }}
                  >
                    {CAT_LABEL[f.category]}
                  </span>

                  <span
                    className="font-mono truncate"
                    style={{
                      fontSize: 13,
                      color: "#e8ffe8",
                      opacity: 0.9,
                      minWidth: 160,
                      maxWidth: 300,
                    }}
                  >
                    {f.file}
                    {f.line ? (
                      <span style={{ color: sevColor, opacity: 0.7 }}>:{f.line}</span>
                    ) : null}
                  </span>

                  <span
                    className="flex-1 min-w-[160px] opacity-75"
                    style={{ fontSize: 14, color: "#ccffcc" }}
                  >
                    {f.evidence}
                  </span>
                </div>
              );
            })}
          </section>
        )}

        <footer
          className="pt-4 border-t flex items-center justify-between flex-wrap gap-4"
          style={{ borderColor: "rgba(57,255,20,0.2)" }}
        >
          <a
            href="/board"
            style={{
              color: "#39ff14",
              textDecoration: "underline",
              fontSize: 16,
              textShadow: "0 0 6px #39ff14",
            }}
          >
            ▸ VIEW HALL OF DELUSION
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 border uppercase tracking-widest"
            style={{
              borderColor: "#39ff14",
              color: "#39ff14",
              background: "rgba(0,0,0,0.6)",
              fontFamily: fontMono,
              fontSize: 15,
            }}
          >
            CLOSE
          </button>
        </footer>

      </div>
    </div>
  );
}
