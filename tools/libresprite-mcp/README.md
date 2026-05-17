# libresprite-mcp

MCP server that exposes pixel-art tooling for Scope Creeper's arcade asset.

## Tools

| name | what it does |
|---|---|
| `arcade_recolor` | PNG → tier-palette variant (`corpse` / `sweetspot` / `abyss` / `delusion`). Preserves alpha + luminance, remaps the four neon hues per palette. |
| `arcade_animate` | PNG → N-frame horizontal sprite sheet PNG + sidecar JSON. Frames are jittered + glow-pulsed to simulate CRT flicker. |
| `sprite_sheet_export` | Drives `LibreSprite --batch --sheet … --data …` to export `.aseprite` sources as sprite sheets with JSON metadata. |
| `open_in_editor` | Launches LibreSprite UI on a file (non-blocking). Hand-edit hand-off. |

## Pipeline

Pixel manipulation runs in **Python + PIL** (deterministic, works in batch).
LibreSprite is used for what its CLI does well (sprite-sheet export with JSON
metadata, GUI editing). `app.activeSprite` is `null` in `--batch --script` mode
in the shipped LibreSprite 1.2-dev binary, so we don't depend on the JS pixel API.

## Running

```bash
cd tools/libresprite-mcp
pnpm install
pnpm run build
node dist/server.js   # stdio MCP server
```

The repo's `.mcp.json` registers this server as `libresprite` so any
MCP-aware client (Claude Code, Claude Desktop, etc.) picks it up automatically
when run from the project root.

## Direct invocation

The Python scripts can also be invoked stand-alone:

```bash
python3 scripts/recolor.py <in.png> <out.png> <corpse|sweetspot|abyss|delusion>
python3 scripts/animate.py <in.png> <sheet.png> [frames=6]
```

## Env overrides

- `PYTHON` — python interpreter (default: `python3` from /Library/Frameworks).
- `LIBRESPRITE` — LibreSprite binary path (default: the macOS .app bundle).
