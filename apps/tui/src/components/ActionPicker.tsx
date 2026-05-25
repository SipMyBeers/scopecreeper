import React from "react";
import { Box, Text } from "ink";
import type { Action } from "../diary.js";
import type { ActionExplanations } from "../api.js";
import type { AcceptEscalation } from "../escalation.js";
import { escalationHint } from "../escalation.js";

interface Props {
  repoName: string;
  hash: string;
  subject: string;
  driftScore: number;
  tier: string;
  verdict: string;
  analysis: string;
  actionScores: Record<Action, number>;
  selected: Action;
  recommended: Action;
  /** Per-route LLM-generated explanation. null = still loading. */
  explanations: ActionExplanations | null;
  /** Escalation state for the ACCEPT route. */
  escalation: AcceptEscalation;
}

const ACTIONS: { key: Action; label: string; hint: string }[] = [
  { key: "REDIRECT", label: "REDIRECT", hint: "copy a 'stop drifting' prompt to clipboard → paste into Claude" },
  { key: "EXPAND",   label: "EXPAND",   hint: "add this feature to .scopecreeper.md (legitimize)" },
  { key: "KILL",     label: "KILL",     hint: "generate the autopsy artifact for the drifty branch" },
  { key: "ACCEPT",   label: "ACCEPT",   hint: "keep it, log a justification, scope unchanged" },
];

function scoreColor(score: number): string {
  if (score >= 71) return "redBright";
  if (score >= 50) return "yellowBright";
  if (score >= 25) return "yellow";
  return "greenBright";
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return "▓".repeat(filled) + "░".repeat(10 - filled);
}

export default function ActionPicker(props: Props) {
  const { repoName, hash, subject, driftScore, tier, verdict, analysis,
          actionScores, selected, recommended, explanations, escalation } = props;

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="#ff007f"
      paddingX={2} paddingY={1} marginX={2} marginY={1}>
      <Box justifyContent="space-between">
        <Text color="#ff007f" bold>▸ DRIFT · pick a route</Text>
        <Text color="gray">{repoName} #{hash}</Text>
      </Box>
      <Text> </Text>

      <Text color="white" bold>{subject}</Text>
      <Text color={scoreColor(driftScore)}>{driftScore}/100  {tier.toUpperCase()}  ·  {verdict}</Text>
      <Text color="gray" wrap="wrap">{analysis}</Text>
      <Text> </Text>

      {ACTIONS.map((a) => {
        const score = actionScores[a.key];
        const isSel = a.key === selected;
        const isRec = a.key === recommended;
        const why = explanations ? explanations[a.key as keyof ActionExplanations] : undefined;
        const escHint = a.key === "ACCEPT" ? escalationHint(escalation) : "";
        return (
          <Box key={a.key} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              <Text color={isSel ? "#ff007f" : "#39ff14"} bold={isSel}>
                {isSel ? "▸ " : "  "}{a.label}
              </Text>
              <Text color={scoreColor(score)}>{scoreBar(score)} {score}/100</Text>
              {isRec && <Text color="cyanBright">★ recommended</Text>}
              {a.key === "ACCEPT" && escalation.level === 1 && (
                <Text color="yellowBright">⚠ reason required</Text>
              )}
              {a.key === "ACCEPT" && escalation.level === 2 && (
                <Text color="redBright">⚠ full justification required</Text>
              )}
            </Box>
            <Text color="gray">{"   "}{a.hint}</Text>
            {escHint && (
              <Text color={escalation.level === 2 ? "redBright" : "yellowBright"} wrap="wrap">
                {"   ↑ "}{escHint}
              </Text>
            )}
            {why ? (
              <Text color={isRec ? "cyanBright" : "white"} wrap="wrap">
                {"   why: "}{why}
              </Text>
            ) : (
              <Text color="gray" dimColor>{"   ⟳ analyzing route against your scope doc..."}</Text>
            )}
          </Box>
        );
      })}

      {!explanations && (
        <Text color="gray" dimColor>analysis loading — picker is usable now, ↑↓ select · enter confirm · esc dismiss</Text>
      )}
      {explanations && (
        <Text color="gray" dimColor>↑↓ select · enter confirm · esc dismiss</Text>
      )}
    </Box>
  );
}
