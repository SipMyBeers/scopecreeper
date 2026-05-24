import React from "react";
import { Box, Text } from "ink";
import type { Justification } from "../justifications.js";

interface Props {
  entries: Justification[];
  filter?: string; // repo name filter
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function JustificationLog({ entries, filter }: Props) {
  const filtered = filter ? entries.filter((e) => e.repo === filter) : entries;
  const recent = filtered.slice(-30).reverse();
  const dismissed = filtered.filter((e) => !e.justification.trim()).length;

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="#39ff14"
      paddingX={2} paddingY={1} marginX={2} marginY={1}>
      <Box justifyContent="space-between">
        <Text color="#39ff14" bold>▸ JUSTIFICATION LOG{filter ? ` · ${filter}` : ""}</Text>
        <Text color="gray">
          {filtered.length} drifts · {dismissed} dismissed
        </Text>
      </Box>
      <Text> </Text>

      {recent.length === 0 && (
        <Text color="gray" dimColor>
          no justifications yet. drift a commit and you&apos;ll see your reasoning here.
        </Text>
      )}

      {recent.map((e, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Box gap={1}>
            <Text color="gray">{timeAgo(e.ts)} ago</Text>
            <Text color="#5cb8ff">{e.repo}</Text>
            <Text color="gray">#{e.hash.slice(0, 7)}</Text>
            <Text color={e.score >= 71 ? "redBright" : e.score >= 50 ? "yellowBright" : "green"}>
              {e.score}/100
            </Text>
          </Box>
          <Text color="white" wrap="wrap">{e.subject}</Text>
          {e.justification.trim() ? (
            <Text color="#39ff14" wrap="wrap">  ▸ {e.justification}</Text>
          ) : (
            <Text color="red" dimColor>  ✗ dismissed without answering</Text>
          )}
        </Box>
      ))}

      <Text> </Text>
      <Text color="gray" dimColor>esc to close · file: ~/.config/scopecreeper/justifications.json</Text>
    </Box>
  );
}
