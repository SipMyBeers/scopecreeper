"use client";

import { motion } from "framer-motion";

export const BrokenFrame = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[500] overflow-hidden">
      {/* Main Magenta Border (Jagged) */}
      <div className="absolute inset-4 border-[12px] border-[#ff007f] opacity-80" 
           style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 90%, 2% 90%, 2% 10%, 0% 10%)' }} />
      
      {/* Top Broken Line */}
      <div className="absolute top-4 left-4 right-4 h-4 flex gap-8">
        <div className="flex-1 bg-[#ff007f] shadow-[0_0_15px_#ff007f]" />
        <div className="w-20" /> {/* Gap */}
        <div className="flex-1 bg-[#ff007f] shadow-[0_0_15px_#ff007f]" />
      </div>

      {/* Side Fragments (The Green/Magenta Glitches) */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.1, repeat: Infinity, delay: Math.random() * 2 }}
          className={`glitch-fragment ${Math.random() > 0.5 ? 'green' : ''}`}
          style={{
            top: `${Math.random() * 100}%`,
            left: Math.random() > 0.5 ? '4px' : 'auto',
            right: Math.random() > 0.5 ? 'auto' : '4px',
            width: `${Math.random() * 30 + 10}px`,
            height: `${Math.random() * 10 + 4}px`,
          }}
        />
      ))}

      {/* Bottom Glowing Green Bar */}
      <div className="absolute bottom-4 left-10 right-10 h-2 bg-[#39ff14] shadow-[0_0_20px_#39ff14] opacity-70" />
      
      {/* Corner Pixel Blocks */}
      <div className="absolute top-4 left-4 w-12 h-12 border-l-8 border-t-8 border-[#ff007f]" />
      <div className="absolute top-4 right-4 w-12 h-12 border-r-8 border-t-8 border-[#ff007f]" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-l-8 border-b-8 border-[#39ff14]" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-r-8 border-b-8 border-[#39ff14]" />
    </div>
  );
};
