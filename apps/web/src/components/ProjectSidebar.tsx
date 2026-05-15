"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Zap, User } from "lucide-react";

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
  return (
    <aside className="w-72 beveled-frame flex flex-col font-retro h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-white/5 bg-black/40">
        <h3 className="magenta-glow font-retro text-[10px] tracking-[0.3em] uppercase mb-4 flex items-center gap-2">
          <LayoutGrid size={12} /> Save Slots
        </h3>
        <div className="neon-groove p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center pixel-border-arcade">
            <User size={16} className="text-tactical-green" />
          </div>
          <div>
             <div className="text-[10px] text-tactical-green/50 uppercase">Player 1</div>
             <div className="text-tactical-green text-xs">DIAGNOSTIC_OPERATOR</div>
          </div>
        </div>
      </div>

      {/* Project List */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {PROJECTS.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ scale: 1.02, x: 4 }}
            className={`relative p-4 border-2 group cursor-pointer transition-all ${
              project.name === "SCOPECREEPER" 
                ? "border-tactical-magenta/40 bg-tactical-magenta/5" 
                : "border-white/5 bg-black/40"
            }`}
          >
            {/* 3D Rusted Edge Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
            
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] tracking-widest font-retro uppercase ${
                project.tier === 'delusion' ? 'magenta-glow' : 'text-tactical-green'
              }`}>
                {project.name}
              </span>
              <span className="text-[10px] opacity-30 font-mono">SLOT_{project.id}</span>
            </div>

            {/* Delusion Mini-Meter (Gradient) */}
            <div className="relative h-2 w-full bg-black border border-white/10 overflow-hidden mb-2 shadow-[inset_0_0_5px_rgba(0,0,0,1)]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${project.score}%` }}
                className={`h-full transition-all duration-1000 ${
                  project.score > 90 ? 'bg-gradient-to-r from-tactical-green via-tactical-amber to-tactical-magenta shadow-[0_0_10px_rgba(255,0,127,0.5)]' : 
                  project.score > 70 ? 'bg-gradient-to-r from-tactical-green to-tactical-red' :
                  project.score > 30 ? 'bg-tactical-green shadow-[0_0_8px_rgba(57,255,20,0.3)]' : 'bg-zinc-700'
                }`}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase opacity-40 font-mono italic">
                {project.status}
              </span>
              <span className={`text-xs font-retro ${
                project.score > 90 ? 'magenta-glow' : 'green-glow'
              }`}>
                {project.score}%
              </span>
            </div>
          </motion.div>
        ))}
      </nav>

      {/* System Status Marquee */}
      <div className="p-4 border-t border-white/5 bg-zinc-950/40">
        <div className="flex items-center gap-2 text-[10px] amber-glow mb-2">
          <Zap size={10} className="animate-pulse" /> BROADCAST_FEED
        </div>
        <div className="text-[9px] amber-glow leading-tight uppercase overflow-hidden h-8 font-mono italic">
          <div className="animate-marquee whitespace-nowrap">
            RECALCULATING: MULTIMODAL INJECTION DETECTED... SYNCING REALITY DELTA... ERROR_0x42: BUTTERFLY_EFFECT_CRITICAL...
          </div>
        </div>
      </div>
    </aside>
  );
}
