import Hero from "@/components/Hero";

export default function Page() {
  return (
    <div className="relative min-h-screen">
      {/* Background Static/Grain Effect */}
      <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      
      <Hero />
      
      {/* Interactive Glitch Border */}
      <div className="fixed inset-0 pointer-events-none border-[12px] border-tactical-magenta/5 z-50 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-tactical-magenta/20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-tactical-magenta/20 animate-pulse" />
        <div className="absolute top-0 left-0 h-full w-1 bg-tactical-magenta/20 animate-pulse" />
        <div className="absolute top-0 right-0 h-full w-1 bg-tactical-magenta/20 animate-pulse" />
      </div>
    </div>
  );
}
