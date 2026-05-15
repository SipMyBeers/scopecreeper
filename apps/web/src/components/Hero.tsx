"use client";

import { motion } from "framer-motion";
import { Terminal, Globe, FileText, ChevronRight, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import ProjectSidebar from "./ProjectSidebar";
import ChaosVisualizer from "./ChaosVisualizer";

const PROMPTS = [
  "/imagine: build opus 5.0, make no mistakes",
  "/imagine: create world peace (locally hosted)",
  "/imagine: synthesize nostalgic cyberpunk city (in assembly)",
  "/imagine: generate profit (no marketing)",
];

export default function Hero() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="flex h-screen overflow-hidden bg-[#050508] relative">
      <ProjectSidebar />
      
      <main className="relative flex-1 z-10 flex flex-col items-center justify-start overflow-y-auto px-8 py-12 font-retro custom-scrollbar">
        {/* Floating Hallucination Prompts */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          {PROMPTS.map((prompt, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, x: i % 2 === 0 ? -100 : 100, y: i * 50 }}
              animate={{ 
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.05, 1],
                rotate: i % 2 === 0 ? -2 : 2 
              }}
              transition={{ duration: 6, repeat: Infinity, delay: i * 1.5 }}
              className="absolute text-xl md:text-2xl text-white font-mono italic whitespace-nowrap"
              style={{ 
                top: `${10 + (i * 20)}%`,
                left: i % 2 === 0 ? '5%' : 'auto',
                right: i % 2 !== 0 ? '5%' : 'auto'
              }}
            >
              {prompt}
            </motion.div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="relative flex flex-col items-center max-w-5xl w-full">
          {/* Diagnostic Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-12 text-center"
          >
            <h2 className="amber-glow text-xs md:text-sm tracking-[0.5em] uppercase mb-4 font-mono">
              [ SYSTEM_STATUS: AGGRESSIVE_IDEATION_ACTIVE ]
            </h2>
            <h1 className="magenta-glow text-2xl md:text-4xl lg:text-5xl uppercase font-press-start tracking-tighter leading-tight mb-2">
              SCOPE CREEPER v1.0
            </h1>
            <p className="amber-glow text-sm md:text-base opacity-70 font-mono italic">
              AI HALLUCINATES FLAWS. YOU HALLUCINATE FEATURES.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full items-start">
            
            {/* Left Column: Input & Cabinet */}
            <div className="lg:col-span-5 flex flex-col gap-10">
                {/* The Payload Drop Zone */}
                <motion.div 
                    className="w-full beveled-frame p-1 group"
                    whileHover={{ scale: 1.01 }}
                >
                    <div className="bg-black p-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="green-glow text-[10px] tracking-[0.3em] uppercase">Drop Your Payload</span>
                            <div className="flex gap-4 opacity-30">
                                <Terminal size={14} />
                                <Globe size={14} />
                                <FileText size={14} />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 neon-groove p-3">
                            <span className="green-glow font-mono text-lg">{">"}</span>
                            <input 
                                type="text" 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="UPLOAD_CONTEXT_HERE..."
                                className="flex-1 bg-transparent border-none outline-none green-glow placeholder:text-tactical-green/20 text-lg uppercase font-mono"
                            />
                            <motion.button 
                                whileHover={{ scale: 1.1, backgroundColor: '#39FF14', color: '#000' }}
                                className="px-6 py-2 border-2 border-tactical-green green-glow text-xs uppercase transition-all font-retro"
                            >
                                Ingest
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Animated Arcade Cabinet Container */}
                <div className="relative w-full aspect-square flex items-center justify-center">
                    <motion.div
                        animate={{ 
                            y: [0, -15, 0],
                            rotateZ: [-0.5, 0.5, -0.5]
                        }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-full max-w-[320px] h-full beveled-frame p-4 relative flex items-center justify-center overflow-hidden"
                    >
                        {/* The Vortex Screen */}
                        <div className="absolute inset-4 neon-groove overflow-hidden flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="w-[250%] h-[250%] bg-[conic-gradient(from_0deg,#FF007F,#000000,#39FF14,#000000,#FF007F)] opacity-30 blur-3xl"
                            />
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className="text-[10px] green-glow animate-pulse font-mono tracking-widest uppercase">Analyzing...</div>
                                <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        animate={{ x: [-128, 128] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        className="w-16 h-full bg-tactical-magenta shadow-[0_0_10px_#FF007F]"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Control Deck */}
                        <div className="absolute bottom-4 left-4 right-4 h-16 bg-[#1a1a1e] border-t-4 border-black/40 flex items-center justify-center gap-8 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)]">
                            <div className="flex gap-2">
                                <div className="w-4 h-4 rounded-full bg-tactical-red shadow-[0_0_10px_#FF0000] animate-pulse" />
                                <div className="w-4 h-4 rounded-full bg-tactical-amber shadow-[0_0_10px_#FFB000]" />
                            </div>
                            <div className="w-12 h-4 bg-zinc-800 border-b-4 border-black/20" />
                            <div className="w-6 h-6 rotate-45 bg-tactical-green shadow-[0_0_15px_#39FF14]" />
                        </div>
                    </motion.div>

                    {/* Digital Wires / Tentacles (Heavier) */}
                    <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ 
                                    rotate: [i * 45, (i * 45) + 360],
                                    scale: [1, 1.2, 1],
                                    opacity: [0.05, 0.15, 0.05]
                                }}
                                transition={{ duration: 10 + i, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-[3px] border-tactical-magenta/20 rounded-full"
                                style={{ transform: `rotate(${i * 45}deg) skew(${i * 15}deg)` }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Chaos Visualizer */}
            <div className="lg:col-span-7 flex flex-col gap-8">
               <ChaosVisualizer />
               
               {/* Simulation Readout */}
               <div className="beveled-frame p-6 bg-black/40">
                  <div className="flex items-center gap-3 mb-4">
                     <Zap size={18} className="magenta-glow" />
                     <h4 className="magenta-glow text-xs uppercase tracking-[0.3em]">End-State Diagnostics</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <span className="text-[10px] amber-glow uppercase font-mono opacity-50 block">Reality_Delta</span>
                        <div className="text-lg green-glow font-retro tracking-widest">+12.4%_SHIFT</div>
                     </div>
                     <div className="space-y-2 text-right">
                        <span className="text-[10px] amber-glow uppercase font-mono opacity-50 block">Compute_Load</span>
                        <div className="text-lg magenta-glow font-retro tracking-widest">CRITICAL_BURN</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* HUD Metric Footer */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-12 opacity-30 text-[10px] uppercase tracking-[0.4em] w-full border-t border-white/5 pt-10 font-mono">
            <div className="flex flex-col gap-2">
               <span>Station_Status</span>
               <span className="green-glow">v1.0.4 // STABLE</span>
            </div>
            <div className="flex flex-col gap-2">
               <span>Sim_Uptime</span>
               <span className="green-glow">99.98% // ACTIVE</span>
            </div>
            <div className="flex flex-col gap-2">
               <span>Reality_Leak</span>
               <span className="text-tactical-red">MINIMAL // SUPPRESSED</span>
            </div>
            <div className="flex flex-col gap-2">
               <span>Delusion_Cap</span>
               <span className="magenta-glow">INFINITE // UNLOCKED</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
