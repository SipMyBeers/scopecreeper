"use client";

import { motion } from "framer-motion";

export const PixelArcade = () => {
  return (
    <motion.div 
      animate={{ y: [0, -15, 0], rotate: [-0.5, 0.5, -0.5] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-[380px] h-[520px] flex flex-col items-center"
    >
      {/* 
        IDENTICAL PIXEL ARCHIVE
        Rebuilding with exact geometry: Side fins, tall marquee, recessed screen.
      */}

      {/* Side Fins */}
      <div className="absolute inset-x-[-30px] top-12 bottom-12 bg-[#1a1a2e] border-x-[10px] border-[#0a0a1a] -z-10 shadow-2xl" />

      {/* Marquee */}
      <div className="w-full h-20 bg-[#3a3a6e] border-[8px] border-[#1a1a2e] relative shadow-[0_6px_0_#000]">
         <div className="absolute inset-2 bg-[#4a4a8e] border-b-4 border-black/40 flex items-center justify-center">
            <div className="w-6 h-6 bg-tactical-magenta shadow-[0_0_20px_magenta] animate-pulse" />
         </div>
      </div>

      {/* Main Hull */}
      <div className="w-[92%] flex-1 bg-[#2a2a4e] relative border-x-[12px] border-[#1a1a2e] shadow-[15px_0_0_#0a0a1a]">
        {/* Recessed Screen */}
        <div className="absolute inset-x-6 top-6 bottom-6 bg-black border-[8px] border-[#000] shadow-[inset_10px_10px_0_#111]">
          {/* Vortex swirl (High Contrast) */}
          <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.25, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="w-[200%] h-[200%] bg-[conic-gradient(from_0deg,#FF007F,#000,#FF007F,#000,#39FF14,#000,#FF007F)] opacity-100 blur-[80px]"
            />
            {/* Screen static/grain */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]" />
          </div>
        </div>
      </div>

      {/* Control Deck */}
      <div className="w-full h-32 relative">
        <div className="absolute inset-x-[-20px] top-0 h-28 bg-[#3a3a6e] border-[8px] border-[#1a1a2e] shadow-[0_15px_30px_#000]">
           <div className="absolute inset-2 bg-[#4a4a8e] border-t-2 border-white/5 opacity-40" />
           
           {/* Red/Blue buttons */}
           <div className="absolute top-8 left-10 flex gap-4">
              <div className="w-8 h-8 bg-red-700 border-b-[6px] border-black/60 shadow-[0_0_20px_red]" />
              <div className="w-8 h-8 bg-blue-700 border-b-[6px] border-black/60 shadow-[0_0_20px_blue]" />
           </div>
           
           {/* Joystick */}
           <div className="absolute top-6 right-14 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black border-4 border-white/10 shadow-inner" />
              <div className="w-2 h-6 bg-zinc-900 shadow-lg" />
           </div>
        </div>
      </div>

      {/* 
        GLITCHING TENTACLES (Exploding with Neon Highlights)
        High-fidelity: Thick dark hulls with vibrant neon cores and white sparkles.
      */}
      <div className="absolute top-1/2 left-1/2 w-[350%] h-[350%] -translate-x-1/2 -translate-y-1/2 -z-30 pointer-events-none overflow-visible">
        <svg viewBox="0 0 1000 1000" className="w-full h-full overflow-visible">
          {[
            { color: '#39FF14', d: 'M 500 500 L 650 400 L 850 450 L 950 600' }, // Green
            { color: '#FF007F', d: 'M 500 500 L 700 650 L 900 600 L 980 500' }, // Magenta
            { color: '#FFB000', d: 'M 500 500 L 600 750 L 800 850 L 900 800' }, // Amber
            { color: '#4D4DFF', d: 'M 500 500 L 300 700 L 100 650 L 20 500' },  // Blue
            { color: '#00FFFF', d: 'M 500 500 L 400 250 L 200 150 L 50 300' },  // Cyan
          ].map((wire, i) => (
            <g key={i}>
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="32"
                 fill="none"
                 strokeLinecap="butt"
                 className="opacity-15 blur-[12px]"
               />
               <motion.path
                 d={wire.d}
                 stroke="#0a0a1a"
                 strokeWidth="18"
                 fill="none"
                 strokeLinecap="butt"
                 className="opacity-95"
               />
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="8"
                 fill="none"
                 strokeLinecap="butt"
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1, opacity: [0.6, 1, 0.6] }}
                 transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                 className="shadow-[0_0_15px_currentColor]"
               />
               <motion.path
                 d={wire.d}
                 stroke="white"
                 strokeWidth="2"
                 fill="none"
                 strokeLinecap="butt"
                 className="opacity-40"
               />
               <motion.rect
                 x={wire.d.split(' ').slice(-2)[0]}
                 y={wire.d.split(' ').slice(-1)[0]}
                 width="16"
                 height="16"
                 fill={wire.color}
                 className="shadow-[0_0_20px_white]"
                 animate={{ scale: [1, 1.3, 1] }}
                 transition={{ duration: 0.1, repeat: Infinity }}
               />
            </g>
          ))}
        </svg>
      </div>
    </motion.div>
  );
};
