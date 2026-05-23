import React from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

export interface ChatMessage {
  role: "user" | "creeper";
  text: string;
  ts: Date;
}

interface Props {
  messages: ChatMessage[];
  input: string;
  focused: boolean;
  onInputChange: (v: string) => void;
  onSubmit: (v: string) => void;
}

export default function ChatPane({ messages, input, focused, onInputChange, onSubmit }: Props) {
  const visible = messages.slice(-10);
  return (
    <Box flexDirection="column" width={36} borderStyle="single"
      borderColor={focused ? "#ff007f" : "#39ff14"} paddingX={1}>
      <Text color="#ff007f" bold>ASK CREEPER</Text>
      <Text color="gray" dimColor>tab to focus · enter to send</Text>
      <Text> </Text>
      <Box flexDirection="column" flexGrow={1}>
        {visible.length === 0 && (
          <Text color="gray" dimColor>{"Ask about any commit or repo..."}</Text>
        )}
        {visible.map((m, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text color={m.role === "user" ? "#5cb8ff" : "#ff007f"} bold>
              {m.role === "user" ? "> " : "🌀 "}
            </Text>
            <Text color={m.role === "user" ? "white" : "#e8ffe8"} wrap="wrap">
              {m.text}
            </Text>
          </Box>
        ))}
      </Box>
      <Box borderStyle="single" borderColor={focused ? "#ff007f" : "gray"} paddingX={1} marginTop={1}>
        {focused ? (
          <TextInput
            value={input}
            onChange={onInputChange}
            onSubmit={onSubmit}
            placeholder="type question..."
          />
        ) : (
          <Text color="gray">{input || "type question..."}</Text>
        )}
      </Box>
    </Box>
  );
}
