#!/usr/bin/env node
// Subcommand routing — handle CLI cmds before pulling in Ink runtime.
const cmd = process.argv[2];
if (cmd === "precommit") {
  const { runPrecommit } = await import("./cli/precommit.js");
  process.exit(await runPrecommit());
}
if (cmd === "install-hook") {
  const { installHook } = await import("./cli/install-hook.js");
  process.exit(await installHook(process.argv[3]));
}
if (cmd === "init") {
  const { runInit } = await import("./cli/init.js");
  process.exit(await runInit(process.argv[3]));
}
if (cmd === "daemon") {
  // Prefer the native Rust binary (~10 MB RSS) if present on PATH or in
  // the workspace; fall back to the Node implementation otherwise.
  const { spawnSync, spawn } = await import("child_process");
  const { existsSync } = await import("fs");
  const candidates = [
    "/Users/beers/scopecreeper/apps/daemon-rs/target/release/creeperd",
    "/opt/homebrew/bin/creeperd",
    "/usr/local/bin/creeperd",
  ];
  const onPath = spawnSync("which", ["creeperd"]).stdout?.toString().trim();
  if (onPath) candidates.unshift(onPath);
  const nativeBin = candidates.find((p) => p && existsSync(p));
  if (nativeBin) {
    console.log(`[creeper] using native daemon: ${nativeBin}`);
    const child = spawn(nativeBin, [], { stdio: "inherit" });
    child.on("exit", (code) => process.exit(code ?? 0));
    await new Promise(() => {}); // keep this process alive while child runs
  }
  const { runDaemon } = await import("./cli/daemon.js");
  process.exit(await runDaemon());
}
if (cmd === "help" || cmd === "--help" || cmd === "-h") {
  console.log(`creeper — scope drift watcher

  creeper                       launch the TUI (default)
  creeper init [path]           generate a draft .scopecreeper.md from README + git log
  creeper install-hook [path]   install a pre-commit drift check in the given repo
  creeper precommit             run the drift check on staged changes (called by hook)
  creeper daemon                background watcher — ambient notifications, no blocking
  creeper help                  show this message

Env vars:
  SC_API_URL              override scopecreeper.ai base URL
  SC_API_KEY              optional Pro API key
  SC_DRIFT_THRESHOLD      score above which a drift is logged (default 50)
  SC_NOTIFY_THRESHOLD     score above which daemon notifies you (default 60)
  SC_BLOCKING=1           opt into the strict WHY? prompt at commit time
  SC_DISABLE=1            skip a single pre-commit check
`);
  process.exit(0);
}

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
import {
  appendJustification, loadJustifications, shouldPromptWhy,
  type Justification,
} from "./justifications.js";
import {
  findActiveSession, readSessionEvents, pathDrifts, type CcEvent,
} from "./cc-session.js";
import { tailSession } from "./cc-watcher.js";
import RepoList, { type RepoHealth } from "./components/RepoList.js";
import DriftFeed, { type DriftEvent } from "./components/DriftFeed.js";
import ChatPane, { type ChatMessage } from "./components/ChatPane.js";
import Modal from "./components/Modal.js";
import WhyPrompt from "./components/WhyPrompt.js";
import JustificationLog from "./components/JustificationLog.js";
import SessionWatch from "./components/SessionWatch.js";
import ActionPicker from "./components/ActionPicker.js";
import { appendDiary, scoreActions, type Action } from "./diary.js";
import { copyToClipboard, buildRedirectPrompt } from "./clipboard.js";
import { expandScope } from "./expand-scope.js";

let eventCounter = 0;

type Panel = 0 | 1 | 2;
type Mode = "nav" | "add-repo" | "chat-input";
type ModalState =
  | { kind: "none" }
  | { kind: "repo-detail"; repoPath: string }
  | { kind: "event-detail"; eventId: string }
  | { kind: "kill"; repoPath: string; loading: boolean; artifact: Artifact | null }
  | { kind: "why"; pending: PendingWhy }
  | { kind: "action"; pending: PendingWhy; selected: Action }
  | { kind: "log"; entries: Justification[]; filter?: string }
  | {
      kind: "session-watch";
      repoPath: string;
      repoName: string;
      sessionId: string;
      jsonlPath: string;
      events: CcEvent[];
      driftPaths: Set<string>;
      startedAt: number | null;
    };

interface PendingWhy {
  repo: string;
  path: string;
  hash: string;
  subject: string;
  score: number;
  tier: string;
  verdict: string;
  analysis: string;
}

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
  const [whyInput, setWhyInput] = useState("");
  const whyQueue = useRef<PendingWhy[]>([]);
  const sessionStopRef = useRef<(() => void) | null>(null);
  const [liveTick, setLiveTick] = useState(0);
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

      // Drift detected → queue silently. Ambient mode: do NOT auto-open the modal,
      // user opens it when they choose (press `?` to drain the queue).
      if (result && shouldPromptWhy(result.score)) {
        const pending: PendingWhy = {
          repo: repoName, path: repoPath, hash: commit.hash, subject: commit.subject,
          score: result.score, tier: result.tier, verdict: result.verdict, analysis: result.analysis,
        };
        whyQueue.current.push(pending);
      }
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
      setStatus(`${found.length} repo${found.length !== 1 ? "s" : ""} · ambient mode · enter detail · k roast · w watch-cc · ? pending drifts`);
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

  const executeAction = useCallback(async (pending: PendingWhy, action: Action) => {
    const scores = scoreActions(pending.score);
    const scopeDoc = scopeDocs.current.get(pending.path) ?? "";
    let note = "";

    if (action === "REDIRECT") {
      const prompt = buildRedirectPrompt({
        repoName: pending.repo, driftSubject: pending.subject,
        verdict: pending.verdict, analysis: pending.analysis, scopeDoc,
      });
      copyToClipboard(prompt);
      note = "redirect prompt copied to clipboard — paste into Claude";
    } else if (action === "EXPAND") {
      try {
        const added = await expandScope(pending.path, pending.subject);
        note = `appended to scope doc: ${added}`;
      } catch (e) {
        note = `expand failed: ${e instanceof Error ? e.message : "?"}`;
      }
    } else if (action === "KILL") {
      // Trigger the existing KILL flow — leaves the action picker open
      // for a beat so the user sees the choice landed, then the kill
      // modal takes over.
      runKill(pending.path);
    } else if (action === "ACCEPT") {
      note = "drift accepted, scope unchanged";
    } else if (action === "DISMISSED") {
      note = "dismissed without picking a route";
    }

    await appendDiary(pending.path, pending.repo, {
      ts: new Date(), hash: pending.hash, subject: pending.subject,
      driftScore: pending.score, tier: pending.tier,
      verdict: pending.verdict, analysis: pending.analysis,
      chosen: action, chosenScore: scores[action],
      note,
    });
    await appendJustification({
      repo: pending.repo, path: pending.path, hash: pending.hash,
      subject: pending.subject, score: pending.score, tier: pending.tier,
      verdict: pending.verdict, justification: `${action}: ${note}`,
    });

    // Advance queue or close
    whyQueue.current = whyQueue.current.filter((q) => q.hash !== pending.hash);
    if (action !== "KILL") {
      const next = whyQueue.current[0];
      if (next) {
        const nextScores = scoreActions(next.score);
        const rec = (Object.keys(nextScores) as Action[])
          .filter((k) => k !== "DISMISSED")
          .reduce((a, b) => nextScores[a] <= nextScores[b] ? a : b);
        setModal({ kind: "action", pending: next, selected: rec });
      } else {
        setModal({ kind: "none" });
      }
    }
  }, []);

  const submitWhy = useCallback(async (val: string) => {
    if (modal.kind !== "why") return;
    const p = modal.pending;
    await appendJustification({
      repo: p.repo, path: p.path, hash: p.hash, subject: p.subject,
      score: p.score, tier: p.tier, verdict: p.verdict,
      justification: val.trim(),
    });
    setWhyInput("");
    // Advance to next queued prompt or close
    whyQueue.current = whyQueue.current.filter((q) => q.hash !== p.hash);
    const nextPending = whyQueue.current[0];
    if (nextPending) {
      setModal({ kind: "why", pending: nextPending });
    } else {
      setModal({ kind: "none" });
    }
  }, [modal]);

  const dismissWhy = useCallback(() => {
    if (modal.kind === "why") submitWhy("");
  }, [modal, submitWhy]);

  const watchClaudeCode = useCallback(async (repoPath: string) => {
    const repo = repos.find((r) => r.path === repoPath);
    if (!repo) return;
    const session = findActiveSession(repoPath);
    if (!session) {
      setModal({
        kind: "session-watch", repoPath, repoName: repo.name, sessionId: "no-session",
        jsonlPath: "", events: [
          { kind: "meta", ts: Date.now(), text: "no Claude Code session found for this repo" } as CcEvent,
        ], driftPaths: new Set(), startedAt: null,
      });
      return;
    }
    const scopeDoc = scopeDocs.current.get(repoPath) ?? "";
    const initial = await readSessionEvents(session.jsonlPath, 80);
    const driftPaths = new Set<string>();
    for (const e of initial) {
      if (e.kind === "tool-use" && e.filePath && pathDrifts(e.filePath, scopeDoc)) {
        driftPaths.add(e.filePath);
      }
    }
    setModal({
      kind: "session-watch", repoPath, repoName: repo.name, sessionId: session.sessionId,
      jsonlPath: session.jsonlPath, events: initial, driftPaths, startedAt: session.mtime,
    });
    // Tail the file for new events
    sessionStopRef.current = await tailSession(session.jsonlPath, session.sizeBytes, (newEvents) => {
      setModal((m) => {
        if (m.kind !== "session-watch" || m.jsonlPath !== session.jsonlPath) return m;
        const drifts = new Set(m.driftPaths);
        for (const e of newEvents) {
          if (e.kind === "tool-use" && e.filePath && pathDrifts(e.filePath, scopeDoc)) {
            drifts.add(e.filePath);
          }
        }
        return { ...m, events: [...m.events, ...newEvents], driftPaths: drifts };
      });
    });
  }, [repos]);

  // Live tick for "started Xs ago" relative-time refresh in the session modal
  useEffect(() => {
    if (modal.kind !== "session-watch") return;
    const id = setInterval(() => setLiveTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, [modal.kind]);

  // Stop the tail when the modal closes
  useEffect(() => {
    if (modal.kind !== "session-watch" && sessionStopRef.current) {
      sessionStopRef.current();
      sessionStopRef.current = null;
    }
  }, [modal.kind]);

  const openLog = useCallback(async (filter?: string) => {
    const entries = await loadJustifications();
    setModal({ kind: "log", entries, filter });
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

    // Modal dismiss (Why prompt has its own dismissal that logs an empty answer)
    if (modal.kind === "why") {
      if (key.escape) { dismissWhy(); return; }
      return; // Let WhyPrompt handle enter via its TextInput
    }
    if (modal.kind === "action") {
      const order: Action[] = ["REDIRECT", "EXPAND", "KILL", "ACCEPT"];
      const idx = order.indexOf(modal.selected);
      if (key.upArrow) { setModal({ ...modal, selected: order[Math.max(0, idx - 1)] }); return; }
      if (key.downArrow) { setModal({ ...modal, selected: order[Math.min(order.length - 1, idx + 1)] }); return; }
      if (key.return) { executeAction(modal.pending, modal.selected); return; }
      if (key.escape) {
        // Dismiss without action — still log it to diary as DISMISSED
        executeAction(modal.pending, "DISMISSED");
        return;
      }
      return;
    }
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
      if (input === "j") {
        const r = repos[selectedRepo];
        openLog(r?.name);
      }
      if (input === "J") openLog(); // capital J = all repos
      if (input === "w") {
        const r = repos[selectedRepo];
        if (r) watchClaudeCode(r.path);
      }
      if (input === "?") {
        const next = whyQueue.current[0];
        if (next) {
          // Default selection = recommended (lowest-creep action)
          const scores = scoreActions(next.score);
          const recommended = (Object.keys(scores) as Action[])
            .filter((k) => k !== "DISMISSED")
            .reduce((a, b) => scores[a] <= scores[b] ? a : b);
          setModal({ kind: "action", pending: next, selected: recommended });
        }
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
    if (modal.kind === "why") {
      return (
        <WhyPrompt
          repoName={modal.pending.repo}
          hash={modal.pending.hash}
          subject={modal.pending.subject}
          score={modal.pending.score}
          tier={modal.pending.tier}
          verdict={modal.pending.verdict}
          analysis={modal.pending.analysis}
          input={whyInput}
          onChange={setWhyInput}
          onSubmit={submitWhy}
        />
      );
    }
    if (modal.kind === "action") {
      const scores = scoreActions(modal.pending.score);
      const rec = (Object.keys(scores) as Action[])
        .filter((k) => k !== "DISMISSED")
        .reduce((a, b) => scores[a] <= scores[b] ? a : b);
      return (
        <ActionPicker
          repoName={modal.pending.repo}
          hash={modal.pending.hash}
          subject={modal.pending.subject}
          driftScore={modal.pending.score}
          tier={modal.pending.tier}
          verdict={modal.pending.verdict}
          analysis={modal.pending.analysis}
          actionScores={scores}
          selected={modal.selected}
          recommended={rec}
        />
      );
    }
    if (modal.kind === "log") {
      return <JustificationLog entries={modal.entries} filter={modal.filter} />;
    }
    if (modal.kind === "session-watch") {
      return (
        <SessionWatch
          repoName={modal.repoName}
          sessionId={modal.sessionId}
          jsonlPath={modal.jsonlPath}
          events={modal.events}
          driftPaths={modal.driftPaths}
          startedAt={modal.startedAt}
          liveTick={liveTick}
        />
      );
    }
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
            : activePanel === 0 ? "↑↓ · enter · k roast · w watch-cc · ? pending · j log · s rescan · a/r · →"
            : activePanel === 1 ? "↑↓ scroll · enter detail · ← prev · → next"
            : (mode === "chat-input" ? "enter send · esc back" : "enter type · ← prev")}
        </Text>
      </Box>
    </Box>
  );
}

render(<App />, { patchConsole: true });
