"use client";

import { motion } from "framer-motion";

export const PixelArcade = () => {
  return (
    <motion.div 
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-[340px] h-[480px] flex flex-col scale-110 lg:scale-[1.2] items-center"
    >
      {/* 
        HIGH-FIDELITY PIXEL MACHINE
        Authentic shape: Side fins, tall marquee, recessed screen.
      */}

      {/* Side Fins (The wings of the machine) */}
      <div className="absolute inset-x-[-20px] top-10 bottom-10 bg-[#1a1a2e] border-x-8 border-[#0a0a1a] -z-10" />

      {/* Marquee (Tall and Detailed) */}
      <div className="w-full h-16 bg-[#3a3a6e] border-[6px] border-[#1a1a2e] relative shadow-[0_4px_0_#0a0a1a]">
         <div className="absolute inset-2 bg-[#4a4a8e] border-b-4 border-black/40 flex items-center justify-center">
            <div className="w-4 h-4 bg-tactical-magenta shadow-[0_0_10px_magenta]" />
         </div>
      </div>

      {/* Main Body / Screen Area */}
      <div className="w-[90%] flex-1 bg-[#2a2a4e] relative border-x-[8px] border-[#1a1a2e] shadow-[10px_0_0_#1a1a2e]">
        {/* Recessed Screen Bezel */}
        <div className="absolute inset-x-4 top-4 bottom-4 bg-black border-[6px] border-[#111] shadow-[inset_6px_6px_0_#000]">
          {/* Swirling Screen Vortex (High Contrast Magenta) */}
          <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-[250%] h-[250%] bg-[conic-gradient(from_0deg,#FF007F,#000,#FF007F,#000,#39FF14,#000,#FF007F)] opacity-90 blur-3xl"
            />
            {/* Scanline Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%),linear-gradient(90deg,rgba(255,0,0,0.1),rgba(0,255,0,0.05),rgba(0,0,255,0.1))] bg-[length:100%_4px,4px_100%]" />
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          </div>
        </div>
      </div>

      {/* Control Deck (The Chunky Platform) */}
      <div className="w-full h-28 relative">
        <div className="absolute inset-x-[-15px] top-0 h-24 bg-[#3a3a6e] border-[6px] border-[#1a1a2e] shadow-2xl">
           {/* Surface Detail */}
           <div className="absolute inset-2 bg-[#4a4a8e] border-t-2 border-white/5 opacity-50" />
           
           {/* Arcade Controls */}
           <div className="absolute top-6 left-8 flex gap-3">
              <div className="w-6 h-6 bg-red-600 border-b-4 border-black/50 shadow-[0_0_15px_red]" />
              <div className="w-6 h-6 bg-blue-600 border-b-4 border-black/50 shadow-[0_0_15px_blue]" />
           </div>
           
           <div className="absolute top-4 right-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-black/60 border-2 border-white/10" />
              <div className="w-2 h-4 bg-zinc-900" />
           </div>
        </div>
      </div>

      {/* Lower Chassis detail */}
      <div className="w-[80%] h-12 bg-[#1a1a2e] border-x-[6px] border-black/40 shadow-inner" />

      {/* 
        DIGITAL TENTACLES (Exploding out of the back with Neon Highlights)
        Fidelity Update: Thicker, Layered, Glitching neon cores.
      */}
      <div className="absolute top-1/2 left-1/2 w-[350%] h-[350%] -translate-x-1/2 -translate-y-1/2 -z-20 pointer-events-none">
        <svg viewBox="0 0 800 800" className="w-full h-full overflow-visible">
          {[
            { color: '#39FF14', d: 'M 400 400 L 550 300 L 700 350 L 780 450' }, // Green
            { color: '#FF007F', d: 'M 400 400 L 600 500 L 750 480 L 790 400' }, // Magenta
            { color: '#FFB000', d: 'M 400 400 L 450 600 L 600 700 L 700 650' }, // Amber
            { color: '#4D4DFF', d: 'M 400 400 L 250 550 L 100 520 L 20 400' },  // Blue
            { color: '#00FFFF', d: 'M 400 400 L 300 200 L 100 150 L 50 250' },  // Cyan
          ].map((wire, i) => (
            <g key={i}>
               {/* 1. Neon Glow Shadow */}
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="24"
                 fill="none"
                 strokeLinecap="square"
                 className="opacity-20 blur-[8px]"
               />
               {/* 2. Main Cable Hull (Dark) */}
               <motion.path
                 d={wire.d}
                 stroke="#0a0a1a"
                 strokeWidth="16"
                 fill="none"
                 strokeLinecap="square"
                 className="opacity-90"
               />
               {/* 3. Neon Core (Vibrant) */}
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="6"
                 fill="none"
                 strokeLinecap="square"
                 initial={{ pathLength: 0 }}
                 animate={{ 
                    pathLength: [0, 1],
                    opacity: [0.5, 1, 0.5] 
                 }}
                 transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                 className="shadow-[0_0_10px_currentColor]"
               />
               {/* 4. White Highlight Spark */}
               <motion.path
                 d={wire.d}
                 stroke="white"
                 strokeWidth="2"
                 fill="none"
                 strokeLinecap="square"
                 className="opacity-40"
               />
               {/* 5. Terminal Connector (Blocky) */}
               <motion.rect
                 x={wire.d.split(' ').slice(-2)[0]}
                 y={wire.d.split(' ').slice(-1)[0]}
                 width="12"
                 height="12"
                 fill={wire.color}
                 className="shadow-[0_0_15px_white]"
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ duration: 0.1, repeat: Infinity }}
               />
            </g>
          ))}
        </svg>
      </div>
    </motion.div>
  );
};
