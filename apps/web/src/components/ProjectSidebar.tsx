"use client";

import { motion } from "framer-motion";
import { Terminal, LayoutGrid, Zap, Skull, Ghost } from "lucide-react";

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
    <aside className="w-64 border-r border-tactical-green/20 bg-black/40 backdrop-blur-md flex flex-col font-retro h-full">
      <div className="p-4 border-b border-tactical-green/20">
        <h3 className="text-tactical-green text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
          <LayoutGrid size={14} /> Project Scoreboard
        </h3>
        <div className="bg-zinc-900/50 p-2 border border-tactical-green/10">
          <div className="text-[10px] text-tactical-green/50 uppercase mb-1">Active Simulation</div>
          <div className="text-tactical-green text-sm truncate">SCOPECREEPER_V1.0</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {PROJECTS.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(57, 255, 20, 0.05)" }}
            className={`p-3 border cursor-pointer transition-colors ${
              project.name === "SCOPECREEPER" 
                ? "border-tactical-magenta/40 bg-tactical-magenta/5" 
                : "border-tactical-green/10 bg-black/20"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs tracking-wider ${
                project.tier === 'delusion' ? 'text-tactical-magenta' : 'text-tactical-green'
              }`}>
                {project.name}
              </span>
              <span className="text-[10px] opacity-50">#{project.id}</span>
            </div>

            {/* Delusion Mini-Meter */}
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${project.score}%` }}
                className={`h-full ${
                  project.score > 90 ? 'bg-tactical-magenta' : 
                  project.score > 70 ? 'bg-tactical-red' :
                  project.score > 30 ? 'bg-tactical-green' : 'bg-zinc-600'
                }`}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase opacity-60 truncate max-w-[100px]">
                {project.status}
              </span>
              <span className={`text-xs font-bold ${
                project.score > 90 ? 'text-tactical-magenta' : 'text-tactical-green'
              }`}>
                {project.score}
              </span>
            </div>
          </motion.div>
        ))}
      </nav>

      <div className="p-4 border-t border-tactical-green/20 bg-zinc-900/20">
        <div className="flex items-center gap-2 text-[10px] text-tactical-green/70 mb-2">
          <Zap size={10} className="animate-pulse" /> SYSTEM LOGS
        </div>
        <div className="text-[9px] text-tactical-green/40 leading-tight uppercase overflow-hidden h-8">
          <div className="animate-marquee">
            RECALCULATING: MULTIMODAL INJECTION DETECTED... SYNCING REALITY DELTA...
          </div>
        </div>
      </div>
    </aside>
  );
}
