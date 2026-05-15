"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Zap, User, ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";

interface Project {
  id: string;
  name: string;
  score: number;
  status: string;
  tier: "corpse" | "sweetspot" | "abyss" | "delusion";
}

const PROJECTS: Project[] = [
  { id: "1", name: "DITTO-INGEST", score: 42, status: "CONTROLLED DRIFT", tier: "sweetspot" },
  { id: "2", name: "LOOTLENS-V2", score: 15, status: "CODE CORPSE", tier: "corpse" },
  { id: "3", name: "SCOPECREEPER", score: 98, status: "TIMELINE COLLAPSE", tier: "delusion" },
  { id: "4", name: "RABBIT-HOLES", score: 75, status: "FEATURE ABYSS", tier: "abyss" },
];

export default function ProjectSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isExpanded ? 320 : 64 }}
      className="sidebar-transition h-screen bg-black/80 border-r border-white/5 backdrop-blur-md relative z-[1000] flex flex-col font-retro"
    >
      {/* Toggle Handle */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-16 bg-[#2a2a4e] border-2 border-white/10 flex items-center justify-center glow-magenta cursor-pointer hover:bg-[#3a3a6e] transition-colors"
      >
        {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className={`p-4 border-b border-white/5 ${!isExpanded && 'items-center'} flex flex-col gap-4 overflow-hidden`}>
        <div className="flex items-center gap-3">
          <LayoutGrid size={24} className="magenta-glow shrink-0" />
          {isExpanded && <span className="magenta-glow text-xs tracking-[0.3em] uppercase">Save Slots</span>}
        </div>
        
        {isExpanded && (
          <div className="neon-groove p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center pixel-border-arcade shrink-0">
              <User size={16} className="text-tactical-green" />
            </div>
            <div className="truncate">
               <div className="text-[10px] text-tactical-green/50 uppercase">Player 1</div>
               <div className="text-tactical-green text-xs">OPERATOR_X</div>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4 overflow-x-hidden">
        {PROJECTS.map((project) => (
          <motion.div
            key={project.id}
            className={`relative p-3 border-2 transition-all cursor-pointer ${
              project.name === "SCOPECREEPER" 
                ? "border-tactical-magenta/40 bg-tactical-magenta/10" 
                : "border-white/5 bg-black/20"
            } ${!isExpanded && 'flex justify-center'}`}
          >
            {isExpanded ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[10px] uppercase ${project.tier === 'delusion' ? 'magenta-glow' : 'text-tactical-green'}`}>
                    {project.name}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-black overflow-hidden mb-1 border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${project.score}%` }}
                    className={`h-full ${
                      project.score > 90 ? 'bg-gradient-to-r from-green-500 to-magenta-500 shadow-[0_0_10px_magenta]' : 
                      project.score > 30 ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-zinc-600'
                    }`}
                  />
                </div>
                <div className="text-[8px] opacity-40 uppercase">{project.status}</div>
              </>
            ) : (
               <div className={`w-3 h-8 border border-white/10 ${project.score > 90 ? 'bg-tactical-magenta' : 'bg-tactical-green'}`} />
            )}
          </motion.div>
        ))}
      </nav>

      {isExpanded && (
        <div className="p-4 border-t border-white/5 bg-zinc-950/40">
          <div className="flex items-center gap-2 text-[8px] amber-glow mb-1">
            <Zap size={8} className="animate-pulse" /> BROADCAST_FEED
          </div>
          <div className="text-[8px] amber-glow uppercase font-mono h-4 overflow-hidden italic opacity-60">
             SYNCING_REALITY_DELTA...
          </div>
        </div>
      )}
    </motion.aside>
  );
}
