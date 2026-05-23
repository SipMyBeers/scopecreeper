import React from "react";
import { Box, Text } from "ink";

export interface RepoHealth {
  name: string;
  path: string;
  score: number | null;
  tier: string | null;
  scanning: boolean;
  error?: boolean;
}

interface Props {
  repos: RepoHealth[];
  selected: number;
}

function tierColor(tier: string | null): string {
  if (!tier) return "gray";
  if (tier === "delusion") return "redBright";
  if (tier === "abyss") return "yellowBright";
  if (tier === "sweetspot") return "greenBright";
  return "cyanBright"; // corpse
}

function scoreLine(score: number): string {
  const filled = Math.round(score / 10);
  return "▓".repeat(filled) + "░".repeat(10 - filled) + ` ${score}`;
}

export default function RepoList({ repos, selected }: Props) {
  return (
    <Box flexDirection="column" width={26} borderStyle="single" borderColor="#39ff14" paddingX={1}>
      <Text color="#39ff14" bold>REPOS ({repos.length})</Text>
      <Text> </Text>
      {repos.length === 0 && (
        <Text color="gray">no repos — press a</Text>
      )}
      {repos.map((r, i) => {
        const isSelected = i === selected;
        return (
          <Box key={r.path} flexDirection="column" marginBottom={1}>
            <Text color={isSelected ? "#ff007f" : "#39ff14"} bold={isSelected}>
              {isSelected ? "▸ " : "  "}{r.name}
            </Text>
            {r.scanning ? (
              <Text color="gray">{"  "}⟳ scanning...</Text>
            ) : r.error ? (
              <Text color="red">{"  "}API unreachable</Text>
            ) : r.score !== null ? (
              <>
                <Text color={tierColor(r.tier)}>
                  {"  "}{scoreLine(r.score)}
                </Text>
                <Text color={tierColor(r.tier)} dimColor>
                  {"  "}{(r.tier ?? "").toUpperCase()}
                </Text>
              </>
            ) : (
              <Text color="gray">{"  "}— awaiting scan</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
