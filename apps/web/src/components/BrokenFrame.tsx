"use client";

import { motion } from "framer-motion";

export const BrokenFrame = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1100]">
      {/* 
        MANUAL JAGGED BORDER BLOCKS
        Replicating the broken, high-fidelity CRT look from the image.
      */}

      {/* Top segments */}
      <div className="absolute top-4 left-4 w-40 h-8 bg-[#ff007f] shadow-[0_0_20px_#ff007f]" />
      <div className="absolute top-4 left-60 w-80 h-4 bg-[#ff007f]" />
      <div className="absolute top-4 right-10 w-60 h-10 bg-[#ff007f]" />

      {/* Left segments */}
      <div className="absolute top-4 left-4 w-8 h-[30%] bg-[#ff007f]" />
      <div className="absolute top-[40%] left-4 w-6 h-[20%] bg-[#ff007f] opacity-50" />
      <div className="absolute bottom-4 left-4 w-10 h-[25%] bg-[#39ff14] shadow-[0_0_20px_#39ff14]" />

      {/* Right segments */}
      <div className="absolute top-4 right-4 w-8 h-[40%] bg-[#ff007f]" />
      <div className="absolute top-[50%] right-4 w-12 h-20 bg-[#ff007f] shadow-[0_0_15px_#ff007f]" />
      <div className="absolute bottom-4 right-4 w-8 h-[30%] bg-[#39ff14] shadow-[0_0_20px_#39ff14]" />

      {/* Bottom segment (The long green bar) */}
      <div className="absolute bottom-4 left-10 right-10 h-4 bg-[#39ff14] shadow-[0_0_30px_#39ff14]" />

      {/* Disconnected Glitch Fragments */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.1, repeat: Infinity, delay: Math.random() * 5 }}
          className={`absolute ${Math.random() > 0.5 ? 'bg-[#ff007f]' : 'bg-[#39ff14]'}`}
          style={{
            top: `${Math.random() * 100}%`,
            left: Math.random() > 0.5 ? '2px' : 'auto',
            right: Math.random() > 0.5 ? 'auto' : '2px',
            width: `${Math.random() * 20 + 5}px`,
            height: `${Math.random() * 6 + 2}px`,
            boxShadow: `0 0 10px ${Math.random() > 0.5 ? '#ff007f' : '#39ff14'}`
          }}
        />
      ))}

      {/* Scanline interference lines */}
      <div className="absolute top-[10%] left-0 w-full h-[1px] bg-white/10" />
      <div className="absolute top-[80%] left-0 w-full h-[1px] bg-white/10" />
    </div>
  );
};
