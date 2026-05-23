#!/usr/bin/env node
import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import {
  discoverRepos, loadScopeDoc, addRepoToConfig, removeRepoFromConfig,
  getLatestCommit, getRecentCommits, type TrackedRepo,
} from "./discovery.js";
import { watchRepo, unwatchAll } from "./watcher.js";
import { scanText, askCreeper } from "./api.js";
import RepoList, { type RepoHealth } from "./components/RepoList.js";
import DriftFeed, { type DriftEvent } from "./components/DriftFeed.js";
import ChatPane, { type ChatMessage } from "./components/ChatPane.js";

let eventCounter = 0;

type Mode = "normal" | "add-repo" | "chat";

function App() {
  const { exit } = useApp();
  const [repos, setRepos] = useState<TrackedRepo[]>([]);
  const [health, setHealth] = useState<Map<string, RepoHealth>>(new Map());
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [mode, setMode] = useState<Mode>("normal");
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(0);
  const [status, setStatus] = useState("booting...");
  const scopeDocs = useRef<Map<string, string>>(new Map());

  const runInitialScan = useCallback(async (repo: TrackedRepo) => {
    const scopeDoc = scopeDocs.current.get(repo.path) ?? "";
    const base = { name: repo.name, path: repo.path, score: null, tier: null, scanning: false, error: false };
    setHealth((prev) => {
      const next = new Map(prev);
      next.set(repo.path, { ...(next.get(repo.path) ?? base), scanning: true });
      return next;
    });
    const recent = getRecentCommits(repo.path, 5);
    const payload = `Recent commits:\n${recent}\n\nDeclared scope:\n${scopeDoc.slice(0, 1000)}`;
    const result = await scanText(payload, scopeDoc);
    setHealth((prev) => {
      const next = new Map(prev);
      next.set(repo.path, {
        ...(next.get(repo.path) ?? base),
        scanning: false,
        score: result?.score ?? null,
        tier: result?.tier ?? null,
        error: result === null,
      });
      return next;
    });
  }, []);

  const attachRepo = useCallback((repo: TrackedRepo, scopeDoc: string) => {
    scopeDocs.current.set(repo.path, scopeDoc);
    watchRepo(repo.path, async (repoPath, commit) => {
      const id = String(++eventCounter);
      const repoName = repos.find((r) => r.path === repoPath)?.name ?? repoPath.split("/").pop() ?? "";
      const ev: DriftEvent = {
        id, repoName, hash: commit.hash, subject: commit.subject,
        score: null, tier: null, verdict: null, analysis: null,
        ts: new Date(), scanning: true,
      };
      setEvents((prev) => [...prev, ev]);
      setHealth((prev) => {
        const next = new Map(prev);
        const h = next.get(repoPath) ?? { name: repoName, path: repoPath, score: null, tier: null, scanning: false };
        next.set(repoPath, { ...h, scanning: true });
        return next;
      });
      const payload = `Commit: ${commit.subject}\n\nFiles changed:\n${commit.diffStat}`;
      const result = await scanText(payload, scopeDoc);
      setEvents((prev) =>
        prev.map((e) => e.id === id
          ? { ...e, scanning: false, score: result?.score ?? null, tier: result?.tier ?? null, verdict: result?.verdict ?? null, analysis: result?.analysis ?? null }
          : e
        )
      );
      setHealth((prev) => {
        const next = new Map(prev);
        const h = next.get(repoPath) ?? { name: repoName, path: repoPath, score: null, tier: null, scanning: false };
        next.set(repoPath, { ...h, scanning: false, score: result?.score ?? null, tier: result?.tier ?? null });
        return next;
      });
    });
  }, [repos]);

  // Initial discovery
  useEffect(() => {
    discoverRepos().then(async (found) => {
      setRepos(found);
      setStatus(`watching ${found.length} repo${found.length !== 1 ? "s" : ""} · a=add r=remove`);
      const initHealth = new Map<string, RepoHealth>();
      for (const r of found) {
        initHealth.set(r.path, { name: r.name, path: r.path, score: null, tier: null, scanning: false });
      }
      setHealth(new Map(initHealth));
      // Load scope docs + initial scan + watchers
      await Promise.all(found.map(async (repo) => {
        const scopeDoc = await loadScopeDoc(repo.path);
        attachRepo(repo, scopeDoc);
        runInitialScan({ ...repo, scopeDoc });
      }));
    });
    return () => unwatchAll();
  }, []);

  useInput((input, key) => {
    if (mode === "add-repo" || mode === "chat") return;

    if (key.escape || (key.ctrl && input === "c")) {
      unwatchAll();
      exit();
      return;
    }
    if (input === "a") { setMode("add-repo"); setAddInput(""); setAddError(""); return; }
    if (input === "r") {
      const repo = repos[selectedRepo];
      if (repo) {
        removeRepoFromConfig(repo.path);
        setRepos((prev) => prev.filter((_, i) => i !== selectedRepo));
        setHealth((prev) => { const next = new Map(prev); next.delete(repo.path); return next; });
        setSelectedRepo((i) => Math.max(0, i - 1));
      }
      return;
    }
    if (key.tab) { setMode("chat"); return; }
    if (key.upArrow) setSelectedRepo((i) => Math.max(0, i - 1));
    if (key.downArrow) setSelectedRepo((i) => Math.min(repos.length - 1, i + 1));
  });

  const handleAddSubmit = useCallback(async (val: string) => {
    if (!val.trim()) { setMode("normal"); return; }
    const ok = await addRepoToConfig(val.trim());
    if (!ok) { setAddError(`path not found: ${val.trim()}`); return; }
    const name = val.trim().replace(/\/$/, "").split("/").pop() ?? val;
    const newRepo: TrackedRepo = { name, path: val.trim(), scopeDoc: "" };
    setRepos((prev) => [...prev, newRepo]);
    setHealth((prev) => {
      const next = new Map(prev);
      next.set(newRepo.path, { name, path: newRepo.path, score: null, tier: null, scanning: false });
      return next;
    });
    setMode("normal");
    setAddInput("");
    setStatus(`watching ${repos.length + 1} repos · a=add r=remove`);
    const scopeDoc = await loadScopeDoc(newRepo.path);
    attachRepo(newRepo, scopeDoc);
    runInitialScan(newRepo);
  }, [repos, attachRepo, runInitialScan]);

  const handleChatSubmit = useCallback(async (val: string) => {
    if (!val.trim()) { setMode("normal"); return; }
    if (val === "/exit" || val === "/q") { setMode("normal"); setChatInput(""); return; }
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text: val, ts: new Date() }]);
    const repo = repos[selectedRepo];
    const context = repo
      ? `Repo: ${repo.name}\nRecent events: ${events.slice(-3).map((e) => `${e.subject} [${e.score ?? "??"}]`).join("; ")}`
      : "No repo selected.";
    const reply = await askCreeper(val, context);
    setMessages((prev) => [...prev, { role: "creeper", text: reply, ts: new Date() }]);
  }, [repos, selectedRepo, events]);

  const healthList = repos.map((r) =>
    health.get(r.path) ?? { name: r.name, path: r.path, score: null, tier: null, scanning: false }
  );

  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text color="#ff007f" bold>🌀 SCOPE CREEPER  </Text>
        <Text color="#39ff14">{status}  </Text>
        <Text color="gray">↑↓ select · tab chat · a add · r remove · esc quit</Text>
      </Box>

      {mode === "add-repo" && (
        <Box borderStyle="single" borderColor="#ff007f" paddingX={2} marginX={1}>
          <Text color="#ff007f" bold>ADD REPO  </Text>
          <TextInput
            value={addInput}
            onChange={setAddInput}
            onSubmit={handleAddSubmit}
            placeholder="/path/to/repo  (enter to confirm, esc to cancel)"
          />
          {addError ? <Text color="red">  {addError}</Text> : null}
        </Box>
      )}

      <Box flexDirection="row">
        <RepoList repos={healthList} selected={selectedRepo} />
        <DriftFeed events={events} />
        <ChatPane
          messages={messages}
          input={chatInput}
          focused={mode === "chat"}
          onInputChange={setChatInput}
          onSubmit={handleChatSubmit}
        />
      </Box>
    </Box>
  );
}

render(<App />);
