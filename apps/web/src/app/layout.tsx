import type { Metadata } from "next";
import { VT323, JetBrains_Mono } from "next/font/google";
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
    <html lang="en" className={`${vt323.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-onyx text-white antialiased selection:bg-tactical-green selection:text-black">
        <div className="crt-overlay relative min-h-screen overflow-hidden">
          <div className="crt-scanline" />
          {children}
        </div>
      </body>
    </html>
  );
}
