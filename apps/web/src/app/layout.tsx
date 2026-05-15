import type { Metadata } from "next";
import { VT323, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start-2p",
});

export const metadata: Metadata = {
  title: "Scope Creeper | Tactical Diagnostic Engine",
  description: "AI Hallucinates Flaws. You Hallucinate Features. Let's find out who has the better delusion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${vt323.variable} ${jetbrainsMono.variable} ${pressStart2P.variable}`}>
      <body className="bg-[#050508] text-white antialiased selection:bg-tactical-green selection:text-black">
        <div className="crt-container relative min-h-screen overflow-hidden">
          {/* CRT Screen Curvature Effect */}
          <div className="crt-glass pointer-events-none fixed inset-0 z-[100]" />
          <div className="crt-scanline pointer-events-none fixed inset-0 z-[101]" />
          <div className="relative z-10 h-full">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
