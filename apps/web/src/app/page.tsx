import Hero from "@/components/Hero";

export default function Page() {
  return (
    <div className="crt-screen min-h-screen flex">
      {/* The Global CRT Frame & Static */}
      <div className="crt-frame" />
      <div className="crt-static" />
      
      {/* 
        NOTE: I've moved the sidebar out of the main hero to match the image focus. 
        It can be re-added as a slide-over or a toggleable terminal.
      */}
      <Hero />
    </div>
  );
}
