# AI / automated navigation assistant — product & engineering spec

This document describes a **suggested** feature: an **automated, in-app guide** that helps hirers and musicians complete real tasks (bookings, payments, messages, verification) without replacing human support or bypassing safety rules. It is written for **product owners** and **AI coding assistants** implementing the feature.

## Goals

1. **Reduce time-to-first-success** — Users reach “I found a musician / I got a booking / I completed payout steps” with fewer dead ends.
2. **Contextual, not generic** — Guidance reflects **role** (hirer vs musician), **current route**, **tour progress** (`feature_tours`), and **lightweight app state** (e.g. pending booking, unpaid status) when available.
3. **Clear copy** — Short titles, one primary action per message, plain language, no jargon unless the UI uses the same term.
4. **Automation** — Messages are **produced automatically** from structured context (see below), not hand-written per session; optional LLM layer must stay **constrained** so output stays safe and accurate.

## Non-goals

- Replacing the existing **dashboard tour** (`OnboardingTour`, `dashboard-tour-steps.ts`); the assistant should **complement** it (e.g. after tour completion or on specific pages).
- Open-ended “chat with the product” that can invent URLs, policies, or fees — **ground truth** must come from the app.
- Storing full chat transcripts with PII in third-party logs without explicit policy and retention rules.

## What exists today (anchor points)

| Piece | Location | Use for the assistant |
|--------|-----------|------------------------|
| Dashboard tour | `src/components/onboarding/OnboardingTour.tsx` | Respect `feature_tours` / local completion; avoid duplicating the first-run modal or fight for focus. |
| Step copy | `src/components/onboarding/dashboard-tour-steps.ts` | **Canonical phrasing** for high-level flows; reuse or lightly vary for consistency. |
| Welcome toasts | `src/components/dashboard/UserDashboardLayout.tsx` | Pattern for short, one-off messages after the tour gate. |
| Routes | `src/App.tsx` | **Single source of allowed links** — generated suggestions must only deep-link to paths that exist here. |

## Automated message generation — recommended design

### 1. Context bundle (structured, stable)

Build a small JSON-serializable object on the client (and optionally refresh from server for booking counts, etc.):

- `userRole`: `hirer` | `musician`
- `pathname`, optional `searchParams` (e.g. settings tab)
- `tourCompleted`: boolean per `tour_name` (from `feature_tours` or local fallback)
- `signals`: enum flags, e.g. `has_no_bookings`, `has_pending_booking`, `payment_pending`, `verification_incomplete` (populate from existing hooks/services where possible)
- `locale` / `timezone` (optional, for future)

**Do not** pass free-text user content into templates as executable instructions; use **enum + IDs** only.

### 2. Two-layer content (robust default)

| Layer | Purpose | When |
|--------|---------|------|
| **A. Template catalog** | Deterministic strings keyed by `(role, route prefix, signals)` | Always available offline; **default** for compliance-sensitive text (payments, escrow, fees). |
| **B. Optional LLM polish** | Rephrase **within** a fixed slot (title ≤ N chars, body ≤ M chars, 1 CTA) | Only if product enables it; must **post-validate** every link against `App.tsx` routes. |

**Rule:** If the LLM fails, times out, or returns an unknown link → **fall back to Layer A** only. Never show raw model output without validation.

### 3. Message shape (clear, consistent)

Each assistant surface should use a **fixed schema**, for example:

- `title`: one line
- `body`: 1–3 short sentences
- `primaryAction`: `{ label, href }` — `href` must be from an allowlist
- `secondaryAction` (optional): dismiss, “open help”, or “show tour again”
- `severity`: `info` | `tip` | `action_required` (drives color/icon, not alarmist copy)

**Auto-generation** = filling this schema from the context bundle + templates (and optional LLM slot-fill).

### 4. Where it surfaces (UX)

- **Passive strip** or **card** below the top nav or above main content — does not block interaction.
- **Trigger rules:** first visit to a route, return after 7 days, or signal fires (e.g. booking accepted but payment incomplete) — with **cooldowns** per user + route (e.g. max 1 proactive nudge per route per day) stored in `localStorage` or a small `user_settings` / dedicated table.
- **Explicit entry:** “Help for this page” in the nav or overflow menu — always template-first, no surprise popups.

## Robustness requirements

1. **Fallback chain:** templates → cached last good message → silent failure (no broken UI).
2. **Allowlisted routes:** reject any `href` not matching known app paths; never use `javascript:` or external URLs except documented docs links.
3. **Race safety:** if `auth` or `feature_tours` is still loading, defer nudges; align with the 12s unblock pattern in `UserDashboardLayout` where appropriate.
4. **Accessibility:** focus management for modal variants; assistant content in a live region if it updates without focus steal for non-modal variants.
5. **Privacy:** context bundle sent to any server should minimize PII; if using an external LLM, prefer **server-side** proxy with redaction and **no** retention of raw prompts beyond policy.
6. **Feature flag:** e.g. `VITE_NAV_ASSISTANT` or remote flag — instant kill switch.
7. **Tests:** unit tests for template resolution + link validation; one E2E “assistant shows on route X for hirer with signal Y”.

## Security & trust

- Do not instruct users to share passwords, OTPs, or off-platform payment details; align messaging with **anti-scam** guidance elsewhere in the product.
- Admin-only or sensitive routes must not leak existence of features the user cannot access.

## Suggested implementation phases

1. **Phase 0:** Route + role + tour-aware **template catalog** only; no LLM; cooldown + dismiss persistence.
2. **Phase 1:** Add **signals** from bookings/profile APIs; richer templates for “action required”.
3. **Phase 2 (optional):** Server-side “polish” endpoint with strict JSON schema output and allowlist validation.
4. **Phase 3:** Analytics (impression, CTA click, dismiss) without storing message body + PII in the same event.

## For AI coding assistants

When implementing, **start** from:

- `dashboard-tour-steps.ts` for tone and factual flow descriptions.
- `OnboardingTour.tsx` for persistence conventions (`feature_tours`, `localStorage` keys).
- `App.tsx` for **valid paths only**.

Prefer **small, testable modules**, e.g. `src/features/navigation-assistant/context.ts`, `templates.ts`, `resolveMessage.ts`, and a thin UI component. Keep diffs focused; do not rewrite unrelated dashboard code.

---

*This is a specification for a future feature; it is not a commitment to ship all phases.*
