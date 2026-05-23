import React from "react";
import { Box, Text } from "ink";

export interface DriftEvent {
  id: string;
  repoName: string;
  hash: string;
  subject: string;
  score: number | null;
  tier: string | null;
  verdict: string | null;
  analysis: string | null;
  ts: Date;
  scanning: boolean;
}

interface Props {
  events: DriftEvent[];
  selected: number;
  active?: boolean;
  borderColor?: string;
}

function tierColor(tier: string | null): string {
  if (!tier) return "gray";
  if (tier === "delusion") return "redBright";
  if (tier === "abyss") return "yellowBright";
  if (tier === "sweetspot") return "greenBright";
  return "cyanBright";
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export default function DriftFeed({ events, selected, active, borderColor = "#39ff14" }: Props) {
  const visible = [...events].reverse().slice(0, 8);
  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor={borderColor} paddingX={1}>
      <Text color={active ? "#ff007f" : "#39ff14"} bold>DRIFT FEED</Text>
      <Text> </Text>
      {visible.length === 0 && (
        <Text color="gray" dimColor>watching for commits...</Text>
      )}
      {visible.map((ev, i) => {
        const isSelected = active && i === (events.length - 1 - selected);
        return (
          <Box key={ev.id} flexDirection="column" marginBottom={1}
            borderStyle={isSelected ? "single" : undefined}
            borderColor={isSelected ? "#ff007f" : undefined}
            paddingX={isSelected ? 1 : 0}
          >
            <Box gap={1}>
              <Text color="gray">{timeAgo(ev.ts)}</Text>
              <Text color="#5cb8ff" bold>{ev.repoName}</Text>
              <Text color="gray">#{ev.hash}</Text>
            </Box>
            <Text color="white">{ev.subject}</Text>
            {ev.scanning && <Text color="gray">⟳ scoring...</Text>}
            {!ev.scanning && ev.score !== null && (
              <Text color={tierColor(ev.tier)} bold>
                {ev.score}/100 {ev.tier?.toUpperCase()} · {ev.verdict}
              </Text>
            )}
            {!ev.scanning && ev.analysis && (
              <Text color="gray" wrap="wrap">{ev.analysis.slice(0, 100)}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
