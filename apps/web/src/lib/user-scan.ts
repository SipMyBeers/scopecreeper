import {
  fetchUserProfile,
  userProfilePrompt,
  type UserProfileResult,
  type RatingTier,
} from "@/core";
import { tryParseJSON } from "@/lib/json-tolerant";

interface AIBinding {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
}

interface KVBinding {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
}

export interface UserScanEnv {
  AI?: AIBinding;
  KV_SCAN_CACHE?: KVBinding;
  OLLAMA_URL?: string;
  OLLAMA_MODEL?: string;
}

const CACHE_TTL = 60 * 60 * 6; // 6 hours

function tierForScore(score: number): RatingTier {
  if (score >= 96) return "delusion";
  if (score >= 71) return "abyss";
  if (score >= 31) return "sweetspot";
  return "corpse";
}

/** Cheap heuristic fallback when the LLM is unavailable. */
function fallbackProfile(
  username: string,
  repoCount: number,
  analyzedCount: number,
  avatarUrl: string | null,
  name: string | null,
  topRepos: UserProfileResult["topRepos"]
): UserProfileResult {
  const abandonRate = topRepos.length > 0
    ? topRepos.filter((r) => {
        if (!r.pushedAt || !r.createdAt) return false;
        const lifeDays = (Date.parse(r.pushedAt) - Date.parse(r.createdAt)) / 86_400_000;
        return lifeDays < 14;
      }).length / topRepos.length
    : 0;
  const score = Math.min(100, Math.round(abandonRate * 80 + (repoCount > 30 ? 20 : 0)));
  const tier = tierForScore(score);
  return {
    username,
    name,
    avatarUrl,
    publicRepos: repoCount,
    analyzedCount,
    delusionScore: score,
    tier,
    verdict: score >= 71 ? "MANY STARTS FEW SHIPS" : "DISCIPLINED BUILDER",
    analysis: `${repoCount} public repos. ${Math.round(abandonRate * 100)}% abandoned within 2 weeks.`,
    patterns: [`${repoCount} total public repos`],
    topRepos,
    scannedAt: Date.now(),
  };
}

async function callLLM(env: UserScanEnv, prompt: string): Promise<string | null> {
  const SYSTEM =
    "You are SCOPE CREEPER, a tactical diagnostic engine. Analyze developer patterns with cynical precision. Return only JSON.";
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: prompt },
  ];

  if (env.AI) {
    try {
      const out = (await env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        { messages, response_format: { type: "json_object" }, max_tokens: 512 }
      )) as { response?: string };
      if (out?.response) return out.response;
    } catch {
      /* fall through */
    }
  }

  if (env.OLLAMA_URL) {
    try {
      const res = await fetch(env.OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL ?? "gemma3:12b",
          messages,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          message?: { content?: string };
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.message?.content ?? data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}

export async function scanUser(
  username: string,
  env: UserScanEnv
): Promise<UserProfileResult> {
  const cacheKey = `user-scan-v1:${username.toLowerCase()}`;

  // Cache read
  if (env.KV_SCAN_CACHE) {
    const hit = await env.KV_SCAN_CACHE.get(cacheKey);
    if (hit) {
      try {
        return JSON.parse(hit) as UserProfileResult;
      } catch {
        /* fall through */
      }
    }
  }

  // Fetch GitHub data
  const { user, repos } = await fetchUserProfile(username);
  const topRepos = repos.slice(0, 15);

  // LLM call
  const prompt = userProfilePrompt({ user, repos: topRepos });
  const raw = await callLLM(env, prompt);

  interface LLMJson {
    delusionScore?: number;
    tier?: string;
    verdict?: string;
    analysis?: string;
    patterns?: string[];
  }
  const llm = tryParseJSON<LLMJson>(raw);

  let result: UserProfileResult;

  if (llm && typeof llm.delusionScore === "number") {
    const score = Math.max(0, Math.min(100, Math.round(llm.delusionScore)));
    result = {
      username: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl,
      publicRepos: user.publicRepos,
      analyzedCount: topRepos.length,
      delusionScore: score,
      tier: (["corpse", "sweetspot", "abyss", "delusion"].includes(llm.tier ?? "")
        ? (llm.tier as RatingTier)
        : tierForScore(score)),
      verdict: String(llm.verdict ?? "PATTERN DETECTED").toUpperCase().slice(0, 60),
      analysis: String(llm.analysis ?? "").slice(0, 200),
      patterns: Array.isArray(llm.patterns)
        ? llm.patterns.slice(0, 5).map((p) => String(p).slice(0, 120))
        : [],
      topRepos,
      scannedAt: Date.now(),
    };
  } else {
    result = fallbackProfile(
      user.login,
      user.publicRepos,
      topRepos.length,
      user.avatarUrl,
      user.name,
      topRepos
    );
  }

  // Cache write
  if (env.KV_SCAN_CACHE) {
    try {
      await env.KV_SCAN_CACHE.put(cacheKey, JSON.stringify(result), {
        expirationTtl: CACHE_TTL,
      });
    } catch {
      /* ignore */
    }
  }

  return result;
}
