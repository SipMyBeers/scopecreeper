"use client";

import React from "react";
import { PixelSprite } from "./PixelSprite";
import { motion } from "framer-motion";

const PURPLE_DARK = "#1a1a2e";
const PURPLE_LIGHT = "#3a3a6e";
const NAVY = "#2a2a4e";
const BLACK = "#0a0a0e";
const MAGENTA = "#ff007f";
const GREEN = "#39ff14";
const AMBER = "#ffb000";
const RED = "#ff0000";
const BLUE = "#0000ff";

// Manual pixel map for the arcade body
const ARCADE_BODY = [
  "   LLLLLLLLLLL   ",
  "  LLLLLLLLLLLLL  ",
  " LLLLLLLLLLLLLLL ",
  " LLLLLLLLLLLLLLL ",
  "DDDDDDDDDDDDDDDDD",
  "DD             DD",
  "DD             DD",
  "DD             DD",
  "DD             DD",
  "DD             DD",
  "DD             DD",
  "DD             DD",
  "DD             DD",
  "DD             DD",
  "DDDDDDDDDDDDDDDDD",
  "BBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBB",
  "   DDDDDDDDD     ",
  "   DDDDDDDDD     "
];

const BUTTONS = [
  "RB",
];

export const PixelArcade = () => {
  return (
    <motion.div 
      animate={{ y: [0, -15, 0], rotate: [-0.5, 0.5, -0.5] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="relative flex items-center justify-center scale-[1.5]"
    >
      {/* Side Fins (The Wings) */}
      <div className="absolute inset-x-[-40px] top-[10%] bottom-[10%] bg-[#1a1a2e] border-x-[8px] border-[#050508] -z-10" />

      {/* Main Body Sprite */}
      <PixelSprite 
        pixels={ARCADE_BODY} 
        colors={{
          'L': PURPLE_LIGHT,
          'D': PURPLE_DARK,
          'B': PURPLE_DARK,
          ' ': 'transparent'
        }} 
        pixelSize={16} 
      />

      {/* Screen Area (Absolute overlay on the body) */}
      <div className="absolute top-[80px] w-[208px] h-[160px] bg-black overflow-hidden flex items-center justify-center border-4 border-black">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-[150%] h-[150%] bg-[conic-gradient(from_0deg,#FF007F,#000,#39FF14,#000,#FF007F)] opacity-90 blur-3xl"
        />
        {/* Pixel Scanlines for the screen */}
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%),linear-gradient(90deg,rgba(255,0,0,0.1),rgba(0,255,0,0.05),rgba(0,0,255,0.1))] bg-[length:100%_8px,8px_100%]" />
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-[100px] left-[32px] flex gap-4">
        <div className="w-8 h-8 bg-red-600 shadow-[0_4px_0_#900,0_0_15px_red]" />
        <div className="w-8 h-8 bg-blue-600 shadow-[0_4px_0_#009,0_0_15px_blue]" />
      </div>
      <div className="absolute bottom-[90px] right-[48px]">
        <div className="w-12 h-12 rounded-full bg-black/60 border-4 border-white/10" />
      </div>

      {/* Digital Tentacles (Chunky Pixel-Art Standard) */}
      <div className="absolute top-1/2 left-1/2 w-[400%] h-[400%] -translate-x-1/2 -translate-y-1/2 -z-20 pointer-events-none overflow-visible">
        <svg viewBox="0 0 800 800" className="w-full h-full overflow-visible">
          {[
            { color: GREEN, d: 'M 400 400 L 500 350 L 650 350 L 750 400' },
            { color: MAGENTA, d: 'M 400 400 L 520 450 L 650 450 L 780 400' },
            { color: AMBER, d: 'M 400 400 L 450 550 L 550 650 L 700 620' },
            { color: '#4D4DFF', d: 'M 400 400 L 300 500 L 150 500 L 50 450' },
            { color: '#00FFFF', d: 'M 400 400 L 350 250 L 200 150 L 50 200' },
          ].map((wire, i) => (
            <g key={i}>
               {/* Thick pixelated paths */}
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="24"
                 fill="none"
                 strokeLinecap="square"
                 className="opacity-20 blur-[10px]"
               />
               <motion.path
                 d={wire.d}
                 stroke={wire.color}
                 strokeWidth="12"
                 fill="none"
                 strokeLinecap="square"
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1, opacity: [0.5, 1, 0.5] }}
                 transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
               />
               <motion.path
                 d={wire.d}
                 stroke="white"
                 strokeWidth="3"
                 fill="none"
                 strokeLinecap="square"
                 className="opacity-40"
               />
               {/* Terminal Connector */}
               <motion.rect
                 x={wire.d.split(' ').slice(-2)[0]}
                 y={wire.d.split(' ').slice(-1)[0]}
                 width="16"
                 height="16"
                 fill={wire.color}
                 className="shadow-[0_0_20px_white]"
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
