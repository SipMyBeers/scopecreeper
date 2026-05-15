"use client";

import { motion } from "framer-motion";
import { Terminal, Globe, FileText, GitBranch } from "lucide-react";
import { useState } from "react";
import ProjectSidebar from "./ProjectSidebar";
import { PixelArcade } from "./PixelArcade";

const HALLUCINATIONS = [
  { text: "/imagine: create world peace (locally hosted)", angle: -15, top: '15%', left: '5%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: 12, top: '22%', right: '5%' },
  { text: "/imagine: build opus 5.0, make no mistakes", angle: -8, top: '55%', left: '2%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: 18, bottom: '25%', left: '5%' },
  { text: "/imagine: synthesize nostalgic cyberpunk city (in assembly)", angle: -12, top: '65%', right: '8%' },
  { text: "/imagine: generate profit (no marketing)", angle: 14, bottom: '12%', right: '10%' },
];

export default function Hero() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="flex h-screen overflow-hidden bg-[#050508] relative crt-screen-content">
      <ProjectSidebar />
      
      <main className="relative flex-1 z-10 flex flex-col items-center justify-center font-retro overflow-hidden px-10">
        
        {/* The Glitching Hallucination Prompts (Match Image Contrast) */}
        <div className="absolute inset-0 pointer-events-none">
          {HALLUCINATIONS.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
              className="absolute text-white font-mono text-xl md:text-3xl italic tracking-tighter"
              style={{ 
                top: h.top, left: h.left, right: h.right, bottom: h.bottom,
                transform: `rotate(${h.angle}deg)`,
                textShadow: '0 0 10px rgba(255,255,255,0.3)'
              }}
            >
              {h.text}
            </motion.div>
          ))}
        </div>

        {/* The Headline (Direct Press Start 2P Match) */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-16 text-center"
        >
          <h1 className="glow-amber text-xl md:text-2xl lg:text-3xl uppercase tracking-widest leading-[1.6] font-press-start">
            AI HALLUCINATES FLAWS. YOU HALLUCINATE FEATURES.<br />
            LET'S FIND OUT WHO HAS THE BETTER DELUSION.
          </h1>
        </motion.div>

        {/* The Authentic Pixel-Art Arcade Composition */}
        <div className="relative mb-20">
          <PixelArcade />
        </div>

        {/* The Drop Your Payload Input (Exact Match) */}
        <div className="w-full max-w-2xl mt-4">
          <div className="payload-box">
             <div className="text-center glow-green text-[10px] tracking-[0.5em] uppercase mb-5 font-press-start">
               Drop Your Payload
             </div>
             <div className="flex items-center gap-6 px-6 bg-black/60 py-3 border border-white/5">
                <span className="glow-amber font-mono text-3xl tracking-tighter shrink-0">C:\_</span>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none glow-green text-2xl font-mono uppercase"
                  autoFocus
                />
                <div className="flex items-center gap-5 text-white/90">
                   <GitBranch size={24} className="hover:text-[#39FF14] cursor-pointer transition-all" />
                   <Globe size={24} className="hover:text-[#39FF14] cursor-pointer transition-all" />
                   <FileText size={24} className="hover:text-[#39FF14] cursor-pointer transition-all" />
                </div>
             </div>
          </div>
        </div>

      </main>

      {/* Global CRT Frame Overlay */}
      <div className="crt-frame-overlay" />
    </div>
  );
}
