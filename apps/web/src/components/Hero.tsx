"use client";

import { motion } from "framer-motion";
import { Globe, FileText, GitBranch } from "lucide-react";
import { useState } from "react";
import ProjectSidebar from "./ProjectSidebar";
import { PixelArcade } from "./PixelArcade";
import { BrokenFrame } from "./BrokenFrame";

const HALLUCINATIONS = [
  { text: "/imagine: create world peace (locally hosted)", angle: -15, top: '10%', left: '8%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: 12, top: '22%', right: '12%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: -8, top: '55%', left: '4%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: 18, bottom: '25%', left: '8%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: -12, top: '65%', right: '10%' },
  { text: "/imagine: generate profit (no marketing)", angle: 14, bottom: '15%', right: '15%' },
];

const CODE_FRAGMENTS = [
  { content: "ERROR: undefined variable\nwhile(true) {\n  const mess = []\n}", top: '15%', right: '25%' },
  { content: "DEBUG: visualization\n[CODE] -> [MADNESS]", bottom: '20%', left: '35%' },
];

export default function Hero() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="crt-outer">
      <ProjectSidebar />
      
      {/* Absolute Fidelity Layers */}
      <div className="scanlines-overlay" />
      <BrokenFrame />

      <main className="relative flex-1 z-10 flex flex-col items-center justify-center font-retro overflow-hidden h-screen px-20">
        
        {/* Hallucination Cloud (High Contrast White) */}
        <div className="absolute inset-0 pointer-events-none">
          {HALLUCINATIONS.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
              className="absolute text-white font-mono text-2xl md:text-4xl italic tracking-tighter glow-text-white"
              style={{ 
                top: h.top, left: h.left, right: h.right, bottom: h.bottom,
                transform: `rotate(${h.angle}deg)`
              }}
            >
              {h.text}
            </motion.div>
          ))}
          
          {/* Background Code Fragments */}
          {CODE_FRAGMENTS.map((f, i) => (
            <div key={i} className="absolute font-mono text-[10px] text-cyan-400 opacity-20 border border-white/10 p-4 bg-black/40"
                 style={{ top: f.top, left: f.left, right: f.right, bottom: f.bottom }}>
              <pre>{f.content}</pre>
            </div>
          ))}
        </div>

        {/* The Main Headline (Exact Amber Geometry) */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-12 text-center z-20"
        >
          <h1 className="headline-match text-xl md:text-2xl lg:text-3xl uppercase">
            AI HALLUCINATES FLAWS. YOU HALLUCINATE FEATURES.<br />
            LET'S FIND OUT WHO HAS THE BETTER DELUSION.
          </h1>
        </motion.div>

        {/* The 1:1 Machine Rebuild */}
        <div className="relative mb-20 z-10 scale-110 lg:scale-[1.25]">
          <PixelArcade />
        </div>

        {/* The Payload Input Box (Exact Image Parity) */}
        <div className="w-full max-w-3xl mt-4 z-30">
          <div className="payload-box">
             <div className="text-center glow-green text-[10px] tracking-[0.8em] uppercase mb-6 font-press-start font-bold">
               Drop Your Payload
             </div>
             <div className="flex items-center gap-10 px-10 bg-black/95 py-6 border border-white/10 shadow-[inset_0_0_40px_rgba(0,0,0,1)]">
                <span className="glow-amber font-mono text-6xl tracking-tighter shrink-0 select-none italic">C:\_</span>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none glow-green text-4xl font-mono uppercase"
                  autoFocus
                />
                <div className="flex items-center gap-8 text-white/95">
                   <GitBranch size={40} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                   <Globe size={40} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                   <FileText size={40} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                </div>
             </div>
          </div>
        </div>

      </main>

      {/* Extreme Side Glitch Artifacts */}
      <div className="absolute top-[20%] left-10 w-2 h-60 bg-magenta-500/20 blur-2xl animate-pulse" />
      <div className="absolute bottom-[20%] right-12 w-4 h-80 bg-green-500/20 blur-[100px] animate-pulse" />
    </div>
  );
}
