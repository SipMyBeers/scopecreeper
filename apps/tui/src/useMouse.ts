import { useEffect } from "react";

/**
 * Enable xterm SGR mouse tracking (mode 1006). Reports any click as
 * an escape sequence: `\x1b[<button;col;rowM` (press) / `m` (release).
 * The terminal sends col/row 1-indexed.
 *
 * Limitations: mouse support depends on the terminal emulator. Ghostty,
 * iTerm2, Alacritty, Terminal.app all support 1006. Inside `tmux` the
 * pass-through must be enabled (`set -g mouse on`).
 */
export interface MouseEvent {
  button: number;
  col: number; // 1-indexed
  row: number; // 1-indexed
  released: boolean;
}

const ENABLE = "\x1b[?1006h\x1b[?1000h";
const DISABLE = "\x1b[?1000l\x1b[?1006l";
const MOUSE_RE = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/;

export function useMouse(onClick: (ev: MouseEvent) => void): void {
  useEffect(() => {
    if (!process.stdin.isTTY) return;
    process.stdout.write(ENABLE);

    const onData = (chunk: Buffer) => {
      const s = chunk.toString("utf8");
      const m = s.match(MOUSE_RE);
      if (!m) return;
      const button = Number(m[1]);
      const col = Number(m[2]);
      const row = Number(m[3]);
      const released = m[4] === "m";
      // Only fire on press (not release) so single click = single event.
      if (released) return;
      // Button 0 = left click. Higher numbers are scroll/drag — ignore.
      if (button !== 0) return;
      onClick({ button, col, row, released });
    };

    process.stdin.on("data", onData);

    return () => {
      process.stdout.write(DISABLE);
      process.stdin.off("data", onData);
    };
  }, [onClick]);
}
