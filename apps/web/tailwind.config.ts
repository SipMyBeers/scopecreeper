import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        onyx: "#0D0D11",
        tactical: {
          red: "#FF0000",
          magenta: "#FF007F",
          green: "#39FF14",
          amber: "#FFB000",
        },
      },
      fontFamily: {
        retro: ["var(--font-vt323)", "monospace"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      animation: {
        glitch: "glitch 1s infinite linear alternate-reverse",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
