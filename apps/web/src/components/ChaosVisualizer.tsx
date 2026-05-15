"use client";

import { motion } from "framer-motion";
import { Share2, BarChart3, Palette, DollarSign, Cpu } from "lucide-react";

const SECTORS = [
  { id: "structure", label: "Structure", icon: <Cpu size={16} />, color: "green", x: 100, y: 100 },
  { id: "marketing", label: "Marketing", icon: <Share2 size={16} />, color: "amber", x: 400, y: 100 },
  { id: "design", label: "Design", icon: <Palette size={16} />, color: "magenta", x: 100, y: 350 },
  { id: "finance", label: "Finance", icon: <DollarSign size={16} />, color: "red", x: 400, y: 350 },
];

export default function ChaosVisualizer() {
  return (
    <div className="relative w-full h-[500px] pixel-border bg-black/40 overflow-hidden font-retro">
      <div className="absolute top-2 left-4 text-tactical-green text-[10px] tracking-widest uppercase">
        Chaos Visualizer // Ripple Effect Map
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Central Wires/Tentacles */}
        <motion.path
          d="M 250 225 Q 150 225 100 100"
          stroke="rgba(57, 255, 20, 0.2)"
          strokeWidth="2"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M 250 225 Q 350 225 400 100"
          stroke="rgba(255, 176, 0, 0.2)"
          strokeWidth="2"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M 250 225 Q 150 225 100 350"
          stroke="rgba(255, 0, 127, 0.2)"
          strokeWidth="2"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M 250 225 Q 350 225 400 350"
          stroke="rgba(255, 0, 0, 0.2)"
          strokeWidth="2"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        />
        
        {/* Pulsing Central Hub */}
        <circle cx="250" cy="225" r="4" fill="#39FF14" className="animate-pulse" />
      </svg>

      <div className="absolute inset-0 p-8">
        {SECTORS.map((sector) => (
          <motion.div
            key={sector.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            style={{ left: sector.x, top: sector.y }}
            className="absolute w-40 p-3 bg-black/60 border border-white/10 group cursor-pointer"
          >
            <div className={`flex items-center gap-2 mb-2 text-tactical-${sector.color}`}>
              {sector.icon}
              <span className="text-xs uppercase tracking-widest">{sector.label}</span>
            </div>
            
            <div className="space-y-1">
               <div className="h-0.5 w-full bg-white/5 overflow-hidden">
                  <motion.div 
                    animate={{ x: [-100, 160] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className={`h-full w-20 bg-tactical-${sector.color}/40`} 
                  />
               </div>
               <div className="text-[8px] text-white/30 uppercase">
                  {sector.id === 'structure' ? 'Syncing Repository...' : 
                   sector.id === 'marketing' ? 'Analyzing Viral Load...' :
                   sector.id === 'design' ? 'Rendering Delusion...' : 'Calculating Burn Rate...'}
               </div>
            </div>

            {/* Branching Hallucination Node */}
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="text-[9px] text-tactical-magenta flex items-center gap-1">
                  <BarChart3 size={8} /> NEW BRANCH DETECTED
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Probability Gauge Placeholder */}
      <div className="absolute bottom-4 right-4 text-right">
        <div className="text-[10px] text-white/40 uppercase mb-1">Manifestation Prob.</div>
        <div className="text-xl text-tactical-green">84.2%</div>
      </div>
    </div>
  );
}
