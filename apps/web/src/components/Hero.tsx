"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { parseRepoUrl } from "@/core";
import { PixelArcade } from "./PixelArcade";
import CorrodingBezel from "./CorrodingBezel";
import ProjectSidebar from "./ProjectSidebar";
import DiagnosticReadout from "./DiagnosticReadout";
import ExportModal from "./ExportModal";
import CreditsHud from "./CreditsHud";
import BuyCreditsModal from "./BuyCreditsModal";
import SkillTreeView from "./SkillTreeView";
import { useScanHistory } from "@/hooks/useScanHistory";
import { useCreepTree } from "@/hooks/useCreepTree";
import { useSession } from "@/hooks/useSession";

/** Bounding boxes for the six prompts, derived from the split script.
 *  All values are percentages of the 1408x768 canvas. */
const PROMPTS: { src: string; left: number; top: number; width: number; height: number }[] = [
  { src: "/assets/prompts/p1.png", left: 10.87, top: 18.10, width: 22.23, height: 20.83 },
  { src: "/assets/prompts/p2.png", left: 71.16, top: 21.48, width: 21.02, height: 18.62 },
  { src: "/assets/prompts/p3.png", left: 7.17,  top: 44.14, width: 24.93, height: 12.24 },
  { src: "/assets/prompts/p4.png", left: 9.87,  top: 58.85, width: 27.13, height: 30.08 },
  { src: "/assets/prompts/p5.png", left: 72.59, top: 52.86, width: 23.15, height: 17.71 },
  { src: "/assets/prompts/p6.png", left: 73.93, top: 73.18, width: 16.34, height: 14.71 },
];

type LogLine = { id: number; text: string };

/** Cable endpoint positions on the 1408×768 canvas (percent), one per
 *  creep dimension slot. Match the gallery numbering in sprites.html. */
const CABLE_HOTSPOTS = [
  { left: 70.1, top: 27.5, color: "#39ff14" }, // #1 top green
  { left: 73.5, top: 33.2, color: "#ff007f" }, // #2 magenta
  { left: 73.5, top: 38.9, color: "#00ffff" }, // #3 cyan
  { left: 72.2, top: 47.5, color: "#ffb000" }, // #4 amber
  { left: 68.9, top: 56.1, color: "#4d4dff" }, // #5 bottom blue
];

/** Heuristic: looks like a repo if it parses, otherwise treat as chatlog. */
function detectKind(input: string): "repo" | "chatlog" {
  return parseRepoUrl(input) ? "repo" : "chatlog";
}

export default function Hero() {
  const [inputValue, setInputValue] = useState("");
  const [log, setLog] = useState<LogLine[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  const history = useScanHistory();
  const { state, error, currentThread, runScan, reset, openThread } = history;
  const sessionHook = useSession();
  const [exportOpen, setExportOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);

  // Open the buy modal automatically when a scan hits OUT_OF_CREDITS.
  useEffect(() => {
    if (state === "out_of_credits") setBuyOpen(true);
  }, [state]);

  // Auto-open the skill-tree fullscreen when a scan completes.
  useEffect(() => {
    if (state === "done" && currentThread) setTreeOpen(true);
  }, [state, currentThread?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Creep tree state for the currently-open thread.
  const creep = useCreepTree({
    thread: currentThread,
    onChange: history.updateThread,
    onCreditsChange: sessionHook.refresh,
  });

  // F-key toggles real fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "f" || e.key === "F") &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        if (!document.fullscreenElement) {
          wrapRef.current?.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Per-prompt randomised visibility.
  const [promptVisible, setPromptVisible] = useState<boolean[]>(() =>
    PROMPTS.map(() => true)
  );
  useEffect(() => {
    const id = setInterval(() => {
      setPromptVisible(PROMPTS.map(() => Math.random() > 0.25));
    }, 600);
    return () => clearInterval(id);
  }, []);

  const pushLog = useCallback((text: string) => {
    setLog((prev) => {
      const next = [...prev, { id: logIdRef.current++, text }];
      return next.slice(-6);
    });
  }, []);

  // Mirror scan state into the terminal log strip.
  useEffect(() => {
    if (state === "scanning") {
      pushLog("> INITIATING SCOPE_CREEPER.SYS");
      pushLog("> HANDSHAKING REALITY...");
    }
    if (state === "done" && currentThread) {
      pushLog(`> DELUSION = ${currentThread.result.score} :: ${currentThread.result.tier.toUpperCase()}`);
    }
    if (state === "error" && error) {
      pushLog(`! ERROR: ${error}`);
    }
  }, [state, currentThread?.id, error, pushLog]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const kind = detectKind(trimmed);
    sessionHook.adjustCredits(-1);
    void runScan({ kind, payload: trimmed }).then(() => sessionHook.refresh());
    setInputValue("");
  }, [inputValue, runScan, sessionHook]);

  // Auto-expand input to textarea for multi-line / pasted chatlogs.
  const isMultiline = inputValue.includes("\n") || inputValue.length > 80;

  const fullLayer: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    imageRendering: "pixelated",
    objectFit: "fill",
  };

  // What to render inside the CRT screen.
  const screenChildren = useMemo(() => {
    if (currentThread && creep.focusedNode) {
      return (
        <DiagnosticReadout
          node={creep.focusedNode}
          path={creep.path}
          loading={creep.loading}
          outOfCredits={creep.outOfCredits}
          error={creep.error}
          onDrillInto={(d) => {
            void creep.drillInto(d);
            sessionHook.adjustCredits(-1);
          }}
          onBack={creep.back}
          onReset={() => {
            creep.reset();
            reset();
          }}
          onExport={() => setExportOpen(true)}
          onBuy={() => setBuyOpen(true)}
        />
      );
    }
    if (state === "scanning") {
      return (
        <div
          className="absolute inset-0 flex items-center justify-center text-center"
          style={{
            background: "rgba(0,0,0,0.85)",
            color: "#39ff14",
            fontFamily: "var(--font-vt323), monospace",
            fontSize: "clamp(10px, 1.2vw, 16px)",
            textShadow: "0 0 6px #39ff14",
            animation: "fx-readout-in 0.25s ease-out",
          }}
        >
          SCANNING…
          <span className="ml-1 animate-pulse">█</span>
        </div>
      );
    }
    return undefined;
  }, [currentThread?.id, state, reset, creep, sessionHook]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 grid place-items-center overflow-hidden bg-black select-none"
    >
      <div
        className="relative"
        style={{
          width: "min(100vw, calc(100vh * 1408 / 768))",
          aspectRatio: "1408 / 768",
        }}
      >
        {/* 1. Dark glitch background */}
        <img src="/assets/background.png" alt="" style={fullLayer} />

        {/* 2. Code fragments — flicker */}
        <img
          src="/assets/code.png"
          alt=""
          style={{ ...fullLayer, animation: "fx-flicker 3.6s steps(1) infinite" }}
        />

        {/* 3. Arcade machine — screen window now holds either swirl or
            a diagnostic readout, depending on scan state. */}
        <div
          style={{
            position: "absolute",
            left: "32.67%",
            top: "18.88%",
            width: "41.19%",
            height: "57.29%",
          }}
        >
          <PixelArcade
            state={state}
            tier={creep.focusedNode?.result.tier ?? null}
            screenChildren={screenChildren}
          />

          {/* Cable hotspots — each cable endpoint is a clickable creep-
              dimension drill. Positions measured from /sprites.html. */}
          {creep.focusedNode?.result.dimensions?.slice(0, 5).map((dim, i) => {
            const cable = CABLE_HOTSPOTS[i];
            if (!cable) return null;
            const disabled = creep.loading || creep.outOfCredits;
            return (
              <button
                key={dim.id || i}
                onClick={() => {
                  if (disabled) return;
                  void creep.drillInto(dim);
                  sessionHook.adjustCredits(-1);
                }}
                disabled={disabled}
                aria-label={`Scale ${dim.label}: ${dim.blurb}`}
                title={`${dim.label} — ${dim.blurb}`}
                className="absolute z-30 rounded-full disabled:cursor-not-allowed"
                style={{
                  left: `${cable.left}%`,
                  top: `${cable.top}%`,
                  width: "1.6%",
                  height: "2.8%",
                  transform: "translate(-50%, -50%)",
                  background: `radial-gradient(circle, ${cable.color}, transparent 70%)`,
                  boxShadow: `0 0 12px ${cable.color}, 0 0 4px ${cable.color}`,
                  border: "none",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 0.9,
                  animation: `cable-pulse 1.8s ease-in-out ${i * 0.18}s infinite`,
                }}
              />
            );
          })}
        </div>

        {/* 4. Per-prompt random fades */}
        {PROMPTS.map((p, i) => (
          <img
            key={p.src}
            src={p.src}
            alt=""
            style={{
              position: "absolute",
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.width}%`,
              height: `${p.height}%`,
              imageRendering: "pixelated",
              objectFit: "fill",
              pointerEvents: "none",
              opacity: promptVisible[i] ? 1 : 0,
              transition: `opacity ${0.45 + i * 0.1}s ease-${
                promptVisible[i] ? "out" : "in"
              }`,
              filter: promptVisible[i]
                ? "drop-shadow(0 0 4px rgba(255,255,255,0.25))"
                : "none",
            }}
          />
        ))}

        {/* 5. Headline + chromatic split */}
        <img
          src="/assets/headline.png"
          alt=""
          style={{
            ...fullLayer,
            animation: "fx-headline-shake 5s ease-in-out infinite",
          }}
        />
        <img
          src="/assets/headline.png"
          alt=""
          style={{
            ...fullLayer,
            filter: "hue-rotate(-90deg) saturate(2.5) brightness(1.2)",
            mixBlendMode: "screen",
            transform: "translate(-3px, 0)",
            opacity: 0.55,
            animation: "fx-headline-shake 5s ease-in-out infinite",
          }}
        />
        <img
          src="/assets/headline.png"
          alt=""
          style={{
            ...fullLayer,
            filter: "hue-rotate(180deg) saturate(2.5) brightness(1.2)",
            mixBlendMode: "screen",
            transform: "translate(3px, 0)",
            opacity: 0.55,
            animation: "fx-headline-shake 5s ease-in-out infinite",
          }}
        />

        {/* 6. Terminal box */}
        <div
          style={{
            position: "absolute",
            left: `${(499 / 1408) * 100}%`,
            top: `${(597 / 768) * 100}%`,
            width: `${((974 - 499) / 1408) * 100}%`,
            height: `${((706 - 597) / 768) * 100}%`,
            animation: "fx-terminal-pulse 2.4s ease-in-out infinite",
            filter: "drop-shadow(0 0 12px rgba(57,255,20,0.5))",
            pointerEvents: "none",
          }}
        >
          <img
            src="/assets/terminal.png"
            alt=""
            className="w-full h-full"
            style={{ objectFit: "fill", imageRendering: "pixelated" }}
          />
        </div>

        {/* 7. Corroding bezel */}
        <CorrodingBezel />

        {/* 8. Payload input — single-line OR multi-line textarea
            depending on content. Both submit on Cmd/Ctrl+Enter. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="absolute z-30"
          style={{
            left: isMultiline ? "37%" : "43%",
            top: isMultiline ? "78%" : "85%",
            width: isMultiline ? "26%" : "9%",
            height: isMultiline ? "13%" : "6%",
            transition:
              "left 0.2s ease-out, top 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out",
          }}
        >
          {isMultiline ? (
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              spellCheck={false}
              aria-label="Drop your payload"
              placeholder="paste chatlog... cmd+enter to scan"
              className="w-full h-full bg-transparent border border-[#39ff14]/30 outline-none text-[#39ff14] uppercase p-1 resize-none"
              style={{
                fontFamily: "var(--font-vt323), monospace",
                fontSize: "clamp(9px, 0.85vw, 13px)",
                letterSpacing: "0.05em",
                textShadow: "0 0 6px #39ff14",
                caretColor: "#39ff14",
                background: "rgba(0,0,0,0.65)",
              }}
            />
          ) : (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-label="Drop your payload"
              placeholder=""
              disabled={state === "scanning"}
              className="w-full h-full bg-transparent border-none outline-none text-[#39ff14] uppercase disabled:opacity-50"
              style={{
                fontFamily: "var(--font-vt323), monospace",
                fontSize: "clamp(10px, 1.8vw, 26px)",
                letterSpacing: "0.1em",
                textShadow: "0 0 8px #39ff14",
                caretColor: "#39ff14",
              }}
            />
          )}
        </form>

        {/* Icon hotspots over the terminal's GitHub / WWW / file icons. */}
        {[
          {
            url: "https://github.com/SipMyBeers/scopecreeper",
            label: "GitHub",
            left: 52.77,
          },
          {
            url: "https://scopecreeper.ai",
            label: "Website",
            left: 56.04,
          },
          {
            url: "https://github.com/SipMyBeers/scopecreeper#readme",
            label: "Docs",
            left: 59.23,
          },
        ].map((icon) => (
          <a
            key={icon.label}
            href={icon.url}
            target="_blank"
            rel="noreferrer"
            aria-label={icon.label}
            title={icon.label}
            className="absolute z-30 cursor-pointer"
            style={{
              left: `${icon.left}%`,
              top: "85.8%",
              width: "3.2%",
              height: "4.8%",
            }}
          />
        ))}

        {/* Live log strip below the terminal. */}
        <div
          aria-live="polite"
          className="absolute z-30 pointer-events-none flex flex-col gap-1"
          style={{
            left: "32%",
            top: "92.5%",
            width: "40%",
            color: "#39ff14",
            fontFamily: "var(--font-vt323), monospace",
            fontSize: "clamp(9px, 1.1vw, 15px)",
            textShadow: "0 0 6px #39ff14",
            lineHeight: 1.2,
          }}
        >
          {log.map((l) => (
            <div key={l.id} style={{ animation: "fx-log-in 0.25s ease-out" }}>
              {l.text}
            </div>
          ))}
        </div>
      </div>

      <ProjectSidebar
        threads={history.threads}
        currentThreadId={history.currentThreadId}
        onOpen={openThread}
        onDelete={history.deleteThread}
      />

      <CreditsHud onClick={() => setBuyOpen(true)} />

      {exportOpen && currentThread && (
        <ExportModal
          thread={currentThread}
          onClose={() => setExportOpen(false)}
        />
      )}

      {buyOpen && (
        <BuyCreditsModal
          onClose={() => {
            setBuyOpen(false);
            void sessionHook.refresh();
            if (state === "out_of_credits") reset();
          }}
        />
      )}

      {treeOpen && currentThread && (
        <SkillTreeView
          thread={currentThread}
          focusedId={creep.focusedId}
          loading={creep.loading}
          outOfCredits={creep.outOfCredits}
          error={creep.error}
          credits={sessionHook.session?.credits ?? null}
          onBuyCredits={() => setBuyOpen(true)}
          onFocus={(id) => creep.focus(id)}
          onDrill={(_parent, dim) => {
            void creep.drillInto(dim);
            sessionHook.adjustCredits(-1);
          }}
          onClose={() => setTreeOpen(false)}
        />
      )}
    </div>
  );
}
