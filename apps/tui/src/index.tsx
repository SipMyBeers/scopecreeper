#!/usr/bin/env node
import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { spawnSync } from "child_process";
import {
  discoverRepos, loadScopeDoc, addRepoToConfig, removeRepoFromConfig,
  getRecentCommits, type TrackedRepo,
} from "./discovery.js";
import { watchRepo, unwatchAll } from "./watcher.js";
import { scanText, scanCommit, askCreeper, generateKill, type Artifact } from "./api.js";
import { useMouse, type MouseEvent } from "./useMouse.js";
import RepoList, { type RepoHealth } from "./components/RepoList.js";
import DriftFeed, { type DriftEvent } from "./components/DriftFeed.js";
import ChatPane, { type ChatMessage } from "./components/ChatPane.js";
import Modal from "./components/Modal.js";

let eventCounter = 0;

type Panel = 0 | 1 | 2;
type Mode = "nav" | "add-repo" | "chat-input";
type ModalState =
  | { kind: "none" }
  | { kind: "repo-detail"; repoPath: string }
  | { kind: "event-detail"; eventId: string }
  | { kind: "kill"; repoPath: string; loading: boolean; artifact: Artifact | null };

const HISTORY_LIMIT = 16;
function appendHistory(prev: number[] | undefined, score: number): number[] {
  return [...(prev ?? []), score].slice(-HISTORY_LIMIT);
}

function currentBranch(repoPath: string): string {
  const r = spawnSync("git", ["-C", repoPath, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8", timeout: 2000 });
  return (r.stdout ?? "").trim() || "HEAD";
}

function App() {
  const { exit } = useApp();
  const [repos, setRepos] = useState<TrackedRepo[]>([]);
  const [health, setHealth] = useState<Map<string, RepoHealth>>(new Map());
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [mode, setMode] = useState<Mode>("nav");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [activePanel, setActivePanel] = useState<Panel>(0);
  const [selectedRepo, setSelectedRepo] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [status, setStatus] = useState("booting...");
  const scopeDocs = useRef<Map<string, string>>(new Map());

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
        const base = { name: repoName, path: repoPath, score: null, tier: null, scanning: false, history: [] };
        next.set(repoPath, { ...(next.get(repoPath) ?? base), scanning: true });
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
      setStatus(`${found.length} repo${found.length !== 1 ? "s" : ""} · click or arrows · enter detail · k roast · a add`);
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

  const runKill = useCallback(async (repoPath: string) => {
    const repo = repos.find((r) => r.path === repoPath);
    if (!repo) return;
    setModal({ kind: "kill", repoPath, loading: true, artifact: null });
    const scopeDoc = scopeDocs.current.get(repoPath) ?? "";
    const commits = getRecentCommits(repoPath, 8);
    const artifact = await generateKill(repo.name, scopeDoc, commits);
    setModal({ kind: "kill", repoPath, loading: false, artifact });
  }, [repos]);

  // Mouse: clicks dispatch based on Y row → which panel header is closest.
  // Approximate column boundaries based on the layout (repo=28, chat=38).
  const handleMouseClick = useCallback((ev: MouseEvent) => {
    // Close modal on any click outside
    if (modal.kind !== "none") { setModal({ kind: "none" }); return; }
    // Column-based panel detection
    let panel: Panel = 0;
    if (ev.col > 28 && ev.col <= 28 + 60) panel = 1;
    else if (ev.col > 28 + 60) panel = 2;
    setActivePanel(panel);
    // Row-based item selection (rough — header takes ~5 rows, items ~4 rows each)
    if (panel === 0) {
      const idx = Math.max(0, Math.floor((ev.row - 5) / 4));
      if (idx < repos.length) setSelectedRepo(idx);
    } else if (panel === 1) {
      const idx = Math.max(0, Math.floor((ev.row - 5) / 5));
      if (idx < events.length) setSelectedEvent(idx);
    } else if (panel === 2) {
      setMode("chat-input");
    }
  }, [modal, repos.length, events.length]);

  useMouse(handleMouseClick);

  useInput((input, key) => {
    if (mode === "add-repo" || mode === "chat-input") return;

    // Modal dismiss
    if (modal.kind !== "none") {
      if (key.escape || input === "q") { setModal({ kind: "none" }); return; }
      return;
    }

    if (key.escape || (key.ctrl && input === "c")) { unwatchAll(); exit(); return; }
    if (key.leftArrow) { setActivePanel((p) => Math.max(0, p - 1) as Panel); return; }
    if (key.rightArrow) { setActivePanel((p) => Math.min(2, p + 1) as Panel); return; }
    if (input === "\t" || key.tab) { setActivePanel((p) => ((p + 1) % 3) as Panel); return; }

    if (activePanel === 0) {
      if (key.upArrow) setSelectedRepo((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelectedRepo((i) => Math.min(repos.length - 1, i + 1));
      if (key.return) {
        const r = repos[selectedRepo];
        if (r) setModal({ kind: "repo-detail", repoPath: r.path });
      }
      if (input === "k") {
        const r = repos[selectedRepo];
        if (r) runKill(r.path);
      }
      if (input === "s") runInitialScan(repos[selectedRepo]);
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
    }

    if (activePanel === 1) {
      if (key.upArrow) setSelectedEvent((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelectedEvent((i) => Math.min(events.length - 1, i + 1));
      if (key.return) {
        const e = [...events].reverse()[selectedEvent];
        if (e) setModal({ kind: "event-detail", eventId: e.id });
      }
    }

    if (activePanel === 2) {
      if (key.return) setMode("chat-input");
    }
  });

  const handleAddSubmit = useCallback(async (val: string) => {
    if (!val.trim()) { setMode("nav"); return; }
    const ok = await addRepoToConfig(val.trim());
    if (!ok) { setAddError(`not found: ${val.trim()}`); return; }
    const name = val.trim().replace(/\/$/, "").split("/").pop() ?? val;
    const newRepo: TrackedRepo = { name, path: val.trim(), scopeDoc: "" };
    setRepos((prev) => [...prev, newRepo]);
    setMode("nav");
    setAddInput("");
    const scopeDoc = await loadScopeDoc(newRepo.path);
    attachRepo(newRepo, scopeDoc);
    runInitialScan(newRepo);
  }, [attachRepo, runInitialScan]);

  const handleChatSubmit = useCallback(async (val: string) => {
    setMode("nav");
    if (!val.trim()) return;
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text: val, ts: new Date() }]);
    const repo = repos[selectedRepo];
    const ctx = repo
      ? `Repo: ${repo.name}\nBranch: ${health.get(repo.path)?.branch ?? "?"}\nScore: ${health.get(repo.path)?.score ?? "?"}\nRecent: ${events.slice(-3).map((e) => `${e.subject}[${e.score ?? "??"}]`).join("; ")}`
      : "No repo selected.";
    const reply = await askCreeper(val, ctx);
    setMessages((prev) => [...prev, { role: "creeper", text: reply, ts: new Date() }]);
  }, [repos, selectedRepo, events, health]);

  const healthList = repos.map((r) =>
    health.get(r.path) ?? { name: r.name, path: r.path, score: null, tier: null, scanning: false }
  );
  const panelBorder = (p: Panel) => activePanel === p ? "#ff007f" : "#39ff14";

  // Render modal content based on state
  const renderModal = () => {
    if (modal.kind === "none") return null;
    if (modal.kind === "kill") {
      return (
        <Modal
          title={`KILL · ${modal.artifact?.title ?? "loading"}`}
          subtitle={modal.repoPath.split("/").pop()}
          color="#ff007f"
          body={modal.artifact?.body ?? ""}
          loading={modal.loading}
          footer="esc/q to close"
        />
      );
    }
    if (modal.kind === "repo-detail") {
      const r = repos.find((x) => x.path === modal.repoPath);
      const h = r ? health.get(r.path) : undefined;
      const scopeDoc = scopeDocs.current.get(modal.repoPath) ?? "(no scope doc)";
      const recent = r ? getRecentCommits(r.path, 8) : "";
      return (
        <Modal
          title={r?.name ?? "?"}
          subtitle={`${h?.branch ?? ""} · ${h?.score ?? "?"}/100 ${h?.tier?.toUpperCase() ?? ""}`}
          color="#39ff14"
          body={`## Scope\n${scopeDoc.slice(0, 600)}\n\n## Recent commits\n${recent}`}
          footer="enter k to roast · esc to close"
        />
      );
    }
    if (modal.kind === "event-detail") {
      const ev = events.find((e) => e.id === modal.eventId);
      if (!ev) return null;
      return (
        <Modal
          title={`${ev.repoName} · #${ev.hash}`}
          subtitle={`${ev.score ?? "?"}/100 ${ev.tier?.toUpperCase() ?? ""}`}
          color="#5cb8ff"
          body={`## Commit\n${ev.subject}\n\n## Verdict\n${ev.verdict ?? ""}\n\n## Analysis\n${ev.analysis ?? "(no analysis)"}`}
          footer="esc to close"
        />
      );
    }
    return null;
  };

  return (
    <Box flexDirection="column">
      <Box paddingX={1} gap={2}>
        <Text color="#ff007f" bold>🌀 SCOPE CREEPER</Text>
        <Text color="#39ff14">{status}</Text>
      </Box>

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

      {modal.kind !== "none" ? (
        renderModal()
      ) : (
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
      )}

      <Box paddingX={1}>
        <Text color="gray">
          {modal.kind !== "none" ? "esc/q close · click outside also closes"
            : activePanel === 0 ? "↑↓ select · enter detail · k roast · s rescan · a add · r remove · → next"
            : activePanel === 1 ? "↑↓ scroll · enter detail · ← prev · → next"
            : (mode === "chat-input" ? "enter send · esc back" : "enter type · ← prev")}
        </Text>
      </Box>
    </Box>
  );
}

render(<App />, { patchConsole: true });
