"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Fixed-position decorative background:
 *   - drifting pixel particles in the five SC palette colors
 *   - a CRT scanline overlay sweeping slowly
 *   - a giant phosphor "creeper eye" SVG in the bottom-right corner
 *     whose pupil tracks the mouse and blinks every few seconds
 *
 * Pure cosmetic. Sits at z-index 0, all content uses z-index > 0.
 */
const PALETTE = ["#39ff14", "#ff007f", "#5cb8ff", "#ffb000", "#a855f7"];

interface Particle {
  x: number;
  y: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export default function CreeperBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pupilRef = useRef<SVGCircleElement>(null);
  const lidRef = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const particles: Particle[] = Array.from({ length: 70 }, () => mkParticle(w, h));

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.shadowBlur = 0;
        p.y += p.vy;
        if (p.y < -10) {
          Object.assign(p, mkParticle(w, h, true));
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Pupil tracking
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const pupil = pupilRef.current;
      if (!pupil) return;
      const cx = window.innerWidth - 130;
      const cy = window.innerHeight - 130;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.min(18, Math.sqrt(dx * dx + dy * dy) / 25);
      const ang = Math.atan2(dy, dx);
      pupil.setAttribute("cx", String(100 + Math.cos(ang) * dist));
      pupil.setAttribute("cy", String(100 + Math.sin(ang) * dist));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Blink occasionally
  useEffect(() => {
    const lid = lidRef.current;
    if (!lid) return;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      lid.style.transform = "scaleY(1)";
      lid.style.transformOrigin = "center";
      setTimeout(() => {
        lid.style.transform = "scaleY(0.05)";
      }, 80);
      setTimeout(() => {
        lid.style.transform = "scaleY(1)";
      }, 180);
      timer = setTimeout(cycle, 3500 + Math.random() * 4000);
    };
    cycle();
    return () => clearTimeout(timer);
  }, []);

  const fixed: CSSProperties = {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
  };

  return (
    <>
      {/* base gradient wash */}
      <div
        style={{
          ...fixed,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 10%, rgba(255,0,127,0.08), transparent 60%)," +
            "radial-gradient(ellipse 60% 80% at 90% 90%, rgba(168,85,247,0.10), transparent 65%)," +
            "radial-gradient(ellipse 70% 50% at 10% 70%, rgba(57,255,20,0.06), transparent 65%)",
        }}
      />

      {/* particle canvas */}
      <canvas ref={canvasRef} style={fixed} />

      {/* scanlines (animated sweep) */}
      <div
        style={{
          ...fixed,
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(255,255,255,0.025) 3px, rgba(0,0,0,0) 4px)",
          mixBlendMode: "overlay",
        }}
      />

      <div
        style={{
          ...fixed,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(57,255,20,0.06) 50%, transparent 100%)",
          animation: "creeper-sweep 6s linear infinite",
          height: 200,
          top: "-200px",
        }}
      />

      {/* creeper eye in bottom-right */}
      <svg
        viewBox="0 0 200 200"
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: 140,
          height: 140,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.55,
          filter: "drop-shadow(0 0 16px #ff007f)",
        }}
      >
        {/* outer ring */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="#ff007f" strokeWidth="1.5" strokeDasharray="4 6" />
        {/* sclera */}
        <circle cx="100" cy="100" r="78" fill="#0a0612" stroke="#39ff14" strokeWidth="2" />
        {/* iris */}
        <circle cx="100" cy="100" r="44" fill="none" stroke="#5cb8ff" strokeWidth="1" opacity="0.6" />
        {/* pupil */}
        <circle ref={pupilRef} cx="100" cy="100" r="18" fill="#ff007f">
          <animate attributeName="r" values="18;20;18" dur="2.4s" repeatCount="indefinite" />
        </circle>
        {/* glint */}
        <circle cx="110" cy="92" r="4" fill="#ffb000" opacity="0.8" />
        {/* eyelid (blinks) */}
        <ellipse
          ref={lidRef}
          cx="100"
          cy="100"
          rx="80"
          ry="80"
          fill="#0a0612"
          style={{ transformOrigin: "center", transformBox: "fill-box", transform: "scaleY(0.05)", transition: "transform 0.1s ease" }}
        />
      </svg>

      <style>{`
        @keyframes creeper-sweep {
          0%   { transform: translateY(0); }
          100% { transform: translateY(calc(100vh + 400px)); }
        }
        @keyframes creeper-hero-rgb {
          0%, 100% { text-shadow: 0 0 12px #ff007f, -2px 0 #5cb8ff, 2px 0 #ffb000; }
          50%      { text-shadow: 0 0 18px #ff007f, -1px 0 #a855f7, 1px 0 #39ff14; }
        }
        @keyframes creeper-blink-dot {
          0%, 60%, 100% { opacity: 1; }
          70%, 90%      { opacity: 0.15; }
        }
        @keyframes creeper-pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,0,127,0.4), inset 0 0 18px rgba(57,255,20,0.12); }
          50%      { box-shadow: 0 0 24px 2px rgba(255,0,127,0.25), inset 0 0 18px rgba(57,255,20,0.12); }
        }
        @keyframes creeper-flicker {
          0%, 100%   { opacity: 1; }
          43%        { opacity: 0.85; }
          44%        { opacity: 1; }
          88%        { opacity: 0.9; }
        }
        @keyframes creeper-section-bar {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </>
  );
}

function mkParticle(w: number, h: number, fromBottom = false): Particle {
  return {
    x: Math.random() * w,
    y: fromBottom ? h + Math.random() * 30 : Math.random() * h,
    vy: -(0.15 + Math.random() * 0.5),
    size: Math.random() < 0.85 ? 2 : 3,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    alpha: 0.2 + Math.random() * 0.5,
  };
}
