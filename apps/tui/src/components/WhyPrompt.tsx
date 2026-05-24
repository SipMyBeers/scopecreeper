import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface Props {
  repoName: string;
  hash: string;
  subject: string;
  score: number;
  tier: string;
  verdict: string;
  analysis: string;
  input: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}

export default function WhyPrompt({
  repoName, hash, subject, score, tier, verdict, analysis, input, onChange, onSubmit,
}: Props) {
  return (
    <Box flexDirection="column" borderStyle="double" borderColor="#ff007f"
      paddingX={2} paddingY={1} marginX={2} marginY={1}>
      <Box justifyContent="space-between">
        <Text color="#ff007f" bold>▸ DRIFT DETECTED · explain yourself</Text>
        <Text color="gray">{repoName} #{hash}</Text>
      </Box>
      <Text> </Text>

      <Text color="white" bold>{subject}</Text>
      <Text> </Text>

      <Text color="yellowBright">{score}/100  {tier.toUpperCase()}  ·  {verdict}</Text>
      <Text color="gray" wrap="wrap">{analysis}</Text>
      <Text> </Text>

      <Text color="#ff007f">Why does this commit need to exist?</Text>
      <Text color="gray" dimColor>
        (one sentence — be honest. logged with the commit hash. enter to submit,
        esc to dismiss without answering.)
      </Text>
      <Text> </Text>

      <Box borderStyle="single" borderColor="#ff007f" paddingX={1}>
        <Text color="#39ff14">▸ </Text>
        <TextInput
          value={input}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="because..."
        />
      </Box>
    </Box>
  );
}
