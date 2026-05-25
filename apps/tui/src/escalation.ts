/**
 * ACCEPT escalation — the loop that prevents silent rubber-stamping.
 *
 * Rule:
 *   - First ACCEPT on an area in the trailing window → silent (level 0)
 *   - 2nd–3rd consecutive ACCEPT on same area → one-sentence reason
 *     required to commit (level 1)
 *   - 4th+ consecutive ACCEPT on same area → full WHY prompt with the
 *     past justifications shown as context (level 2)
 *
 * "Area" = first 3 path segments of any file path in the commit
 * subject, falling back to detected feature keywords ("billing",
 * "auth", etc.) when no path is present.
 */
import type { Justification } from "./justifications.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;

export type EscalationLevel = 0 | 1 | 2;

export interface AcceptEscalation {
  level: EscalationLevel;
  /** How many prior ACCEPTs in this area, in the trailing window. */
  priorAccepts: number;
  /** The area name we matched on. Empty string if we couldn't extract one. */
  area: string;
  /** Up to the 3 most recent prior justifications on this area, freshest first. */
  recentPriors: Justification[];
}

interface Opts {
  windowDays?: number;
}

export function computeEscalation(
  entries: Justification[],
  repo: string,
  driftSubject: string,
  opts: Opts = {}
): AcceptEscalation {
  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
  const cutoff = Date.now() - windowDays * DAY_MS;
  const area = extractArea(driftSubject);

  const matches = entries
    .filter((e) =>
      e.ts >= cutoff &&
      e.repo === repo &&
      isAccept(e) &&
      (area ? extractArea(e.subject) === area : false)
    )
    .sort((a, b) => b.ts - a.ts);

  const priorAccepts = matches.length;
  const level: EscalationLevel = priorAccepts >= 3 ? 2 : priorAccepts >= 1 ? 1 : 0;

  return {
    level,
    priorAccepts,
    area,
    recentPriors: matches.slice(0, 3),
  };
}

function isAccept(e: Justification): boolean {
  const j = (e.justification ?? "").trim();
  return j.startsWith("ACCEPT:") || j === "ACCEPT";
}

/**
 * Best-effort area extraction. Prefers concrete file/dir paths;
 * falls back to a curated list of feature keywords if no path
 * appears in the subject.
 */
export function extractArea(subject: string): string {
  const path = subject.match(/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_./-]+/);
  if (path) {
    const segs = path[0].split("/").filter(Boolean);
    return segs.slice(0, 3).join("/");
  }
  const featureWords = subject.toLowerCase().match(
    /\b(billing|auth|dashboard|admin|api|payments?|referral|onboarding|notifications?|settings?|profile|search|mobile|chat|messaging|analytics|reporting|export|import|integration)\b/
  );
  return featureWords ? featureWords[0] : "";
}

export function escalationHint(esc: AcceptEscalation): string {
  if (esc.level === 0) return "";
  if (esc.level === 1) {
    return `you've accepted ${esc.priorAccepts} prior drift${esc.priorAccepts === 1 ? "" : "s"} on ${esc.area || "this area"} — one sentence required`;
  }
  return `${esc.priorAccepts} prior accepts on ${esc.area || "this area"} — full justification required`;
}
