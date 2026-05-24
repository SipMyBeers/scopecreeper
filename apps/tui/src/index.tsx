#!/usr/bin/env node
import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import {
  discoverRepos, loadScopeDoc, addRepoToConfig, removeRepoFromConfig,
  getRecentCommits, type TrackedRepo,
} from "./discovery.js";
import { watchRepo, unwatchAll } from "./watcher.js";
import { scanText, scanCommit, askCreeper } from "./api.js";
import { spawnSync } from "child_process";

function currentBranch(repoPath: string): string {
  const r = spawnSync("git", ["-C", repoPath, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8", timeout: 2000 });
  return (r.stdout ?? "").trim() || "HEAD";
}

const HISTORY_LIMIT = 16;
function appendHistory(prev: number[] | undefined, score: number): number[] {
  return [...(prev ?? []), score].slice(-HISTORY_LIMIT);
}
import RepoList, { type RepoHealth } from "./components/RepoList.js";
import DriftFeed, { type DriftEvent } from "./components/DriftFeed.js";
import ChatPane, { type ChatMessage } from "./components/ChatPane.js";

let eventCounter = 0;

// 0=repos 1=feed 2=chat
type Panel = 0 | 1 | 2;
type Mode = "nav" | "add-repo" | "chat-input";

function App() {
  const { exit } = useApp();
  const [repos, setRepos] = useState<TrackedRepo[]>([]);
  const [health, setHealth] = useState<Map<string, RepoHealth>>(new Map());
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [mode, setMode] = useState<Mode>("nav");
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [activePanel, setActivePanel] = useState<Panel>(0);
  const [selectedRepo, setSelectedRepo] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [status, setStatus] = useState("booting...");
  const scopeDocs = useRef<Map<string, string>>(new Map());

  const ensureHealth = (path: string, name: string) => (prev: Map<string, RepoHealth>) => {
    const next = new Map(prev);
    if (!next.has(path)) next.set(path, { name, path, score: null, tier: null, scanning: false });
    return next;
  };

  const runInitialScan = useCallback(async (repo: TrackedRepo) => {
    const scopeDoc = scopeDocs.current.get(repo.path) ?? "";
    const branch = currentBranch(repo.path);
    setHealth((prev) => {
      const next = new Map(prev);
      const base = { name: repo.name, path: repo.path, score: null, tier: null, scanning: false, history: [] };
      next.set(repo.path, { ...(next.get(repo.path) ?? base), scanning: true, branch });
      return next;
    });
    const recent = getRecentCommits(repo.path, 5);
    const payload = `Branch: ${branch}\n\nRecent commits:\n${recent}\n\nDeclared scope:\n${scopeDoc.slice(0, 1200)}`;
    const result = await scanText(payload, scopeDoc);
    setHealth((prev) => {
      const next = new Map(prev);
      const base = { name: repo.name, path: repo.path, score: null, tier: null, scanning: false, history: [] };
      const existing = next.get(repo.path) ?? base;
      next.set(repo.path, {
        ...existing,
        scanning: false,
        score: result?.score ?? null,
        tier: result?.tier ?? null,
        error: result === null,
        branch,
        history: result ? appendHistory(existing.history, result.score) : existing.history,
      });
      return next;
    });
  }, []);

  const attachRepo = useCallback((repo: TrackedRepo, scopeDoc: string) => {
    scopeDocs.current.set(repo.path, scopeDoc);
    watchRepo(repo.path, async (repoPath, commit) => {
      const id = String(++eventCounter);
      const repoName = repoPath.split("/").pop() ?? repoPath;
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
      const result = await scanCommit(commit, scopeDoc);
      setEvents((prev) => prev.map((e) => e.id === id
        ? { ...e, scanning: false, score: result?.score ?? null, tier: result?.tier ?? null, verdict: result?.verdict ?? null, analysis: result?.analysis ?? null }
        : e
      ));
      setHealth((prev) => {
        const next = new Map(prev);
        const base = { name: repoName, path: repoPath, score: null, tier: null, scanning: false, history: [] };
        const h = next.get(repoPath) ?? base;
        next.set(repoPath, {
          ...h,
          scanning: false,
          score: result?.score ?? null,
          tier: result?.tier ?? null,
          branch: commit.branch,
          history: result ? appendHistory(h.history, result.score) : h.history,
        });
        return next;
      });
    });
  }, []);

  useEffect(() => {
    discoverRepos().then(async (found) => {
      setRepos(found);
      setStatus(`${found.length} repo${found.length !== 1 ? "s" : ""} · ←→ panels · ↑↓ select · a add · r remove`);
      const initHealth = new Map<string, RepoHealth>();
      for (const r of found) initHealth.set(r.path, { name: r.name, path: r.path, score: null, tier: null, scanning: false });
      setHealth(new Map(initHealth));
      await Promise.all(found.map(async (repo) => {
        const scopeDoc = await loadScopeDoc(repo.path);
        attachRepo(repo, scopeDoc);
        runInitialScan({ ...repo, scopeDoc });
      }));
    });
    return () => unwatchAll();
  }, []);

  useInput((input, key) => {
    if (mode === "add-repo" || mode === "chat-input") return;

    if (key.escape || (key.ctrl && input === "c")) { unwatchAll(); exit(); return; }

    // Panel switching
    if (key.leftArrow) { setActivePanel((p) => Math.max(0, p - 1) as Panel); return; }
    if (key.rightArrow) { setActivePanel((p) => Math.min(2, p + 1) as Panel); return; }

    // Panel-specific actions
    if (activePanel === 0) {
      if (key.upArrow) setSelectedRepo((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelectedRepo((i) => Math.min(repos.length - 1, i + 1));
      if (input === "a") { setMode("add-repo"); setAddInput(""); setAddError(""); }
      if (input === "r") {
        const repo = repos[selectedRepo];
        if (repo) {
          removeRepoFromConfig(repo.path);
          setRepos((prev) => prev.filter((_, i) => i !== selectedRepo));
          setHealth((prev) => { const next = new Map(prev); next.delete(repo.path); return next; });
          setSelectedRepo((i) => Math.max(0, i - 1));
        }
      }
      if (input === "s") runInitialScan(repos[selectedRepo]);
    }

    if (activePanel === 1) {
      if (key.upArrow) setSelectedEvent((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelectedEvent((i) => Math.min(events.length - 1, i + 1));
    }

    if (activePanel === 2) {
      if (input === "\r" || key.return) setMode("chat-input");
    }

    if (input === "\t" || key.tab) {
      setActivePanel((p) => ((p + 1) % 3) as Panel);
    }
  });

  const handleAddSubmit = useCallback(async (val: string) => {
    if (!val.trim()) { setMode("nav"); return; }
    const ok = await addRepoToConfig(val.trim());
    if (!ok) { setAddError(`not found: ${val.trim()}`); return; }
    const name = val.trim().replace(/\/$/, "").split("/").pop() ?? val;
    const newRepo: TrackedRepo = { name, path: val.trim(), scopeDoc: "" };
    setRepos((prev) => [...prev, newRepo]);
    setHealth(ensureHealth(newRepo.path, name));
    setMode("nav");
    setAddInput("");
    const scopeDoc = await loadScopeDoc(newRepo.path);
    attachRepo(newRepo, scopeDoc);
    runInitialScan(newRepo);
  }, [attachRepo, runInitialScan]);

  const handleChatSubmit = useCallback(async (val: string) => {
    setMode("nav");
    if (!val.trim()) return;
    if (val === "/q" || val === "/exit") { setChatInput(""); return; }
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text: val, ts: new Date() }]);
    const repo = repos[selectedRepo];
    const ctx = repo
      ? `Repo: ${repo.name}\nRecent: ${events.slice(-3).map((e) => `${e.subject}[${e.score ?? "??"}]`).join("; ")}`
      : "No repo selected.";
    const reply = await askCreeper(val, ctx);
    setMessages((prev) => [...prev, { role: "creeper", text: reply, ts: new Date() }]);
  }, [repos, selectedRepo, events]);

  const healthList = repos.map((r) =>
    health.get(r.path) ?? { name: r.name, path: r.path, score: null, tier: null, scanning: false }
  );

  const panelBorder = (p: Panel) => activePanel === p ? "#ff007f" : "#39ff14";

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1} gap={2}>
        <Text color="#ff007f" bold>🌀 SCOPE CREEPER</Text>
        <Text color="#39ff14">{status}</Text>
      </Box>

      {/* Add-repo input bar */}
      {mode === "add-repo" && (
        <Box borderStyle="single" borderColor="#ff007f" paddingX={2} marginX={1}>
          <Text color="#ff007f" bold>ADD  </Text>
          <TextInput
            value={addInput}
            onChange={setAddInput}
            onSubmit={handleAddSubmit}
            placeholder="/absolute/path/to/repo"
          />
          {addError ? <Text color="red">  ✗ {addError}</Text> : null}
        </Box>
      )}

      {/* Panels */}
      <Box flexDirection="row">
        <RepoList
          repos={healthList}
          selected={selectedRepo}
          active={activePanel === 0}
          borderColor={panelBorder(0)}
        />
        <DriftFeed
          events={events}
          selected={selectedEvent}
          active={activePanel === 1}
          borderColor={panelBorder(1)}
        />
        <ChatPane
          messages={messages}
          input={chatInput}
          active={activePanel === 2}
          inputActive={mode === "chat-input"}
          onInputChange={setChatInput}
          onSubmit={handleChatSubmit}
          borderColor={panelBorder(2)}
        />
      </Box>

      {/* Footer hints */}
      <Box paddingX={1}>
        <Text color="gray">
          {activePanel === 0 && "↑↓ select · a add · r remove · s rescan · → next panel"}
          {activePanel === 1 && "↑↓ scroll feed · ← prev · → next panel"}
          {activePanel === 2 && (mode === "chat-input" ? "enter send · /q back" : "enter to type · ← prev panel")}
        </Text>
      </Box>
    </Box>
  );
}

render(<App />, { patchConsole: true });
