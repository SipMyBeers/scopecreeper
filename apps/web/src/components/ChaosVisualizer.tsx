"use client";

import { motion } from "framer-motion";
import { Share2, Palette, DollarSign, Cpu, Zap } from "lucide-react";

const SECTORS = [
  { id: "structure", label: "Structure", icon: <Cpu size={16} />, color: "var(--neon-green)", x: 100, y: 80 },
  { id: "marketing", label: "Marketing", icon: <Share2 size={16} />, color: "var(--neon-amber)", x: 450, y: 80 },
  { id: "design", label: "Design", icon: <Palette size={16} />, color: "var(--neon-magenta)", x: 100, y: 350 },
  { id: "finance", label: "Finance", icon: <DollarSign size={16} />, color: "var(--neon-red)", x: 450, y: 350 },
];

export default function ChaosVisualizer() {
  return (
    <div className="relative w-full h-[500px] beveled-frame overflow-hidden font-retro">
      {/* Heavy Rusted Background Layer */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] mix-blend-overlay" />
      
      <div className="absolute top-3 left-4 amber-glow text-[10px] tracking-[0.3em] uppercase z-10">
        Chaos Visualizer // Simulation_Map
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Thick Glowing Digital Cables */}
        <motion.path
          d="M 275 225 L 120 120"
          stroke="var(--neon-green)"
          strokeWidth="6"
          fill="transparent"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.path
          d="M 275 225 L 430 120"
          stroke="var(--neon-amber)"
          strokeWidth="6"
          fill="transparent"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <motion.path
          d="M 275 225 L 120 330"
          stroke="var(--neon-magenta)"
          strokeWidth="6"
          fill="transparent"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.path
          d="M 275 225 L 430 330"
          stroke="var(--neon-red)"
          strokeWidth="6"
          fill="transparent"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        
        {/* Pulsing Central Diagnostic Core */}
        <circle cx="275" cy="225" r="8" fill="#39FF14" filter="url(#glow)" className="animate-pulse" />
      </svg>

      <div className="absolute inset-0 p-8 z-10">
        {SECTORS.map((sector) => (
          <motion.div
            key={sector.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            style={{ left: sector.x, top: sector.y }}
            className="absolute w-44 p-4 neon-groove group cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: sector.color }}>
              {sector.icon}
              <span className="text-[10px] uppercase tracking-widest font-retro">{sector.label}</span>
            </div>
            
            <div className="space-y-2">
               <div className="h-1 w-full bg-black border border-white/5 overflow-hidden">
                  <motion.div 
                    animate={{ x: [-100, 180] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="h-full w-24 opacity-30"
                    style={{ backgroundColor: sector.color }}
                  />
               </div>
               <div className="text-[8px] opacity-40 uppercase font-mono italic">
                  {sector.id === 'structure' ? 'Indexing_Files...' : 
                   sector.id === 'marketing' ? 'Simulating_Hype...' :
                   sector.id === 'design' ? 'Generating_Asset_War...' : 'Calculating_Profit_Hallucination...'}
               </div>
            </div>

            {/* Glowing 8-bit Crystal Node */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-black border-2 rotate-45 flex items-center justify-center group-hover:scale-125 transition-transform"
                 style={{ borderColor: sector.color }}>
               <div className="w-1 h-1 rounded-full animate-ping" style={{ backgroundColor: sector.color }} />
            </div>

            {/* Spark Effect on Hover */}
            <motion.div 
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.1, repeat: Infinity }}
            >
              <Zap size={16} className="absolute -top-6 left-1/2 -translate-x-1/2 text-white" />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Manifestation Probe */}
      <div className="absolute bottom-6 left-6 text-left">
        <div className="text-[8px] amber-glow uppercase mb-1 font-mono">Sim_Success_Rate</div>
        <div className="text-2xl green-glow font-retro">84.2%</div>
      </div>
    </div>
  );
}
