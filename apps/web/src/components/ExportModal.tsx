"use client";

import { useEffect, useState } from "react";
import type { ScanThread } from "@/core";
import { exportThread, fetchMe, loginWithGitHub, type AuthMe } from "@/lib/api";

/**
 * Modal for exporting a scan thread to GitHub. Two targets:
 *   - "issue":  opens a labeled issue on the target repo
 *   - "commit": commits DELUSION_REPORT.md to the default branch
 *
 * If the user isn't signed in, shows a "LOGIN WITH GITHUB" CTA.
 */
export default function ExportModal({
  thread,
  onClose,
}: {
  thread: ScanThread;
  onClose: () => void;
}) {
  const [user, setUser] = useState<AuthMe | null | undefined>(undefined);
  const [repo, setRepo] = useState(
    thread.input.kind === "repo" ? thread.input.payload.replace(/^https?:\/\/github\.com\//, "") : ""
  );
  const [target, setTarget] = useState<"issue" | "commit">("issue");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetchMe().then(setUser);
  }, []);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await exportThread({ thread, target, repo });
      setResultUrl(r.url);
    } catch (err) {
      if ((err as Error).message === "not_authenticated") {
        loginWithGitHub();
        return;
      }
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(440px,90vw)] border border-[#39ff14]/50 p-4"
        style={{
          background: "rgba(0,0,0,0.92)",
          color: "#39ff14",
          fontFamily: "var(--font-vt323), monospace",
          textShadow: "0 0 6px #39ff14",
          boxShadow: "0 0 24px rgba(57,255,20,0.35)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 11,
              letterSpacing: "0.2em",
            }}
          >
            EXPORT TO GITHUB
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none opacity-80 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {user === undefined && (
          <p className="text-sm opacity-70">CHECKING AUTH…</p>
        )}

        {user === null && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              SIGN IN WITH GITHUB TO COMMIT REPORTS OR OPEN ISSUES.
            </p>
            <button
              onClick={() => loginWithGitHub()}
              className="border border-[#39ff14] px-3 py-2 hover:bg-[#39ff14] hover:text-black uppercase tracking-widest"
              style={{ fontSize: 13 }}
            >
              LOGIN WITH GITHUB
            </button>
          </div>
        )}

        {user && !resultUrl && (
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="block text-xs opacity-70 mb-1">TARGET REPO</span>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo"
                className="w-full bg-transparent border border-[#39ff14]/40 outline-none px-2 py-1 uppercase"
                style={{ caretColor: "#39ff14", fontSize: 14 }}
                spellCheck={false}
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTarget("issue")}
                className={`flex-1 px-2 py-1 border uppercase tracking-widest ${
                  target === "issue"
                    ? "border-[#39ff14] bg-[#39ff14]/15"
                    : "border-[#39ff14]/30"
                }`}
                style={{ fontSize: 12 }}
              >
                OPEN ISSUE
              </button>
              <button
                onClick={() => setTarget("commit")}
                className={`flex-1 px-2 py-1 border uppercase tracking-widest ${
                  target === "commit"
                    ? "border-[#39ff14] bg-[#39ff14]/15"
                    : "border-[#39ff14]/30"
                }`}
                style={{ fontSize: 12 }}
              >
                COMMIT FILE
              </button>
            </div>
            {error && (
              <p
                className="text-xs"
                style={{ color: "#ff007f", textShadow: "0 0 6px #ff007f" }}
              >
                ! {error}
              </p>
            )}
            <button
              onClick={submit}
              disabled={submitting || !repo.trim()}
              className="border border-[#39ff14] px-3 py-2 hover:bg-[#39ff14] hover:text-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontSize: 13 }}
            >
              {submitting
                ? "TRANSMITTING…"
                : target === "issue"
                ? "FIRE ISSUE"
                : "COMMIT TO BRANCH"}
            </button>
            <p className="text-[10px] opacity-50 mt-1">
              signed in as @{user.login}
            </p>
          </div>
        )}

        {resultUrl && (
          <div className="flex flex-col gap-2">
            <p className="text-sm">PAYLOAD DELIVERED.</p>
            <a
              href={resultUrl}
              target="_blank"
              rel="noreferrer"
              className="underline break-all"
              style={{ color: "#39ff14" }}
            >
              {resultUrl}
            </a>
            <button
              onClick={onClose}
              className="border border-[#39ff14] px-3 py-2 hover:bg-[#39ff14] hover:text-black uppercase tracking-widest mt-2"
              style={{ fontSize: 13 }}
            >
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
