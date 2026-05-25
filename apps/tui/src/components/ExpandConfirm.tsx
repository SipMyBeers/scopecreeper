import React from "react";
import { Box, Text } from "ink";

interface Props {
  repoName: string;
  hash: string;
  subject: string;
  driftScore: number;
  /** The LLM-generated past-you counter-argument. null = still loading. */
  counter: string | null;
  /** Which button is highlighted: "back" or "confirm". */
  selected: "back" | "confirm";
}

export default function ExpandConfirm({ repoName, hash, subject, driftScore, counter, selected }: Props) {
  return (
    <Box flexDirection="column" borderStyle="double" borderColor="#ffb000"
      paddingX={2} paddingY={1} marginX={2} marginY={1}>
      <Box justifyContent="space-between">
        <Text color="#ffb000" bold>▸ EXPAND · past-you objects</Text>
        <Text color="gray">{repoName} #{hash}</Text>
      </Box>
      <Text> </Text>

      <Text color="white" bold>{subject}</Text>
      <Text color="#ffb000">drift {driftScore}/100</Text>
      <Text> </Text>

      {counter ? (
        <>
          <Text color="#a855f7" bold>past-you says:</Text>
          <Box marginTop={1} flexDirection="column"
            borderStyle="single" borderColor="#a855f7" paddingX={1}>
            <Text color="white" wrap="wrap">{counter}</Text>
          </Box>
        </>
      ) : (
        <Text color="gray" dimColor>⟳ asking past-you to defend the scope doc...</Text>
      )}

      <Text> </Text>
      <Text color="gray">
        EXPAND will add a line to <Text color="#5cb8ff">.scopecreeper.md</Text> under
        the &quot;In-flight scope&quot; section. The change will be diffed against
        your old scope on every future commit.
      </Text>
      <Text> </Text>

      <Box gap={3}>
        <Box
          borderStyle="single"
          borderColor={selected === "back" ? "#5cb8ff" : "gray"}
          paddingX={2}
        >
          <Text color={selected === "back" ? "#5cb8ff" : "gray"} bold={selected === "back"}>
            {selected === "back" ? "▸ " : "  "}BACK to picker
          </Text>
        </Box>
        <Box
          borderStyle="single"
          borderColor={selected === "confirm" ? "#ff007f" : "gray"}
          paddingX={2}
        >
          <Text color={selected === "confirm" ? "#ff007f" : "gray"} bold={selected === "confirm"}>
            {selected === "confirm" ? "▸ " : "  "}CONFIRM EXPAND
          </Text>
        </Box>
      </Box>

      <Text> </Text>
      <Text color="gray" dimColor>← → switch · enter confirm · esc back to picker</Text>
    </Box>
  );
}
