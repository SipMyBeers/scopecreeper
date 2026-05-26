import satori from "satori";
import { readFileSync } from "node:fs";

const fontBuf = readFileSync(new URL("../public/og-fonts/inter-bold.woff", import.meta.url));

const start = Date.now();
const svg = await satori(
  {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Inter",
        color: "#e8ffe8",
      },
      children: [
        { type: "div", props: { style: { fontSize: "240px", color: "#ff7847" }, children: "73" } },
        { type: "div", props: { style: { fontSize: "48px", marginTop: "16px" }, children: "ABYSS-BOUND" } },
      ],
    },
  },
  {
    width: 1200,
    height: 630,
    fonts: [{ name: "Inter", data: fontBuf, weight: 700, style: "normal" }],
  }
);

console.log(`satori ok in ${Date.now() - start}ms, svg bytes: ${svg.length}`);

const wasmBuf = readFileSync(new URL("../public/wasm/resvg.wasm", import.meta.url));
const { Resvg, initWasm } = await import("@resvg/resvg-wasm");
await initWasm(wasmBuf);
const pngStart = Date.now();
const png = new Resvg(svg).render().asPng();
console.log(`resvg ok in ${Date.now() - pngStart}ms, png bytes: ${png.length}`);
console.log(`total: ${Date.now() - start}ms`);
import { writeFileSync } from "node:fs";
writeFileSync("/tmp/og-test.png", png);
console.log(`wrote /tmp/og-test.png`);
