#!/usr/bin/env node
import React, { useState, useEffect, useCallback } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { discoverRepos, loadScopeDoc, type TrackedRepo } from "./discovery.js";
import { watchRepo, unwatchAll } from "./watcher.js";
import { scanText, askCreeper } from "./api.js";
import RepoList, { type RepoHealth } from "./components/RepoList.js";
import DriftFeed, { type DriftEvent } from "./components/DriftFeed.js";
import ChatPane, { type ChatMessage } from "./components/ChatPane.js";

let eventCounter = 0;

function App() {
  const { exit } = useApp();
  const [repos, setRepos] = useState<TrackedRepo[]>([]);
  const [health, setHealth] = useState<Map<string, RepoHealth>>(new Map());
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatFocused, setChatFocused] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(0);
  const [status, setStatus] = useState("booting...");

  // Discover repos on mount
  useEffect(() => {
    const found = discoverRepos();
    setRepos(found);
    setStatus(`watching ${found.length} repo${found.length !== 1 ? "s" : ""}`);

    const initialHealth = new Map<string, RepoHealth>();
    for (const r of found) {
      initialHealth.set(r.path, { name: r.name, path: r.path, score: null, tier: null, scanning: false });
    }
    setHealth(new Map(initialHealth));

    // Load scope docs + start watchers
    for (const repo of found) {
      loadScopeDoc(repo.path).then((scopeDoc) => {
        watchRepo(repo.path, async (repoPath, commit) => {
          const id = String(++eventCounter);
          const repoName = repos.find((r) => r.path === repoPath)?.name ?? repoPath.split("/").pop() ?? repoPath;

          // Add scanning event
          const ev: DriftEvent = {
            id, repoName, hash: commit.hash, subject: commit.subject,
            score: null, tier: null, verdict: null, analysis: null,
            ts: new Date(), scanning: true,
          };
          setEvents((prev) => [...prev, ev]);

          // Mark repo as scanning
          setHealth((prev) => {
            const next = new Map(prev);
            const h = next.get(repoPath);
            if (h) next.set(repoPath, { ...h, scanning: true });
            return next;
          });

          // Run scan
          const payload = `Commit: ${commit.subject}\n\nFiles changed:\n${commit.diffStat}`;
          const result = await scanText(payload, scopeDoc);

          // Update event with result
          setEvents((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, scanning: false, score: result?.score ?? null, tier: result?.tier ?? null, verdict: result?.verdict ?? null, analysis: result?.analysis ?? null }
                : e
            )
          );

          // Update repo health
          setHealth((prev) => {
            const next = new Map(prev);
            const h = next.get(repoPath);
            if (h) next.set(repoPath, { ...h, scanning: false, score: result?.score ?? null, tier: result?.tier ?? null });
            return next;
          });
        });
      });
    }

    return () => unwatchAll();
  }, []);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === "c")) {
      unwatchAll();
      exit();
      return;
    }
    if (key.tab) {
      setChatFocused((f) => !f);
      return;
    }
    if (!chatFocused) {
      if (key.upArrow) setSelectedRepo((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelectedRepo((i) => Math.min(repos.length - 1, i + 1));
    }
  });

  const handleChatSubmit = useCallback(async (val: string) => {
    if (!val.trim()) return;
    setChatInput("");
    const userMsg: ChatMessage = { role: "user", text: val, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    const selectedRepoInfo = repos[selectedRepo];
    const context = selectedRepoInfo
      ? `Repo: ${selectedRepoInfo.name}\nPath: ${selectedRepoInfo.path}\nRecent events: ${events.slice(-3).map((e) => `${e.subject} [${e.score ?? "??"}/100]`).join("; ")}`
      : "No repo selected.";

    const reply = await askCreeper(val, context);
    setMessages((prev) => [...prev, { role: "creeper", text: reply, ts: new Date() }]);
  }, [repos, selectedRepo, events]);

  const healthList = repos.map((r) =>
    health.get(r.path) ?? { name: r.name, path: r.path, score: null, tier: null, scanning: false }
  );

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box paddingX={2} paddingY={0}>
        <Text color="#ff007f" bold>🌀 SCOPE CREEPER  </Text>
        <Text color="#39ff14">{status}  </Text>
        <Text color="gray">↑↓ select repo · tab chat · esc quit</Text>
      </Box>

      {/* Main panels */}
      <Box flexDirection="row" gap={0}>
        <RepoList repos={healthList} selected={selectedRepo} />
        <DriftFeed events={events} />
        <ChatPane
          messages={messages}
          input={chatInput}
          focused={chatFocused}
          onInputChange={setChatInput}
          onSubmit={handleChatSubmit}
        />
      </Box>
    </Box>
  );
}

render(<App />);
