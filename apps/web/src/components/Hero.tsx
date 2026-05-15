"use client";

import { motion } from "framer-motion";
import { Globe, FileText, GitBranch } from "lucide-react";
import { useState } from "react";
import ProjectSidebar from "./ProjectSidebar";
import { PixelArcade } from "./PixelArcade";
import { BrokenFrame } from "./BrokenFrame";

const HALLUCINATIONS = [
  { text: "/imagine: create world peace (locally hosted)", angle: -15, top: '12%', left: '8%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: 10, top: '25%', right: '5%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: -5, top: '50%', left: '4%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: 15, bottom: '28%', left: '6%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: -10, top: '65%', right: '8%' },
  { text: "/imagine: generate profit (no marketing)", angle: 12, bottom: '15%', right: '12%' },
];

const DATA_BLOCKS = [
  { content: "ERROR: undefined variable\nwhile(true) {\n  const mess = []\n}", top: '15%', right: '20%', color: 'text-blue-400' },
  { content: "DEBUG: v1a-lization\n[PLAN] -> [ACTION]\n  |      |\n  v      v\n(MADNESS)", top: '40%', right: '15%', color: 'text-red-400' },
  { content: "Cavat. toolset(me) {\n  stats: [real];\n  dist: credit(seed-input);\n  unstable: [true];\n}", top: '25%', left: '35%', color: 'text-cyan-400' },
];

export default function Hero() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="flex h-screen overflow-hidden bg-[#050508] relative crt-screen-base">
      <ProjectSidebar />
      
      {/* 1. Global CRT Layering */}
      <div className="crt-scanlines" />
      <div className="crt-grain" />
      <BrokenFrame />

      <main className="relative flex-1 z-10 flex flex-col items-center justify-center font-retro overflow-hidden px-10">
        
        {/* 2. Background Hallucination Cloud (High Fidelity White) */}
        <div className="absolute inset-0 pointer-events-none">
          {HALLUCINATIONS.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 5, repeat: Infinity, delay: i * 0.4 }}
              className="absolute text-white font-mono text-xl md:text-3xl italic tracking-tighter glow-text-white"
              style={{ 
                top: h.top, left: h.left, right: h.right, bottom: h.bottom,
                transform: `rotate(${h.angle}deg)`
              }}
            >
              {h.text}
            </motion.div>
          ))}

          {/* Background Code/Data Fragments */}
          {DATA_BLOCKS.map((db, i) => (
             <div key={i} className={`absolute font-mono text-[10px] ${db.color} opacity-30 border border-white/10 p-2 bg-black/40`}
                  style={{ top: db.top, left: db.left, right: db.right }}>
                <pre>{db.content}</pre>
             </div>
          ))}
        </div>

        {/* 3. The Main Headline (Amber Glow) */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-14 text-center z-20"
        >
          <h1 className="header-amber text-xl md:text-2xl lg:text-3xl uppercase tracking-[0.2em] leading-relaxed">
            AI HALLUCINATES FLAWS. YOU HALLUCINATE FEATURES.<br />
            LET'S FIND OUT WHO HAS THE BETTER DELUSION.
          </h1>
        </motion.div>

        {/* 4. The High-Fidelity Machine Rebuild */}
        <div className="relative mb-24 z-10">
          <PixelArcade />
        </div>

        {/* 5. The Exact Payload Input Box */}
        <div className="w-full max-w-2xl mt-4 z-20">
          <div className="payload-box">
             <div className="text-center glow-green text-[10px] tracking-[0.6em] uppercase mb-5 font-press-start">
               Drop Your Payload
             </div>
             <div className="flex items-center gap-6 px-6 bg-black/90 py-3 border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
                <span className="terminal-amber text-4xl tracking-tighter shrink-0">C:\_</span>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none glow-green text-3xl font-mono uppercase"
                  autoFocus
                />
                <div className="flex items-center gap-6 text-white/80">
                   <GitBranch size={28} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                   <Globe size={28} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                   <FileText size={28} className="hover:text-[#39FF14] cursor-pointer transition-all hover:scale-110" />
                </div>
             </div>
          </div>
        </div>

      </main>
    </div>
  );
}
