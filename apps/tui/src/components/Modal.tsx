import React from "react";
import { Box, Text } from "ink";

interface Props {
  title: string;
  subtitle?: string;
  color?: string;
  body: string;
  footer?: string;
  loading?: boolean;
}

export default function Modal({ title, subtitle, color = "#ff007f", body, footer, loading }: Props) {
  // Render line-by-line so we can color markdown headings.
  const lines = body.split("\n").slice(0, 40);
  return (
    <Box flexDirection="column" borderStyle="double" borderColor={color} paddingX={2} paddingY={1} marginX={2} marginY={1}>
      <Box justifyContent="space-between">
        <Text color={color} bold>▸ {title}</Text>
        {subtitle && <Text color="gray">{subtitle}</Text>}
      </Box>
      <Text> </Text>
      {loading ? (
        <Text color="gray">⟳ generating...</Text>
      ) : (
        lines.map((line, i) => {
          if (line.startsWith("## ")) {
            return <Text key={i} color={color} bold>{line.replace(/^## /, "")}</Text>;
          }
          if (line.startsWith("# ")) {
            return <Text key={i} color={color} bold>{line.replace(/^# /, "").toUpperCase()}</Text>;
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return <Text key={i} color="white">  • {line.slice(2)}</Text>;
          }
          if (/^\d+\.\s/.test(line)) {
            return <Text key={i} color="white">{line}</Text>;
          }
          return <Text key={i} color="white" wrap="wrap">{line}</Text>;
        })
      )}
      {footer && (
        <>
          <Text> </Text>
          <Text color="gray" dimColor>{footer}</Text>
        </>
      )}
    </Box>
  );
}
