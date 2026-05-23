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
}

function tierColor(tier: string | null): string {
  if (!tier) return "gray";
  if (tier === "delusion") return "red";
  if (tier === "abyss") return "yellow";
  if (tier === "sweetspot") return "green";
  return "cyan";
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function DriftFeed({ events }: Props) {
  const visible = events.slice(-8).reverse();
  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="#39ff14" paddingX={1}>
      <Text color="#39ff14" bold>DRIFT FEED</Text>
      <Text> </Text>
      {visible.length === 0 && (
        <Text color="gray" dimColor>watching for commits...</Text>
      )}
      {visible.map((ev) => (
        <Box key={ev.id} flexDirection="column" marginBottom={1}>
          <Box gap={1}>
            <Text color="gray">{timeAgo(ev.ts)}</Text>
            <Text color="#5cb8ff" bold>{ev.repoName}</Text>
            <Text color="gray">#{ev.hash}</Text>
          </Box>
          <Text color="white">{ev.subject}</Text>
          {ev.scanning && <Text color="gray">⟳ analyzing drift...</Text>}
          {!ev.scanning && ev.score !== null && (
            <Box gap={1}>
              <Text color={tierColor(ev.tier)} bold>
                {ev.score}/100 {ev.tier?.toUpperCase()}
              </Text>
              <Text color="gray">·</Text>
              <Text color={tierColor(ev.tier)}>{ev.verdict}</Text>
            </Box>
          )}
          {!ev.scanning && ev.analysis && (
            <Text color="gray" wrap="wrap">{ev.analysis.slice(0, 120)}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
