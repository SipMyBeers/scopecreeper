/**
 * POST /api/github/app/webhook
 *
 * Receives all GitHub App webhook deliveries. Verifies the
 * X-Hub-Signature-256 header, then dispatches based on X-GitHub-Event:
 *
 *   - issue_comment   → if the comment body contains "/scope-creeper" on a PR,
 *                        run the drift audit and post a reply comment.
 *   - pull_request    → on `opened` and `synchronize`, post an initial audit
 *                        comment + a status check.
 *   - installation    → ack only (logged).
 *
 * Env (Cloudflare Pages secrets):
 *   GH_APP_ID                 — numeric App ID
 *   GH_APP_PRIVATE_KEY        — PKCS8 PEM (one openssl convert from the GitHub default)
 *   GH_APP_WEBHOOK_SECRET     — the secret you set when creating the App
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { mintAppJwt } from "@/lib/github-app/jwt";
import { getInstallationToken } from "@/lib/github-app/installation";
import { GhClient } from "@/lib/github-app/client";
import { verifyWebhookSignature } from "@/lib/github-app/webhook-verify";
import { buildPrContext } from "@/lib/github-app/scope-extract";
import { analyzeDrift } from "@/lib/github-app/drift-analyze";
import { renderComment } from "@/lib/github-app/comment-template";

export const runtime = "edge";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
}

interface Env {
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  KV_QUOTAS?: KV;
  GH_APP_ID?: string;
  GH_APP_PRIVATE_KEY?: string;
  GH_APP_WEBHOOK_SECRET?: string;
}

function getEnv(): Env { return getCfEnv<Env>(); }

const SLASH_RE = /(^|\s)\/scope-creeper(\s|$|\b)/i;

interface InstallationPayload {
  installation?: { id?: number };
}

interface IssueCommentPayload extends InstallationPayload {
  action?: string;
  comment?: { body?: string; user?: { login?: string; type?: string } };
  issue?: { number?: number; pull_request?: unknown; user?: { login?: string } };
  repository?: { name?: string; owner?: { login?: string }; default_branch?: string };
}

interface PullRequestPayload extends InstallationPayload {
  action?: string;
  number?: number;
  pull_request?: {
    number?: number;
    head?: { sha?: string };
    title?: string;
    body?: string | null;
  };
  repository?: { name?: string; owner?: { login?: string } };
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.GH_APP_ID || !env.GH_APP_PRIVATE_KEY) {
    return NextResponse.json({ error: "GH App not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const eventType = request.headers.get("x-github-event") ?? "unknown";

  if (env.GH_APP_WEBHOOK_SECRET) {
    const ok = await verifyWebhookSignature(rawBody, signature, env.GH_APP_WEBHOOK_SECRET);
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("GH_APP_WEBHOOK_SECRET not set; skipping signature verification (DEV ONLY)");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Acknowledge fast — actual work is brief but bounded by the LLM call.
  try {
    if (eventType === "issue_comment") {
      return await handleIssueComment(payload as IssueCommentPayload, env);
    }
    if (eventType === "pull_request") {
      return await handlePullRequest(payload as PullRequestPayload, env);
    }
    return NextResponse.json({ received: true, ignored: eventType });
  } catch (err) {
    console.error("webhook handler error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

async function tokenFor(env: Env, installationId: number): Promise<string> {
  const jwt = await mintAppJwt({
    appId: env.GH_APP_ID!,
    privateKeyPem: env.GH_APP_PRIVATE_KEY!,
  });
  return await getInstallationToken({
    installationId,
    appJwt: jwt,
    kv: env.KV_QUOTAS,
  });
}

async function handleIssueComment(
  payload: IssueCommentPayload,
  env: Env
): Promise<Response> {
  if (payload.action !== "created") return NextResponse.json({ ignored: payload.action });
  if (!payload.issue?.pull_request) return NextResponse.json({ ignored: "not a PR comment" });
  if (payload.comment?.user?.type === "Bot") return NextResponse.json({ ignored: "bot comment" });
  const body = payload.comment?.body ?? "";
  if (!SLASH_RE.test(body)) return NextResponse.json({ ignored: "no slash command" });
  const installationId = payload.installation?.id;
  const owner = payload.repository?.owner?.login;
  const repo = payload.repository?.name;
  const prNumber = payload.issue?.number;
  if (!installationId || !owner || !repo || !prNumber) {
    return NextResponse.json({ error: "missing installation/owner/repo/prNumber" }, { status: 400 });
  }
  if (!env.AI) return NextResponse.json({ error: "AI binding missing" }, { status: 503 });
  await runAuditAndComment({ env, installationId, owner, repo, prNumber });
  return NextResponse.json({ ok: true, type: "slash-audit" });
}

async function handlePullRequest(
  payload: PullRequestPayload,
  env: Env
): Promise<Response> {
  // Only audit on PR open or new commits. Skip closes/labels/reviews.
  if (payload.action !== "opened" && payload.action !== "synchronize") {
    return NextResponse.json({ ignored: payload.action });
  }
  const installationId = payload.installation?.id;
  const owner = payload.repository?.owner?.login;
  const repo = payload.repository?.name;
  const prNumber = payload.pull_request?.number ?? payload.number;
  if (!installationId || !owner || !repo || !prNumber) {
    return NextResponse.json({ error: "missing installation/owner/repo/prNumber" }, { status: 400 });
  }
  if (!env.AI) return NextResponse.json({ error: "AI binding missing" }, { status: 503 });
  await runAuditAndComment({ env, installationId, owner, repo, prNumber, withCheck: true });
  return NextResponse.json({ ok: true, type: "pr-audit" });
}

async function runAuditAndComment(args: {
  env: Env;
  installationId: number;
  owner: string;
  repo: string;
  prNumber: number;
  withCheck?: boolean;
}): Promise<void> {
  const { env, installationId, owner, repo, prNumber, withCheck } = args;
  const token = await tokenFor(env, installationId);
  const gh = new GhClient(token);

  // Fetch PR + diff + scope docs.
  const [pr, diff, scopecreeperMd, readmeMd] = await Promise.all([
    gh.getPullRequest(owner, repo, prNumber),
    gh.getDiff(owner, repo, prNumber),
    gh.getFileContent(owner, repo, ".scopecreeper.md"),
    gh.getFileContent(owner, repo, "README.md"),
  ]);

  const ctx = buildPrContext({
    prTitle: pr.title,
    prBody: pr.body ?? "",
    scopecreeperMd,
    readmeMd,
    diff,
  });

  const report = await analyzeDrift(ctx, env.AI!);

  const webBase = "https://scopecreeper.ai";
  const body = renderComment({ report, ctx, prUrl: pr.html_url, webBase });
  await gh.createIssueComment(owner, repo, prNumber, body);

  if (withCheck) {
    try {
      const conclusion =
        report.creepScore >= 71
          ? "action_required"
          : report.creepScore >= 31
          ? "neutral"
          : "success";
      await gh.createCheckRun(owner, repo, {
        name: `scope-creeper / drift: ${String(report.creepScore).padStart(3, "0")}`,
        head_sha: pr.head.sha,
        status: "completed",
        conclusion,
        output: {
          title: `${report.creepScore}/100 — ${report.tier.toUpperCase()}`,
          summary: `${report.verdict}\n\n${report.expectedShape}\n\n${report.actualShape}`,
        },
        details_url: pr.html_url,
      });
    } catch (err) {
      console.error("check run creation failed:", err);
      // Comment already posted; status check is best-effort.
    }
  }
}