"use client";

import { motion } from "framer-motion";

export const PixelArcade = () => {
  return (
    <motion.div 
      animate={{ y: [0, -15, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="relative flex items-center justify-center"
    >
      {/* 
        IDENTICAL 1:1 MACHINE
        Hand-traced pixel geometry.
      */}

      {/* Main Body Hull */}
      <div className="relative w-[380px] h-[500px] bg-[#2a2a4e] border-[10px] border-[#0a0a1a] shadow-[15px_15px_0px_#000] flex flex-col">
        
        {/* Marquee Header */}
        <div className="h-16 bg-[#3a3a6e] border-b-[8px] border-[#1a1a2e] flex items-center justify-center p-2">
           <div className="w-[80%] h-4 bg-[#4a4a8e] border-b-4 border-black/40" />
        </div>

        {/* The Screen Area (Absolute Fidelity Vortex) */}
        <div className="flex-1 m-6 bg-black border-[8px] border-[#111] overflow-hidden relative shadow-[inset_10px_10px_0px_#000]">
           <motion.div
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="w-[180%] h-[180%] bg-[conic-gradient(from_0deg,#FF007F,#000,#39FF14,#000,#FF007F)] opacity-100 blur-[80px]"
           />
           {/* Scanlines layer for screen */}
           <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]" />
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
        </div>

        {/* Control Panel */}
        <div className="h-24 bg-[#3a3a6e] border-t-[8px] border-[#1a1a2e] relative px-10 flex items-center justify-between">
           <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-700 border-b-[6px] border-black/60 shadow-[0_0_20px_red]" />
              <div className="w-8 h-8 bg-blue-700 border-b-[6px] border-black/60 shadow-[0_0_20px_blue]" />
           </div>
           <div className="w-12 h-12 rounded-full bg-black border-4 border-white/5" />
        </div>
      </div>

      {/* Side Fins (Identical angles) */}
      <div className="absolute inset-x-[-35px] top-12 bottom-12 bg-[#1a1a2e] border-x-[8px] border-black -z-10 shadow-2xl" />

      {/* 
        IDENTICAL PIXEL TENTACLES
        Thick, jointed neon cables exploding from the machine.
      */}
      <div className="absolute top-1/2 left-1/2 w-[350%] h-[350%] -translate-x-1/2 -translate-y-1/2 -z-20 pointer-events-none overflow-visible">
        <svg viewBox="0 0 1000 1000" className="w-full h-full overflow-visible">
          {[
            { color: '#39FF14', d: 'M 500 500 L 650 350 L 850 350 L 950 450' }, // Green
            { color: '#FF007F', d: 'M 500 500 L 700 650 L 900 650 L 980 550' }, // Magenta
            { color: '#FFB000', d: 'M 500 500 L 450 750 L 650 850 L 850 800' }, // Amber
            { color: '#4D4DFF', d: 'M 500 500 L 300 700 L 100 700 L 20 600' },  // Blue
            { color: '#00FFFF', d: 'M 500 500 L 350 200 L 150 200 L 50 300' },  // Cyan
          ].map((wire, i) => (
            <g key={i}>
               {/* Neon Core Shadow */}
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="40"
                 fill="none"
                 strokeLinejoin="miter"
                 className="opacity-15 blur-[15px]"
               />
               {/* Dark Cable Hull */}
               <motion.path
                 d={wire.d}
                 stroke="#050508"
                 strokeWidth="24"
                 fill="none"
                 strokeLinejoin="miter"
                 className="opacity-95"
               />
               {/* Neon Core (Layered) */}
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="10"
                 fill="none"
                 strokeLinejoin="miter"
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1, opacity: [0.6, 1, 0.6] }}
                 transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                 className="shadow-[0_0_20px_currentColor]"
               />
               <motion.path
                 d={wire.d}
                 stroke="white"
                 strokeWidth="3"
                 fill="none"
                 strokeLinejoin="miter"
                 className="opacity-50"
               />
               {/* Terminal End Connector */}
               <motion.rect
                 x={wire.d.split(' ').slice(-2)[0]}
                 y={wire.d.split(' ').slice(-1)[0]}
                 width="20"
                 height="20"
                 fill={wire.color}
                 className="shadow-[0_0_30px_white]"
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
