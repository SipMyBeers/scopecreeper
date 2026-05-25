import React from "react";
import { Box, Text } from "ink";
import type { Finding } from "../patterns.js";

interface Props {
  findings: Finding[];
  windowDays: number;
}

function sevColor(s: Finding["severity"]): string {
  if (s === "high") return "#ff007f";
  if (s === "warn") return "#ffb000";
  return "#5cb8ff";
}

function sevGlyph(s: Finding["severity"]): string {
  if (s === "high") return "✗";
  if (s === "warn") return "▲";
  return "■";
}

export default function PatternsPanel({ findings, windowDays }: Props) {
  return (
    <Box flexDirection="column" borderStyle="double" borderColor="#a855f7"
      paddingX={2} paddingY={1} marginX={2} marginY={1}>
      <Box justifyContent="space-between">
        <Text color="#a855f7" bold>▸ REAL TALK · pattern surveillance</Text>
        <Text color="gray">last {windowDays}d</Text>
      </Box>
      <Text> </Text>

      {findings.length === 0 ? (
        <>
          <Text color="#5cb8ff">no patterns yet — keep using the picker, and check back in a week.</Text>
          <Text> </Text>
          <Text color="gray" dimColor>
            (patterns surface after ~3+ decisions on the same area or 4+ dismissals)
          </Text>
        </>
      ) : (
        findings.map((f, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              <Text color={sevColor(f.severity)} bold>{sevGlyph(f.severity)}</Text>
              <Text color={sevColor(f.severity)} bold>{f.headline}</Text>
            </Box>
            {f.evidence.map((ev, j) => (
              <Text key={j} color="gray">{"   "}{ev}</Text>
            ))}
            <Text color="white" wrap="wrap">{"   → "}{f.suggestion}</Text>
          </Box>
        ))
      )}

      <Text> </Text>
      <Text color="gray" dimColor>esc to close · `creeper patterns` on the CLI prints the same report</Text>
    </Box>
  );
}
