"use client";

import { motion } from "framer-motion";
import { Github, Globe, FileText, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

const PROMPTS = [
  "/imagine: build opus 5.0, make no mistakes",
  "/imagine: create world peace (locally hosted)",
  "/imagine: synthesize nostalgic cyberpunk city (in assembly)",
  "/imagine: generate profit (no marketing)",
];

export default function Hero() {
  const [inputValue, setInputValue] = useState("");

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20 font-retro">
      {/* Background Hallucinations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {PROMPTS.map((prompt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8, x: i % 2 === 0 ? -100 : 100, y: i * 50 }}
            animate={{ 
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.1, 1],
              rotate: i % 2 === 0 ? -5 : 5 
            }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
            className="absolute text-xl md:text-2xl text-white/40 whitespace-nowrap"
            style={{ 
              top: `${20 + (i * 15)}%`,
              left: i % 2 === 0 ? '10%' : 'auto',
              right: i % 2 !== 0 ? '10%' : 'auto'
            }}
          >
            {prompt}
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center max-w-4xl w-full text-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <h2 className="text-tactical-amber text-lg md:text-xl tracking-[0.2em] mb-4">
            AI HALLUCINATES FLAWS. YOU HALLUCINATE FEATURES.
          </h2>
          <h1 className="text-tactical-amber text-2xl md:text-4xl lg:text-5xl uppercase glitch-text">
            LET'S FIND OUT WHO HAS THE BETTER DELUSION.
          </h1>
        </motion.div>

        {/* The Arcade Cabinet Visual Placeholder */}
        <div className="relative w-64 h-80 mb-12 flex items-center justify-center">
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotateZ: [-1, 1, -1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full pixel-border bg-black/80 relative flex items-center justify-center overflow-hidden"
          >
            {/* The Vortex Screen */}
            <div className="absolute inset-2 bg-black overflow-hidden flex items-center justify-center">
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 className="w-[200%] h-[200%] bg-[conic-gradient(from_0deg,#FF007F,#000000,#39FF14,#000000,#FF007F)] opacity-40 blur-xl"
               />
               <span className="relative z-10 text-white text-xs tracking-tighter opacity-50 uppercase">Diagnostic active</span>
            </div>
            
            {/* Control Panel */}
            <div className="absolute bottom-0 w-full h-12 bg-zinc-900 border-t-2 border-tactical-green/30 flex items-center justify-center gap-4">
                <div className="w-3 h-3 rounded-full bg-tactical-red animate-pulse" />
                <div className="w-8 h-2 bg-zinc-800 rounded-sm" />
                <div className="w-3 h-3 rounded-full bg-tactical-green animate-pulse" />
            </div>
          </motion.div>

          {/* Digital Tentacles (Simplified with CSS) */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]">
             {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.1, 1],
                    opacity: [0.1, 0.3, 0.1]
                  }}
                  transition={{ duration: 5 + i, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border border-tactical-magenta/20 rounded-full"
                  style={{ transform: `rotate(${i * 60}deg) skew(${i * 10}deg)` }}
                />
             ))}
          </div>
        </div>

        {/* The Payload Drop Zone */}
        <motion.div 
          className="w-full max-w-xl pixel-border p-1 bg-black/40 backdrop-blur-sm"
          whileHover={{ scale: 1.01 }}
        >
          <div className="bg-black p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-tactical-green/20 pb-2">
              <span className="text-tactical-green text-sm tracking-widest uppercase">Drop Your Payload</span>
              <div className="flex gap-4 opacity-50">
                <Github size={16} />
                <Globe size={16} />
                <FileText size={16} />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-tactical-green">C:\_</span>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="INPUT REPO URL / LIVE SITE / PROJECT PITCH"
                className="flex-1 bg-transparent border-none outline-none text-tactical-green placeholder:text-tactical-green/30 text-lg uppercase"
              />
              <motion.button 
                whileHover={{ backgroundColor: '#39FF14', color: '#000' }}
                className="px-4 py-1 border border-tactical-green text-tactical-green text-sm uppercase transition-colors"
              >
                Enter
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Footer Metrics */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 text-xs uppercase tracking-[0.2em]">
          <div className="flex flex-col gap-1">
             <span>System Ready</span>
             <span className="text-tactical-green">v1.0.4-stable</span>
          </div>
          <div className="flex flex-col gap-1">
             <span>Uptime</span>
             <span className="text-tactical-green">99.98%</span>
          </div>
          <div className="flex flex-col gap-1">
             <span>Memory Leak</span>
             <span className="text-tactical-red">Minimal</span>
          </div>
          <div className="flex flex-col gap-1">
             <span>Delusion Cap</span>
             <span className="text-tactical-magenta">Infinite</span>
          </div>
        </div>
      </div>
    </main>
  );
}
