"use client";

import React from "react";
import { PixelSprite } from "./PixelSprite";
import { motion } from "framer-motion";

const MAGENTA = "#ff007f";
const GREEN = "#39ff14";

// Manual pixel maps for broken segments
const CORNER_TL = [
  "MMMMMMMMMM",
  "M        ",
  "M  MMMMMM",
  "M  M     ",
  "M  M     ",
  "M  M     ",
  "M        ",
  "M        "
];

const JAGGED_H = [
  "MMMM MMM MMMMM",
  "  MM M   MM   "
];

const JAGGED_V = [
  "M ",
  "M ",
  "  ",
  "MM",
  "M ",
  "M "
];

const GREEN_BAR = [
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
  "G                            G",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
];

export const BrokenFrame = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1100]">
      {/* Top Left Corner */}
      <div className="absolute top-8 left-8">
        <PixelSprite pixels={CORNER_TL} colors={{'M': MAGENTA}} pixelSize={8} />
      </div>

      {/* Top Row Segments */}
      <div className="absolute top-8 left-64">
        <PixelSprite pixels={JAGGED_H} colors={{'M': MAGENTA}} pixelSize={8} />
      </div>
      <div className="absolute top-8 right-32">
        <PixelSprite pixels={JAGGED_H} colors={{'M': MAGENTA}} pixelSize={8} />
      </div>

      {/* Side Vertical Segments */}
      <div className="absolute top-64 left-8">
        <PixelSprite pixels={JAGGED_V} colors={{'M': MAGENTA}} pixelSize={8} />
      </div>
      <div className="absolute top-[50%] right-8">
        <PixelSprite pixels={JAGGED_V} colors={{'M': MAGENTA}} pixelSize={8} />
      </div>

      {/* Bottom Green Glowing Section */}
      <div className="absolute bottom-8 left-[10%] right-[10%] flex justify-center">
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 0.1, repeat: Infinity }}
          className="w-full flex justify-center"
        >
          <PixelSprite pixels={GREEN_BAR} colors={{'G': GREEN}} pixelSize={8} className="w-full" />
        </motion.div>
      </div>

      {/* Floating Glitch Fragments (Magenta) */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`m-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.1, repeat: Infinity, delay: Math.random() * 5 }}
          className="absolute"
          style={{
            top: `${Math.random() * 90 + 5}%`,
            left: Math.random() > 0.5 ? '12px' : 'auto',
            right: Math.random() > 0.5 ? 'auto' : '12px',
          }}
        >
          <PixelSprite pixels={["MM"]} colors={{'M': MAGENTA}} pixelSize={8} />
        </motion.div>
      ))}

      {/* Floating Glitch Fragments (Green) */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={`g-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.1, repeat: Infinity, delay: Math.random() * 5 }}
          className="absolute"
          style={{
            bottom: `${Math.random() * 40 + 5}%`,
            left: Math.random() > 0.5 ? '20px' : 'auto',
            right: Math.random() > 0.5 ? 'auto' : '20px',
          }}
        >
          <PixelSprite pixels={["GG"]} colors={{'G': GREEN}} pixelSize={8} />
        </motion.div>
      ))}
    </div>
  );
};
