/**
 * Pre-build the homepage OG image as a static PNG. Runs at build time so we
 * don't hit edge-runtime satori limits. Output: public/og/root.png
 */
import satori from "satori";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fontPath = `${here}/../public/og-fonts/inter-bold.woff`;
const wasmPath = `${here}/../public/wasm/resvg.wasm`;
const outPath = `${here}/../public/og/root.png`;

mkdirSync(dirname(outPath), { recursive: true });
const fontBuf = readFileSync(fontPath);

const tree = {
  type: "div",
  props: {
    style: {
      width: "1200px",
      height: "630px",
      background: "#050308",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter",
      color: "#e8ffe8",
      padding: "72px",
      border: "12px solid #ff007f",
    },
    children: [
      {
        type: "div",
        props: {
          style: { fontSize: "28px", letterSpacing: "10px", opacity: 0.55 },
          children: "SCOPE CREEPER",
        },
      },
      {
        type: "div",
        props: {
          style: {
            fontSize: "100px",
            lineHeight: 1,
            marginTop: "16px",
            color: "#39ff14",
            textAlign: "center",
          },
          children: "DELUSION : SCORED",
        },
      },
      {
        type: "div",
        props: {
          style: {
            fontSize: "32px",
            marginTop: "32px",
            opacity: 0.85,
            textAlign: "center",
            maxWidth: "960px",
          },
          children:
            "Paste a repo, a chatlog, or one word. Get a skill-tree of project paths you could build — and a shippable v0 PRD you can commit to GitHub.",
        },
      },
      {
        type: "div",
        props: {
          style: {
            fontSize: "22px",
            marginTop: "40px",
            letterSpacing: "8px",
            color: "#ffb000",
          },
          children: "SCOPECREEPER.AI",
        },
      },
    ],
  },
};

const start = Date.now();
const svg = await satori(tree, {
  width: 1200,
  height: 630,
  fonts: [{ name: "Inter", data: fontBuf, weight: 700, style: "normal" }],
});

const { Resvg, initWasm } = await import("@resvg/resvg-wasm");
await initWasm(readFileSync(wasmPath));
const png = new Resvg(svg).render().asPng();
writeFileSync(outPath, png);
console.log(`og: built ${outPath} in ${Date.now() - start}ms (${png.length} bytes)`);
