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
  description:
    "AI Hallucinates Flaws. You Hallucinate Features. Let's find out who has the better delusion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${vt323.variable} ${jetbrainsMono.variable} ${pressStart2P.variable}`}
    >
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
