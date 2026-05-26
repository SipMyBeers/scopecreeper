/**
 * Sprint 0b: hit the live /api/score then /api/creep?artifactKind=SHIPPABLE
 * for a battery of seeds. Print results so we can manually rate quality.
 */
const BASE = process.env.BASE ?? "https://ca403d22.scopecreeper.pages.dev";
const SEEDS = [
  "hello",
  "build a notion competitor",
];
const KINDS = process.env.KINDS?.split(",") ?? ["SHIPPABLE"];

async function scan(seed) {
  const res = await fetch(`${BASE}/api/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "chatlog", payload: seed }),
  });
  const cookie = res.headers.get("set-cookie") ?? "";
  const body = await res.json();
  return { cookie, body };
}

async function creep(cookie, parentSummary, dimension, artifactKind) {
  const res = await fetch(`${BASE}/api/creep`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ parentSummary, dimension, artifactKind }),
  });
  return await res.json();
}

for (const seed of SEEDS) {
  console.log(`\n${"=".repeat(70)}\nSEED: ${seed}\n${"=".repeat(70)}`);
  try {
    const { cookie, body } = await scan(seed);
    if (body.error) {
      console.log(`scan error: ${JSON.stringify(body)}`);
      continue;
    }
    const dims = body.dimensions ?? [];
    if (!dims.length) {
      console.log(`no dimensions returned`);
      continue;
    }
    const pick = dims[Math.min(1, dims.length - 1)]; // middle-ish dim
    console.log(`picked dim: ${pick.label} — ${pick.blurb}\n`);
    const parentSummary = `${body.verdict}. ${body.analysis}`;
    for (const kind of KINDS) {
      console.log(`\n--- ${kind} ---`);
      const art = await creep(cookie, parentSummary, pick, kind);
      if (art.error) {
        console.log(`creep error: ${JSON.stringify(art).slice(0, 600)}`);
        continue;
      }
      console.log(`title: ${art.artifact?.title}`);
      if (art.artifact?.labels) console.log(`labels: ${art.artifact.labels.join(", ")}`);
      if (art.artifact?.embed_markdown) console.log(`embed: ${art.artifact.embed_markdown}`);
      console.log(`mime: ${art.artifact?.mime}`);
      console.log(`body:\n${art.artifact?.body ?? "(no body)"}`);
    }
  } catch (err) {
    console.log(`fatal: ${err.message}`);
  }
}
