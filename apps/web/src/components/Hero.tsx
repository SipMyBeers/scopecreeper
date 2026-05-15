"use client";

import { motion } from "framer-motion";
import { Globe, FileText, GitBranch } from "lucide-react";
import { useState } from "react";
import ProjectSidebar from "./ProjectSidebar";
import { PixelArcade } from "./PixelArcade";
import { BrokenFrame } from "./BrokenFrame";

const HALLUCINATIONS = [
  { text: "/imagine: create world peace (locally hosted)", angle: -15, top: '10%', left: '5%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: 10, top: '22%', right: '5%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: -5, top: '55%', left: '2%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: 15, bottom: '25%', left: '5%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: -10, top: '65%', right: '8%' },
  { text: "/imagine: generate profit (no marketing)", angle: 15, bottom: '15%', right: '10%' },
];

export default function Hero() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="flex h-screen overflow-hidden bg-[#050508] relative crt-container">
      <ProjectSidebar />
      
      {/* 1. Global CRT Layering - High Intensity */}
      <div className="crt-scanlines" />
      <div className="crt-noise" />
      <BrokenFrame />

      <main className="relative flex-1 z-10 flex flex-col items-center justify-center font-retro overflow-hidden px-10">
        
        {/* 2. Background Hallucination Prompts (Match Image Contrast) */}
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
        </div>

        {/* 3. The Main Headline (Exact Amber Tracking) */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-14 text-center"
        >
          <h1 className="glow-amber text-xl md:text-2xl lg:text-3xl uppercase tracking-[0.2em] leading-relaxed font-press-start">
            AI HALLUCINATES FLAWS. YOU HALLUCINATE FEATURES.<br />
            LET'S FIND OUT WHO HAS THE BETTER DELUSION.
          </h1>
        </motion.div>

        {/* 4. The Authentic 1:1 Machine Rebuild */}
        <div className="relative mb-24 scale-110 lg:scale-125">
          <PixelArcade />
        </div>

        {/* 5. The Exact Payload Input Box */}
        <div className="w-full max-w-2xl mt-4">
          <div className="payload-box">
             <div className="text-center glow-green text-[10px] tracking-[0.4em] uppercase mb-5 font-press-start">
               Drop Your Payload
             </div>
             <div className="flex items-center gap-6 px-6 bg-black/90 py-3 border border-white/5">
                <span className="terminal-amber text-4xl tracking-tighter shrink-0">C:\_</span>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none glow-green text-3xl font-mono uppercase"
                  autoFocus
                />
                <div className="flex items-center gap-5 text-white/90">
                   <GitBranch size={28} className="hover:text-[#39FF14] cursor-pointer transition-all" />
                   <Globe size={28} className="hover:text-[#39FF14] cursor-pointer transition-all" />
                   <FileText size={28} className="hover:text-[#39FF14] cursor-pointer transition-all" />
                </div>
             </div>
          </div>
        </div>

      </main>

      {/* 6. Static Glitch Artifacts (Side) */}
      <div className="absolute top-[20%] left-8 w-1 h-32 bg-magenta-500/20 blur-md animate-pulse" />
      <div className="absolute bottom-[30%] right-10 w-2 h-40 bg-green-500/20 blur-lg animate-pulse" />
    </div>
  );
}
