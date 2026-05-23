import React from "react";
import { Box, Text } from "ink";

export interface RepoHealth {
  name: string;
  path: string;
  score: number | null;
  tier: string | null;
  scanning: boolean;
}

interface Props {
  repos: RepoHealth[];
  selected: number;
}

function tierColor(tier: string | null): string {
  if (!tier) return "gray";
  if (tier === "delusion") return "red";
  if (tier === "abyss") return "yellow";
  if (tier === "sweetspot") return "green";
  return "cyan"; // corpse
}

function scoreBar(score: number | null): string {
  if (score === null) return "░░░░░░░░░░";
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export default function RepoList({ repos, selected }: Props) {
  return (
    <Box flexDirection="column" width={24} borderStyle="single" borderColor="#39ff14" paddingX={1}>
      <Text color="#39ff14" bold>REPOS ({repos.length})</Text>
      <Text> </Text>
      {repos.map((r, i) => (
        <Box key={r.path} flexDirection="column" marginBottom={1}>
          <Text color={i === selected ? "#ff007f" : "#39ff14"} bold={i === selected}>
            {i === selected ? "▸ " : "  "}{r.name}
          </Text>
          <Text color={tierColor(r.tier)} dimColor={r.score === null}>
            {"  "}{r.scanning ? "⟳ scanning..." : scoreBar(r.score)}
          </Text>
          {r.tier && (
            <Text color={tierColor(r.tier)} dimColor>
              {"  "}{r.score ?? "?"}/100 {r.tier.toUpperCase()}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
