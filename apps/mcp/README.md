# @scopecreeper/mcp

> A Claude Code MCP server that lets your agent ask **Scope Creeper** for an adversarial second opinion before it writes code.

Scope Creeper is a tactical diagnostic engine for builders — it scores how delusional any project is, surfaces alternative paths, and on demand produces a brutally honest one-page autopsy (**KILL**) or a shippable v0 PRD (**SHIPPABLE**).

This MCP server exposes three tools:

| Tool | Tier | What it does |
|---|---|---|
| `scope_creeper_scan` | Free | Quick delusion score + tier + verdict + alternate paths |
| `scope_creeper_kill` | Free | One-page autopsy arguing the project should NOT be built |
| `scope_creeper_shippable` | Pro | One-page PRD with stack + V0 scope + paste-runnable commands |

## Install in Claude Code

```bash
# 1. (Optional) generate an API key at https://scopecreeper.ai/account
#    Free tier works without a key but is per-IP rate-limited.

# 2. Add the MCP server to Claude Code
claude mcp add scope-creeper -- npx -y @scopecreeper/mcp \
  --api-key=sk_sc_live_YOUR_KEY
```

If you prefer environment variables, set `SCOPE_CREEPER_API_KEY` and omit the flag.

## Use it

In Claude Code, ask for an adversarial review before any big build:

```
Before you write the code, use scope-creeper to KILL this plan:
  "Build a Notion competitor with AI built in, calendar, CRM, voice notes."
```

Claude will call `scope_creeper_kill` and return a markdown autopsy with dated cutoff signals, sunk-cost framing, and a one-line eulogy. If the plan survives that, ask for a `scope_creeper_shippable` to get a paste-runnable v0 spec.

## Flags

| Flag | Env | Default | Purpose |
|---|---|---|---|
| `--api-key=...` | `SCOPE_CREEPER_API_KEY` | (none) | Pro entitlement + higher rate limits |
| `--base=...` | `SCOPE_CREEPER_BASE` | `https://scopecreeper.ai` | Override the API origin (dev / staging) |

## License

MIT · © Beers Labs LLC · https://scopecreeper.ai
