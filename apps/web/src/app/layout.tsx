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

const SITE_URL = "https://scopecreeper.ai";
const DEFAULT_TITLE = "Scope Creeper · Become one";
const DEFAULT_DESC =
  "A watcher for the work you ship with AI. Background daemon scores every commit against your declared scope, fires a notification on drift, and hands you a ranked picker of what to do next. The second pair of eyes your AI doesn't have.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Scope Creeper",
  },
  description: DEFAULT_DESC,
  applicationName: "Scope Creeper",
  keywords: [
    "scope creeper",
    "ai pair programming",
    "scope drift detection",
    "claude code tools",
    "cursor tools",
    "developer accountability",
    "ai coding discipline",
    "git pre-commit hook",
    "delusion score",
    "indie hacker tools",
  ],
  authors: [{ name: "Scope Creeper" }],
  creator: "Scope Creeper",
  publisher: "Scope Creeper",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Scope Creeper",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: [
      {
        url: "/og/root.png",
        width: 1200,
        height: 630,
        alt: "Scope Creeper — become a watcher of your own work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: ["/og/root.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: { icon: "/favicon.ico" },
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
