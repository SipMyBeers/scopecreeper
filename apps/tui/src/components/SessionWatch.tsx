import React from "react";
import { Box, Text } from "ink";
import type { CcEvent } from "../cc-session.js";

interface Props {
  repoName: string;
  sessionId: string;
  jsonlPath: string;
  events: CcEvent[];
  driftPaths: Set<string>; // file paths flagged as drift
  startedAt: number | null;
  liveTick: number; // increment to force re-render of relative time
}

function timeSince(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function eventColor(ev: CcEvent, driftPaths: Set<string>): string {
  if (ev.kind === "user") return "#5cb8ff";
  if (ev.kind === "assistant-text") return "#e8ffe8";
  if (ev.kind === "tool-use") {
    if (ev.filePath && driftPaths.has(ev.filePath)) return "#ff007f";
    if (ev.tool === "Edit" || ev.tool === "Write") return "#39ff14";
    if (ev.tool === "Bash") return "yellow";
    return "gray";
  }
  return "gray";
}

function eventGlyph(ev: CcEvent, driftPaths: Set<string>): string {
  if (ev.kind === "user") return "▸";
  if (ev.kind === "assistant-text") return "·";
  if (ev.kind === "tool-use") {
    if (ev.filePath && driftPaths.has(ev.filePath)) return "✗";
    if (ev.tool === "Edit") return "✎";
    if (ev.tool === "Write") return "✚";
    if (ev.tool === "Bash") return "$";
    return "⚙";
  }
  return " ";
}

function eventLabel(ev: CcEvent): string {
  if (ev.kind === "user") return ev.text;
  if (ev.kind === "assistant-text") return ev.text;
  if (ev.kind === "tool-use") {
    if (ev.filePath) {
      // Strip repo root prefix for readability
      const short = ev.filePath.replace(/^.*\/(apps|src|packages|tools)\//, "$1/");
      return `${ev.tool}  ${short}`;
    }
    if (ev.command) return `${ev.tool}  ${ev.command}`;
    return ev.tool;
  }
  return "";
}

export default function SessionWatch({ repoName, sessionId, events, driftPaths, startedAt, liveTick: _ }: Props) {
  const visible = events.slice(-30);
  const drifts = events.filter((e) => e.kind === "tool-use" && e.filePath && driftPaths.has(e.filePath)).length;
  const tools = events.filter((e) => e.kind === "tool-use").length;
  const userMsgs = events.filter((e) => e.kind === "user").length;

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="#5cb8ff"
      paddingX={2} paddingY={1} marginX={2} marginY={1}>
      <Box justifyContent="space-between">
        <Text color="#5cb8ff" bold>▸ WATCHING CLAUDE CODE · {repoName}</Text>
        <Text color="gray">{sessionId.slice(0, 8)}</Text>
      </Box>
      <Box gap={2}>
        <Text color="gray">{startedAt ? `session started ${timeSince(startedAt)} ago` : "live"}</Text>
        <Text color="#5cb8ff">{userMsgs} msgs</Text>
        <Text color="#39ff14">{tools} tool calls</Text>
        {drifts > 0 ? (
          <Text color="#ff007f" bold>{drifts} drift</Text>
        ) : (
          <Text color="gray">no drift yet</Text>
        )}
      </Box>
      <Text> </Text>

      {visible.length === 0 ? (
        <Text color="gray" dimColor>
          no events yet. open a Claude Code session in this repo and Edit/Write/Bash calls will stream here in real time.
        </Text>
      ) : (
        visible.map((ev, i) => (
          <Box key={i} gap={1}>
            <Text color={eventColor(ev, driftPaths)}>{eventGlyph(ev, driftPaths)}</Text>
            <Text color={eventColor(ev, driftPaths)} wrap="truncate-end">
              {eventLabel(ev)}
            </Text>
          </Box>
        ))
      )}

      <Text> </Text>
      <Text color="gray" dimColor>
        ▸ user msg · ✎ Edit · ✚ Write · $ Bash · ✗ DRIFT (path matches NOT/deferred scope) · esc to close
      </Text>
    </Box>
  );
}
