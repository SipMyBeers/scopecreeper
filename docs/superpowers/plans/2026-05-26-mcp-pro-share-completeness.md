# MCP Registration + Pro/Share Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three gaps left after today's sprint: register the scope-creeper MCP so RAG tools work in-session, wire the Pro activation success UX after Stripe redirects, and build `ArcadeCollapsedHeader` so the skill tree gets room to breathe after the first scan.

**Architecture:** The server-side for billing (checkout, webhook, session tier, KV) and share links (/api/share, /t/[slug], SharedThreadView, OG image) is 100% complete — STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET/KV_SHARED_THREADS are all live in production. The three remaining gaps are: (1) MCP not registered in this Claude Code session, (2) no UI moment when Stripe redirects back to `/?purchase=success`, (3) `ArcadeCollapsedHeader` (scope doc in-flight item) not yet built. This plan closes all three.

**Tech Stack:** Next.js 16 App Router (edge runtime), Cloudflare Pages, React 19, framer-motion, Tailwind v4, TypeScript. Monorepo at `/Users/beers/scopecreeper`. MCP server at `apps/mcp/dist/index.js`.

---

## Pre-flight: orientation for the implementer

Read these files before touching anything — they establish the context:
- `/Users/beers/scopecreeper/.scopecreeper.md` — declared scope (what IS / is NOT in scope)
- `/Users/beers/scopecreeper/apps/web/src/components/Hero.tsx` — the main orchestrator component (~654 lines); all three tasks touch it
- `/Users/beers/scopecreeper/apps/web/src/hooks/useSession.ts` — session hook (exposes `session.isPro`, `refresh()`)
- `/Users/beers/scopecreeper/apps/web/src/components/PixelArcade.tsx` — the arcade cabinet (130 lines); Task 2 wraps this

---

## Task 0: Register the MCP (user command — no code)

**Files:** none

- [ ] **Step 1: Register scope-creeper MCP in this Claude Code session**

Type this in the terminal (the `!` prefix runs it in-session):

```bash
! claude mcp add scope-creeper -- node /Users/beers/scopecreeper/apps/mcp/dist/index.js
```

Expected output: `Added MCP server "scope-creeper"`. After registration, the tools `scope_creeper_scope`, `scope_creeper_history`, `scope_creeper_patterns`, `scope_creeper_inbox`, `scope_creeper_scan`, `scope_creeper_kill`, and `scope_creeper_shippable` will be callable in this session.

- [ ] **Step 2: Verify by calling scope_creeper_scope**

Call the tool with `repoPath: "/Users/beers/scopecreeper"`. Expected: returns the .scopecreeper.md + diary content. If it errors, run: `node /Users/beers/scopecreeper/apps/mcp/dist/index.js` in a terminal and check for startup errors.

---

## Task 1: Pro Activation Success UX

**What's missing:** When Stripe completes a Pro checkout it redirects to `/?purchase=success&product=pro`. Nothing in Hero.tsx reads this URL param — the user lands on the normal page with no acknowledgment that Pro is now active. The session eventually refreshes (polling), so `CreditsHud` will show "▸ PRO" but there's no deliberate moment.

**Files:**
- Create: `apps/web/src/components/ProActivatedBanner.tsx`
- Modify: `apps/web/src/components/Hero.tsx` (add `useSearchParams` handling + render `ProActivatedBanner`)

### Step 1: Build the ProActivatedBanner component

- [ ] **Create `apps/web/src/components/ProActivatedBanner.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";

/**
 * Reads ?purchase=success&product=pro from the URL after Stripe redirects back.
 * Refreshes the session immediately so CreditsHud shows PRO, then renders a
 * brief banner. Auto-dismisses after 6 seconds or on click.
 *
 * Renders nothing in all other states.
 */
export default function ProActivatedBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const purchase = params.get("purchase");
    const product = params.get("product");
    if (purchase === "success" && product === "pro") {
      setVisible(true);
      // Immediately refresh session so CreditsHud flips to PRO.
      void refresh();
      // Clean the URL params without a full navigation.
      const url = new URL(window.location.href);
      url.searchParams.delete("purchase");
      url.searchParams.delete("product");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
      // Auto-dismiss after 6 s.
      const t = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [params, refresh, router]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 border cursor-pointer select-none"
      onClick={() => setVisible(false)}
      style={{
        background: "rgba(0,0,0,0.92)",
        borderColor: "#ffb000",
        color: "#ffb000",
        fontFamily: "var(--font-vt323), monospace",
        fontSize: 18,
        letterSpacing: "0.18em",
        textShadow: "0 0 10px #ffb000",
        boxShadow: "0 0 28px rgba(255,176,0,0.45)",
      }}
    >
      ▸ PRO ACTIVATED · unlimited scans, share links, all artifacts
    </div>
  );
}
```

- [ ] **Step 2: Wire ProActivatedBanner into Hero.tsx**

Find the import block at the top of `Hero.tsx` and add:

```tsx
import ProActivatedBanner from "./ProActivatedBanner";
```

Then find the JSX return in Hero (the outermost `<div className="relative …">`). Add the banner just inside the outermost wrapper, before any other children:

```tsx
<ProActivatedBanner />
```

`ProActivatedBanner` uses `useSearchParams` which requires `<Suspense>` in Next.js App Router. Wrap it:

```tsx
import { Suspense } from "react";
// ...
<Suspense fallback={null}>
  <ProActivatedBanner />
</Suspense>
```

- [ ] **Step 3: Verify the component builds**

```bash
cd /Users/beers/scopecreeper && pnpm --filter @scopecreeper/web build 2>&1 | tail -20
```

Expected: no TypeScript errors. If `useSession` doesn't expose `refresh`, check `apps/web/src/hooks/useSession.ts` and use whatever the actual refresh method is called.

- [ ] **Step 4: Commit**

```bash
git -C /Users/beers/scopecreeper add apps/web/src/components/ProActivatedBanner.tsx apps/web/src/components/Hero.tsx
git -C /Users/beers/scopecreeper commit -m "feat: Pro activation banner on ?purchase=success redirect"
```

---

## Task 2: ArcadeCollapsedHeader

**What it is:** After the first scan completes and a result is visible, the full arcade cabinet (which takes ~40% of viewport height on desktop) collapses to a 64px sticky header strip. The strip shows: tier color glow, score/100, tier name, and a "NEW SCAN" chip that re-opens the scan input. This gives the skill tree / artifact panel the vertical space they need without hiding the current session state.

**Files:**
- Create: `apps/web/src/components/ArcadeCollapsedHeader.tsx`
- Modify: `apps/web/src/components/Hero.tsx` (add collapse transition; mount ArcadeCollapsedHeader when result exists)

### Step 1: Read the current Hero layout

Before coding, read these specific sections of Hero.tsx:

```bash
grep -n "arcade\|PixelArcade\|hasResult\|currentThread\|state\b" /Users/beers/scopecreeper/apps/web/src/components/Hero.tsx | head -40
```

Understand: what variable tracks whether a scan result exists (`currentThread` or `state === "done"`), and what prop controls the arcade cabinet height in the layout.

### Step 2: Build ArcadeCollapsedHeader

- [ ] **Create `apps/web/src/components/ArcadeCollapsedHeader.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import type { RatingTier } from "@/core";

const TIER_COLOR: Record<RatingTier, string> = {
  corpse:    "#888888",
  sweetspot: "#39ff14",
  abyss:     "#ffb000",
  delusion:  "#ff007f",
};

interface Props {
  score: number;
  tier: RatingTier;
  onNewScan: () => void;
}

/**
 * 64px sticky header strip rendered after the first scan result appears.
 * Animates in from the top. Contains the live score, tier badge, and a
 * "NEW SCAN" chip that calls onNewScan() to reset the input flow.
 */
export default function ArcadeCollapsedHeader({ score, tier, onNewScan }: Props) {
  const color = TIER_COLOR[tier];

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="sticky top-0 z-50 flex items-center justify-between px-4"
      style={{
        height: 64,
        background: "rgba(0,0,0,0.92)",
        borderBottom: `1px solid ${color}40`,
        backdropFilter: "blur(4px)",
        boxShadow: `0 2px 16px ${color}22`,
      }}
    >
      {/* Score + tier badge */}
      <div className="flex items-center gap-4">
        <span
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            fontSize: 13,
            color,
            textShadow: `0 0 10px ${color}`,
            letterSpacing: "0.08em",
          }}
        >
          {score}/100
        </span>
        <span
          className="px-2 py-0.5 border uppercase"
          style={{
            borderColor: `${color}60`,
            color,
            fontFamily: "var(--font-vt323), monospace",
            fontSize: 15,
            letterSpacing: "0.2em",
            textShadow: `0 0 6px ${color}`,
          }}
        >
          {tier}
        </span>
      </div>

      {/* Arcade logo wordmark — minimal, keeps identity visible */}
      <span
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          fontFamily: "var(--font-press-start-2p), monospace",
          fontSize: 8,
          color: "#ffffff22",
          letterSpacing: "0.3em",
          userSelect: "none",
        }}
      >
        SCOPE CREEPER
      </span>

      {/* New scan chip */}
      <button
        onClick={onNewScan}
        className="px-3 py-1 border uppercase"
        style={{
          borderColor: `${color}60`,
          color,
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 14,
          letterSpacing: "0.18em",
          textShadow: `0 0 6px ${color}`,
          background: `${color}08`,
        }}
      >
        ▸ NEW SCAN
      </button>
    </motion.div>
  );
}
```

### Step 3: Integrate into Hero.tsx

- [ ] **Add ArcadeCollapsedHeader import and AnimatePresence to Hero.tsx**

```tsx
import { AnimatePresence } from "framer-motion";
import ArcadeCollapsedHeader from "./ArcadeCollapsedHeader";
```

- [ ] **Find where the arcade cabinet section is rendered in Hero's JSX**

Look for the `<PixelArcade …>` usage. Identify the `state` and `currentThread` variables. The collapsed header should appear **above** the main content once `currentThread?.result` exists, and the arcade cabinet section should be hidden (use `AnimatePresence` + conditional render).

Add this immediately before the arcade cabinet section:

```tsx
<AnimatePresence>
  {currentThread?.result && (
    <ArcadeCollapsedHeader
      score={currentThread.result.score}
      tier={currentThread.result.tier}
      onNewScan={() => {
        // Reset to idle — clear the current thread so input re-appears.
        // Use whatever reset function the scan hook exposes; look for reset() or clear().
        reset();
      }}
    />
  )}
</AnimatePresence>
```

When `currentThread?.result` exists, also **conditionally hide the full arcade cabinet section** (not remove — it may still be used during scanning state). Wrap the existing arcade section with:

```tsx
{!currentThread?.result && (
  /* existing arcade section JSX */
)}
```

- [ ] **Step 4: Build and visually verify**

```bash
cd /Users/beers/scopecreeper && pnpm --filter @scopecreeper/web build 2>&1 | tail -20
```

Expected: clean build. If framer-motion's `AnimatePresence` causes import issues, it's already in `package.json` (`framer-motion: ^12.38.0`) — check the import path.

- [ ] **Step 5: Commit**

```bash
git -C /Users/beers/scopecreeper add apps/web/src/components/ArcadeCollapsedHeader.tsx apps/web/src/components/Hero.tsx
git -C /Users/beers/scopecreeper commit -m "feat: ArcadeCollapsedHeader — arcade collapses to 64px strip after first scan"
```

---

## Task 3: Stripe Webhook Verification + Deploy

**What this checks:** The webhook endpoint `https://scopecreeper.pages.dev/api/stripe/webhook` must be registered in the Stripe Dashboard, or Pro subscriptions will never activate (checkout completes but the `customer.subscription.created` event never fires our handler). `STRIPE_WEBHOOK_SECRET` being set implies it's been configured, but verify before declaring done.

**Files:** no new files — this is a config + deploy task.

- [ ] **Step 1: Confirm webhook is registered in Stripe Dashboard**

Go to Stripe Dashboard → Developers → Webhooks. Confirm there is an endpoint pointing to `https://scopecreeper.pages.dev/api/stripe/webhook` (or the production Pages URL) with at least these events selected:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

If it's missing, create it now. Copy the signing secret and confirm it matches the `STRIPE_WEBHOOK_SECRET` in Cloudflare Pages secrets.

- [ ] **Step 2: Deploy the new components to Cloudflare Pages**

```bash
cd /Users/beers/scopecreeper/apps/web && npx @cloudflare/next-on-pages@latest && wrangler pages deploy .vercel/output/static --project-name scopecreeper 2>&1 | tail -30
```

Expected: deployment succeeds, URL returned is `scopecreeper.pages.dev` or the custom domain.

- [ ] **Step 3: Smoke test Pro flow end-to-end**

1. Open `https://scopecreeper.ai` in incognito (fresh session).
2. Open `BuyCreditsModal` (click the credits HUD in top-right).
3. Click the "SCOPE CREEPER · PRO" option — you should be redirected to a Stripe checkout page.
4. Complete with a Stripe test card (`4242 4242 4242 4242`, any future date, any CVC).
5. After redirect to `/?purchase=success&product=pro`:
   - The `ProActivatedBanner` should appear with "▸ PRO ACTIVATED" in gold.
   - The `CreditsHud` should flip to "▸ PRO".
   - Banner should auto-dismiss after 6 seconds.
6. Run a scan. After the result appears, `ArcadeCollapsedHeader` should slide in from the top showing the score and "NEW SCAN" chip. The full arcade cabinet should be hidden.
7. Click "NEW SCAN" — should reset to the idle/scan-input state with the arcade visible again.
8. Share button: run a scan, open ProjectSidebar, click Share. `ShareSuccessModal` appears with the `/t/[slug]` URL. Visit the URL in incognito — it should render `SharedThreadView` with OG metadata.

- [ ] **Step 4: Commit any fixups from smoke test**

```bash
git -C /Users/beers/scopecreeper add -A && git -C /Users/beers/scopecreeper commit -m "fix: smoke-test fixups post-deploy"
```

---

## Self-review

**Spec coverage:**
- MCP registration → Task 0 ✅
- Pro tier completeness (purchase success UX) → Task 1 ✅
- ArcadeCollapsedHeader (declared in-flight scope) → Task 2 ✅
- Stripe webhook verification + deploy → Task 3 ✅
- Share links: already complete on server+UI; smoke-tested in Task 3 Step 3 ✅

**Placeholder scan:** No TBD/TODO in this plan. Task 2 Step 3 defers to "whatever reset function the scan hook exposes" — that's conditional on reading the file first (Step 1 of Task 2 explicitly instructs this read). Not a placeholder — it's deliberate read-first instruction.

**Type consistency:** `RatingTier` used in `ArcadeCollapsedHeader` matches the type used in `PixelArcade.tsx` (same import `from "@/core"`). `ScanThread.result.score` and `.tier` are the same fields read by `SharedThreadView` and `SkillTreeView`.

**What's intentionally NOT in this plan:**
- Repo deep-audit (separate large feature)
- GitHub App auto-status-check (separate feature)
- Any changes to the MCP server source (already shipped and built)
- Any changes to the TUI (already shipped)
