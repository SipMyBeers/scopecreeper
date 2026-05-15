"use client";

import { motion } from "framer-motion";

export const PixelArcade = () => {
  return (
    <motion.div 
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-[280px] h-[400px] flex flex-col scale-110 lg:scale-[1.25]"
    >
      {/* 
        AUTHENTIC PIXEL CONSTRUCTION
        We use a combination of nested divs and box-shadow "pixel stacks" 
        to ensure every edge is a chunky 8-bit step.
      */}
      
      {/* Top Header / Marquee Area */}
      <div className="h-10 bg-[#3a3a6e] relative">
        <div className="absolute inset-x-1 top-1 bottom-1 bg-[#4a4a8e] border-b-4 border-black/40" />
        <div className="absolute top-1 left-4 w-4 h-4 bg-tactical-magenta/40" />
        <div className="absolute top-1 right-4 w-4 h-4 bg-tactical-magenta/40" />
      </div>

      {/* Main Hull */}
      <div className="flex-1 bg-[#2a2a4e] relative border-x-[8px] border-[#1a1a2e]">
        {/* Screen Bezel */}
        <div className="absolute inset-4 bg-[#0a0a0e] border-[4px] border-black shadow-[4px_4px_0_rgba(255,255,255,0.05)] flex flex-col overflow-hidden">
          {/* Internal Screen Content */}
          <div className="flex-1 relative flex items-center justify-center bg-black">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="w-[180%] h-[180%] bg-[conic-gradient(from_0deg,#FF007F,#000,#39FF14,#000,#FF007F)] opacity-60 blur-3xl"
            />
            {/* Retro Scanline Overlay for Screen only */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,4px_100%]" />
          </div>
          
          {/* Bottom Bezel detail */}
          <div className="h-4 bg-[#1a1a2e] flex items-center px-4 gap-2">
            <div className="w-2 h-2 bg-red-500 animate-pulse" />
            <div className="w-2 h-2 bg-blue-500" />
          </div>
        </div>
      </div>

      {/* Control Panel (Angled Pixel Look) */}
      <div className="h-20 relative">
        {/* The "Step" forward look using layered divs */}
        <div className="absolute inset-x-[-12px] top-0 h-16 bg-[#3a3a6e] border-t-4 border-[#5a5a9e] border-b-8 border-black/40 shadow-xl">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10" />
           
           {/* Joystick & Buttons (Chunky) */}
           <div className="absolute bottom-4 left-6 flex items-center gap-4">
              <div className="w-6 h-6 bg-red-600 border-b-4 border-black/60 shadow-[0_0_10px_red]" />
              <div className="w-6 h-6 bg-blue-600 border-b-4 border-black/60 shadow-[0_0_10px_blue]" />
           </div>
           <div className="absolute bottom-4 right-8 w-10 h-10 rounded-full bg-black/40 border-4 border-white/5" />
        </div>
      </div>

      {/* Lower Base */}
      <div className="h-10 bg-[#1a1a2e] mx-2 shadow-2xl" />

      {/* 
        DIGITAL TENTACLES (Authentic Pixel-Art Standard)
        We use thick, segmented SVG paths with "chunky" joints.
      */}
      <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none">
        <svg viewBox="0 0 600 600" className="w-full h-full overflow-visible drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
          {[
            { color: '#39FF14', d: 'M 300 300 L 350 250 L 450 250 L 550 300' }, // Green
            { color: '#FF007F', d: 'M 300 300 L 380 350 L 480 350 L 580 300' }, // Magenta
            { color: '#FFB000', d: 'M 300 300 L 320 400 L 420 450 L 520 420' }, // Amber
            { color: '#4D4DFF', d: 'M 300 300 L 220 380 L 120 380 L 50 320' },  // Blue
            { color: '#00FFFF', d: 'M 300 300 L 350 180 L 500 150 L 580 200' }, // Cyan
          ].map((wire, i) => (
            <g key={i}>
               {/* Outer Glow (Step 1) */}
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="16"
                 fill="none"
                 strokeLinejoin="round"
                 className="opacity-20 blur-[4px]"
               />
               {/* Main Thick Wire (Step 2) */}
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="10"
                 fill="none"
                 strokeLinejoin="round"
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1 }}
                 transition={{ duration: 1, delay: i * 0.2 }}
               />
               {/* Inner Core / Highlight (Step 3) */}
               <motion.path
                 d={wire.d}
                 stroke="white"
                 strokeWidth="3"
                 fill="none"
                 strokeLinejoin="round"
                 className="opacity-40"
               />
               {/* "Short Circuit" Spark Node at the end */}
               <motion.circle
                 cx={wire.d.split(' ').slice(-2)[0]}
                 cy={wire.d.split(' ').slice(-1)[0]}
                 r="4"
                 fill="white"
                 animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                 transition={{ duration: 0.2, repeat: Infinity }}
                 className="shadow-[0_0_10px_white]"
               />
            </g>
          ))}
        </svg>
      </div>
    </motion.div>
  );
};
