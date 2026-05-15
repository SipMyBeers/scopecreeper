"use client";

import { motion } from "framer-motion";
import { Globe, FileText, GitBranch } from "lucide-react";
import { useState } from "react";
import ProjectSidebar from "./ProjectSidebar";
import { PixelArcade } from "./PixelArcade";
import { BrokenFrame } from "./BrokenFrame";

const HALLUCINATIONS = [
  { text: "/imagine: create world peace (locally hosted)", angle: -15, top: '10%', left: '8%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: 10, top: '22%', right: '10%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: -5, top: '50%', left: '4%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: 15, bottom: '28%', left: '6%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: -10, top: '65%', right: '8%' },
  { text: "/imagine: generate profit (no marketing)", angle: 12, bottom: '15%', right: '12%' },
];

const CODE_ARTIFACTS = [
  { content: "ERROR: undefined variable\nwhile(true) {\n  const mess = []\n}", top: '15%', right: '25%' },
  { content: "DEBUG: visualization\n[CODE] -> [MADNESS]", top: '40%', right: '18%' },
];

export default function Hero() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="flex h-screen overflow-hidden bg-[#050508] relative crt-container">
      <ProjectSidebar />
      
      {/* 1. Global CRT Fidelity Layering */}
      <div className="crt-noise" />
      <div className="crt-scanlines" />
      <BrokenFrame />

      <main className="relative flex-1 z-10 flex flex-col items-center justify-center font-retro overflow-hidden">
        
        {/* 2. Hallucination Prompts (Match Image Contrast and Angles) */}
        <div className="absolute inset-0 pointer-events-none">
          {HALLUCINATIONS.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
              className="absolute text-white font-mono text-xl md:text-3xl italic tracking-tighter text-hallucination-white"
              style={{ 
                top: h.top, left: h.left, right: h.right, bottom: h.bottom,
                transform: `rotate(${h.angle}deg)`
              }}
            >
              {h.text}
            </motion.div>
          ))}
          
          {/* Background Code Snippets */}
          {CODE_ARTIFACTS.map((ca, i) => (
            <div key={i} className="absolute font-mono text-[10px] text-cyan-500 opacity-20 border border-white/5 p-2 bg-black/40"
                 style={{ top: ca.top, right: ca.right }}>
              <pre>{ca.content}</pre>
            </div>
          ))}
        </div>

        {/* 3. The Main Title (Exact Amber Spacing) */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-14 text-center z-20"
        >
          <h1 className="glow-amber text-xl md:text-2xl lg:text-3xl uppercase tracking-[0.25em] leading-[1.8] font-press-start">
            AI HALLUCINATES FLAWS. YOU HALLUCINATE FEATURES.<br />
            LET'S FIND OUT WHO HAS THE BETTER DELUSION.
          </h1>
        </motion.div>

        {/* 4. The Pixel-Pure Arcade Machine Rebuild */}
        <div className="relative mb-28 z-10">
          <PixelArcade />
        </div>

        {/* 5. The Exact Payload Input Box Construction */}
        <div className="w-full max-w-2xl mt-4 z-30">
          <div className="payload-box">
             <div className="text-center glow-green text-[10px] tracking-[0.6em] uppercase mb-5 font-press-start">
               Drop Your Payload
             </div>
             <div className="flex items-center gap-6 px-8 bg-black/95 py-4 border border-white/10 shadow-[inset_0_0_30px_rgba(0,0,0,1)]">
                <span className="glow-amber font-mono text-5xl tracking-tighter shrink-0 select-none">C:\_</span>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none glow-green text-3xl font-mono uppercase placeholder:opacity-20"
                  autoFocus
                />
                <div className="flex items-center gap-6 text-white/90">
                   <GitBranch size={32} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                   <Globe size={32} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                   <FileText size={32} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                </div>
             </div>
          </div>
        </div>

      </main>

      {/* Side Glitch Decorations */}
      <div className="absolute top-[30%] left-8 w-1 h-40 bg-magenta-500/20 blur-xl animate-pulse" />
      <div className="absolute bottom-[20%] right-8 w-2 h-60 bg-green-500/20 blur-2xl animate-pulse" />
    </div>
  );
}
