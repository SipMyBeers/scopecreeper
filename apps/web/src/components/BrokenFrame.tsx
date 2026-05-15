"use client";

import React from "react";
import { motion } from "framer-motion";

export const BrokenFrame = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1200] overflow-hidden">
      {/* 
        IDENTICAL BROKEN BORDER
        Building the specific gaps and jagged edges from the image.
      */}

      {/* Top Bar - Broken Magenta */}
      <div className="absolute top-6 left-8 w-[20%] h-6 bg-[#ff007f] shadow-[0_0_20px_#ff007f]" />
      <div className="absolute top-6 left-[35%] w-[40%] h-4 bg-[#ff007f] opacity-80" />
      <div className="absolute top-6 right-8 w-[15%] h-8 bg-[#ff007f] shadow-[0_0_20px_#ff007f]" />

      {/* Side Bars - Jagged */}
      <div className="absolute top-8 left-6 w-8 h-[30%] bg-[#ff007f]" />
      <div className="absolute top-[45%] left-6 w-4 h-[10%] bg-[#ff007f] opacity-30" />
      <div className="absolute bottom-10 left-6 w-12 h-[25%] bg-[#39ff14] shadow-[0_0_20px_#39ff14]" />

      <div className="absolute top-8 right-6 w-8 h-[40%] bg-[#ff007f]" />
      <div className="absolute bottom-10 right-6 w-10 h-[35%] bg-[#39ff14] shadow-[0_0_20px_#39ff14]" />

      {/* Bottom Bar - Vibrant Neon Green with static glitches */}
      <div className="absolute bottom-6 left-12 right-12 h-4 bg-[#39ff14] shadow-[0_0_30px_#39ff14]" />

      {/* Scattered Glitch Pixels */}
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.1, repeat: Infinity, delay: Math.random() * 3 }}
          className={`absolute ${Math.random() > 0.5 ? 'bg-[#ff007f]' : 'bg-[#39ff14]'}`}
          style={{
            top: `${Math.random() * 100}%`,
            left: Math.random() > 0.5 ? '10px' : 'auto',
            right: Math.random() > 0.5 ? 'auto' : '10px',
            width: `${Math.random() * 30 + 5}px`,
            height: `${Math.random() * 10 + 2}px`,
            boxShadow: `0 0 10px ${Math.random() > 0.5 ? '#ff007f' : '#39ff14'}`
          }}
        />
      ))}

      {/* Center Static Horizontal Interference */}
      <div className="absolute top-[20%] left-0 w-full h-[2px] bg-white/5 shadow-[0_0_10px_white]" />
      <div className="absolute bottom-[20%] left-0 w-full h-[2px] bg-white/5 shadow-[0_0_10px_white]" />
    </div>
  );
};
