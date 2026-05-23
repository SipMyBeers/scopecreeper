import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

export interface ChatMessage {
  role: "user" | "creeper";
  text: string;
  ts: Date;
}

interface Props {
  messages: ChatMessage[];
  input: string;
  active?: boolean;
  inputActive?: boolean;
  onInputChange: (v: string) => void;
  onSubmit: (v: string) => void;
  borderColor?: string;
}

export default function ChatPane({ messages, input, active, inputActive, onInputChange, onSubmit, borderColor = "#39ff14" }: Props) {
  const visible = messages.slice(-8);
  return (
    <Box flexDirection="column" width={38} borderStyle="single" borderColor={borderColor} paddingX={1}>
      <Text color={active ? "#ff007f" : "#39ff14"} bold>ASK CREEPER</Text>
      <Text color="gray" dimColor>enter to type · /q to close</Text>
      <Text> </Text>
      <Box flexDirection="column" flexGrow={1}>
        {visible.length === 0 && (
          <Text color="gray" dimColor>ask about any commit or repo</Text>
        )}
        {visible.map((m, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text color={m.role === "user" ? "#5cb8ff" : "#ff007f"} bold>
              {m.role === "user" ? "YOU" : "🌀 CREEPER"}
            </Text>
            <Text color={m.role === "user" ? "white" : "#e8ffe8"} wrap="wrap">
              {m.text}
            </Text>
          </Box>
        ))}
      </Box>
      <Box borderStyle="single" borderColor={inputActive ? "#ff007f" : "gray"} paddingX={1} marginTop={1}>
        {inputActive ? (
          <TextInput
            value={input}
            onChange={onInputChange}
            onSubmit={onSubmit}
            placeholder="ask creeper..."
          />
        ) : (
          <Text color="gray">{input || (active ? "← enter to type" : "type question...")}</Text>
        )}
      </Box>
    </Box>
  );
}
