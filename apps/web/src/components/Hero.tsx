"use client";

import { motion } from "framer-motion";
import { Terminal, Globe, FileText, GitBranch } from "lucide-react";
import { useState } from "react";
import ProjectSidebar from "./ProjectSidebar";

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

        {/* The Central Arcade Composition */}
        <div className="relative w-80 h-96 mb-20 scale-110 lg:scale-[1.3]">
          
          {/* Multi-Colored Digital Tentacles (Thick, High-Contrast) */}
          <div className="absolute top-1/2 left-1/2 w-[240%] h-[240%] -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible">
            {[
              { color: '#39FF14', d: 'M 400 400 Q 550 350 650 450' }, // Green
              { color: '#FF007F', d: 'M 400 400 Q 580 480 680 380' }, // Magenta
              { color: '#FFB000', d: 'M 400 400 Q 520 550 620 500' }, // Amber
              { color: '#4D4DFF', d: 'M 400 400 Q 250 480 150 420' }, // Blue
              { color: '#00FFFF', d: 'M 400 400 Q 600 280 750 350' }, // Cyan
            ].map((wire, i) => (
              <svg key={i} className="absolute inset-0 w-full h-full overflow-visible">
                <motion.path
                  d={wire.d}
                  stroke={wire.color}
                  strokeWidth="12"
                  fill="transparent"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                  className="blur-[1px]"
                />
                <motion.path
                  d={wire.d}
                  stroke="white"
                  strokeWidth="3"
                  fill="transparent"
                  strokeLinecap="round"
                  className="opacity-40"
                />
              </svg>
            ))}
          </div>

          {/* The High-Fidelity 8-bit Cabinet */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full arcade-body relative overflow-hidden flex flex-col"
          >
            {/* Screen with Vortex swirl */}
            <div className="flex-1 m-4 arcade-screen-inset overflow-hidden flex items-center justify-center relative">
               <motion.div
                 animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                 transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                 className="w-[200%] h-[200%] bg-[conic-gradient(from_0deg,#FF007F,#000,#39FF14,#000,#FF007F)] opacity-70 blur-3xl"
               />
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')] opacity-20" />
            </div>
            
            {/* Control Panel (Red/Blue Buttons) */}
            <div className="h-14 bg-[#3a3a6e] border-t-4 border-black/40 px-6 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-4 h-4 bg-red-600 shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
                <div className="w-4 h-4 bg-blue-600 shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-black/40 border-2 border-white/5" />
            </div>
          </motion.div>
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
