import React from "react";
import { Box, Text } from "ink";

export interface RepoHealth {
  name: string;
  path: string;
  score: number | null;
  tier: string | null;
  scanning: boolean;
  error?: boolean;
  history?: number[]; // last N scores for sparkline
  branch?: string;
}

interface Props {
  repos: RepoHealth[];
  selected: number;
  active?: boolean;
  borderColor?: string;
}

const SPARK = "▁▂▃▄▅▆▇█";

function sparkline(history: number[]): string {
  if (!history.length) return "";
  const max = 100;
  return history.map((v) => {
    const idx = Math.min(SPARK.length - 1, Math.max(0, Math.floor((v / max) * (SPARK.length - 1))));
    return SPARK[idx];
  }).join("");
}

function tierColor(tier: string | null): string {
  if (!tier) return "gray";
  if (tier === "delusion") return "redBright";
  if (tier === "abyss") return "yellowBright";
  if (tier === "sweetspot") return "greenBright";
  return "cyanBright";
}

function branchColor(branch: string | undefined): string {
  if (!branch) return "gray";
  if (branch === "main" || branch === "master") return "green";
  if (branch.startsWith("feat") || branch.startsWith("fix")) return "yellow";
  return "magenta";
}

function scoreLine(score: number): string {
  const filled = Math.round(score / 10);
  return "▓".repeat(filled) + "░".repeat(10 - filled) + ` ${score}`;
}

export default function RepoList({ repos, selected, active, borderColor = "#39ff14" }: Props) {
  return (
    <Box flexDirection="column" width={28} borderStyle="single" borderColor={borderColor} paddingX={1}>
      <Text color={active ? "#ff007f" : "#39ff14"} bold>REPOS ({repos.length})</Text>
      <Text> </Text>
      {repos.length === 0 && (
        <Text color="gray">no repos — press a</Text>
      )}
      {repos.map((r, i) => {
        const isSelected = i === selected;
        const spark = sparkline(r.history ?? []);
        return (
          <Box key={r.path} flexDirection="column" marginBottom={1}>
            <Text color={isSelected ? "#ff007f" : "#39ff14"} bold={isSelected}>
              {isSelected ? "▸ " : "  "}{r.name}
            </Text>
            {r.branch && (
              <Text color={branchColor(r.branch)} dimColor>
                {"  "}⌥ {r.branch}
              </Text>
            )}
            {r.scanning ? (
              <Text color="gray">{"  "}⟳ scanning...</Text>
            ) : r.error ? (
              <Text color="red">{"  "}API unreachable</Text>
            ) : r.score !== null ? (
              <>
                <Text color={tierColor(r.tier)}>
                  {"  "}{scoreLine(r.score)}
                </Text>
                <Box>
                  <Text color={tierColor(r.tier)} dimColor>
                    {"  "}{(r.tier ?? "").toUpperCase()}
                  </Text>
                  {spark && (
                    <Text color={tierColor(r.tier)}> {spark}</Text>
                  )}
                </Box>
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
