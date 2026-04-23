# Platform integration guide

This document describes how **refunds**, **chat monitoring**, and **flagged messages** fit together in Rhythm Guardian today, and a practical path to deepen each integration without breaking existing flows.

## How this reduces scams (what the platform can and cannot prove)

**Reality:** No web app can stop two people from meeting offline, paying in cash, or privately agreeing to lie to support. The goal is to **align incentives** and to **anchor truth** in data you control: in-app payments, booking state, confirmations, chat logs, and review history.

### 1) “Service happened but we both skip confirmation / pay behind closed doors”

- **Protection today:** Escrow-style flows and **both-party service confirmation** in the app are the basis for releasing funds and for judging disputes. If users collude to skip confirmation, the platform loses its primary evidence chain.
- **Product mitigations (implemented or extended here):**
  - Hirer refund flow now records **explicit attestations** on the support ticket (paid through platform, no agreement to skip confirmation, truthful report).
  - Bookings pages show **short anti-scam notices** reminding both sides that off-platform payment and skipping confirmation remove protections.
- **Stronger future steps (recommended):** optional deadline-based auto-rules with clear policy text; idempotent “one open refund ticket per booking”.
- **Gateway signal (implemented):** `supabase/functions/paystack-webhook/index.ts` handles **`refund.processed`** / **`refund.failed`** (see Paystack section below). Enable those events on your Paystack dashboard for the same webhook URL as `charge.*` / `transfer.*`.

### 2) Sensitive or abusive chat, manual flagging, and monitoring gaps

- **Protection today:** `messages.flagged` / `flag_reason`, admin **Chat monitor**, and **Report message** in chat (`ChatMessages`). Client-side keyword checks are **warnings only** — they reduce mistakes and nudge good behavior; they are not a substitute for reports, admin review, or eventual ML moderation on the server.
- **Product mitigations implemented:** composer **risk scan** before send (off-platform payment language, external contact pivots, obvious financial/credential phrases, phone/email-like patterns) with a **confirm-to-send** dialog; persistent **anti-scam reminder** above the composer for human chats.
- **Server-side (implemented):** migration **`00058_message_auto_flag_scam_patterns.sql`** — `BEFORE INSERT OR UPDATE OF content` trigger sets `flagged` + `flag_reason` with `auto:*` tags when content matches high-risk patterns; **does not overwrite** user/admin flags (`flag_reason` not starting with `auto:`).
- **Stronger future steps (recommended):** ML scoring via Edge Function; structured report reasons; retention policy; optional PII redaction for display to admins; `notifyAdmins` on first auto-flag.

### 3) Other common scams (design responses)

| Pattern | Mitigation direction |
|--------|----------------------|
| Fake urgency (“pay now outside app”) | Composer warnings + policy + escrow |
| Identity / impersonation | Verified badges, document checks (existing admin flows) |
| Chargeback / refund abuse | Ticket + attestations + booking/payment audit trail |
| Bait-and-switch pricing | Confirmed booking amount in `bookings` + receipts |

---

## Ratings (authoritative source)

- **Source of truth:** `public.reviews` (`reviewee_id`, `rating`, `booking_id`, `reviewer_id`).
- **Client aggregation:** `src/lib/review-ratings.ts` — `fetchReviewAggregatesForReviewees`, `averageRatingFromSumCount`, `averageRatingFromReviewList`.
- **Profile columns:** `profiles.rating` and `profiles.total_reviews` are updated after reviews (DB triggers and `ReviewDialog`) and are used as a **fallback** when review aggregation cannot run.

Hirers and musicians can both be `reviewee_id`; averages are always “reviews received by this user.”

---

## Refund system integration

### Current behavior

- **Service:** `src/services/refund-ticketing.ts` — `refundTicketingService.createRefundTicket`.
- **Flow:** Hirer-initiated refund creates a **high-priority billing** `support_tickets` row (RPC `create_support_ticket` when available, otherwise direct insert). Booking may move to `refund_pending` payment status when the database allows it.
- **Admin signal:** `notifyAdmins` fallback if ticket creation fails; optional `notify_admins_about_ticket` RPC after RPC success.
- **UI:** `src/pages/HirerBookings.tsx` correlates open tickets with bookings (subject/message pattern) to show refund-request state.

### Recommended next steps

1. **Single admin queue**  
   Route all refund work through `support_tickets` with a fixed `category`/`priority` and structured `original_message` (JSON or markdown sections: booking id, amounts, party ids). Avoid parsing free-text subjects in the UI long-term.

2. **Idempotent ticket**  
   Enforce “one open refund ticket per booking” (unique partial index or check before insert) so retries and double-clicks do not duplicate work.

3. **Payment provider webhooks (partially implemented)**  
   **`refund.processed`:** marks matching `transactions` as `refunded` by `paystack_reference`, and `bookings.payment_status = refunded` when `metadata.bookingId` (or `booking_id`) is present on the Paystack transaction. **`refund.failed`:** marks the transaction `failed` for staff follow-up.  
   **Still recommended:** close or update the related `support_tickets` row from the same handler once ticket↔refund linkage is stored in metadata; add admin notification on mismatch.

4. **Audit**  
   Log admin decisions with `auditService` (pattern used in `ChatMonitor`) for dispute resolution.

---

## Chat monitoring integration

### Current behavior

- **Admin UI:** `src/components/dashboard/ChatMonitor.tsx` (dashboard “Chat monitor”).
- **Service:** `src/services/chat-monitor.ts` — `ChatMonitorService`:
  - `getFlaggedChats()` — loads `messages` where `flagged = true`.
  - `getChatHistory(senderId, receiverId)` — conversation thread for triage.
  - `subscribeToMessages` — realtime `postgres_changes` on `public.messages` for a live tail (in-memory, last 100 rows in UI).

### Recommended next steps

1. **RLS and roles**  
   Ensure only admins can `SELECT` arbitrary `messages` rows used by the monitor (or use `security_invoker` views + strict policies). Client-side admin layout should still assume least privilege.

2. **Pagination and search**  
   For high volume, replace “load all flagged” with keyed pagination and server-side filters (date range, user id, keyword).

3. **Retention**  
   Align with `docs`/settings for message retention; archive old rows to cold storage instead of unbounded `SELECT`.

4. **Separation from product chat**  
   Keep monitoring reads on a **read replica** or dedicated Supabase project if traffic grows — same schema, async sync.

---

## Flagged messages integration

### Current behavior

- **Storage:** `messages.flagged` (boolean) and `messages.flag_reason` (text), queried by `chatMonitorService.getFlaggedChats`.
- **Admin actions:** `ChatMonitor` can resolve a flag and optionally warn the sender (wired through `chatMonitorService` + `auditService` — see component handlers).
- **Settings:** Admin **Settings** UI exposes thresholds such as `flaggedContentThreshold` and `reportingThreshold` (`src/pages/admin/Settings.tsx`) for future automation.

### Recommended next steps

1. **User reporting path**  
   When a user reports a message, set `flagged = true`, fill `flag_reason` with a structured code (`spam`, `harassment`, `scam`, `other`) plus optional free text. Reuse the same admin list.

2. **Automation hook (implemented — database)**  
   Keyword-style **auto-flag** on `messages` insert/update of `content` (migration `00058_message_auto_flag_scam_patterns.sql`). Optional next step: call an Edge Function from a trigger via `pg_net` / HTTP for ML or external APIs (not required for baseline).

3. **Notifications**  
   On `flagged` transition to `true`, insert admin `notifications` or call existing `notifyAdmins` so triage is not polling-only.

4. **False-positive workflow**  
   Store `flag_resolved_at`, `flag_resolved_by`, `flag_resolution` on `messages` (migration) instead of losing resolution history when `flagged` is cleared.

---

## Paystack webhooks (refund + charges)

| Event | Handler | Effect |
|--------|---------|--------|
| `charge.success` | existing | Updates `transactions`, `bookings`, notifications |
| `transfer.success` / `transfer.failed` | existing | Payout / failure tracking |
| `refund.processed` | **added** | `transactions.status → refunded` by reference; `bookings.payment_status → refunded` if `bookingId` in metadata |
| `refund.failed` | **added** | `transactions.status → failed` |
| `refund.pending` / `refund.processing` | logged | Hook point for future UI / Slack |

**Ops checklist:** In Paystack Dashboard → Settings → Webhooks, ensure the URL points to your deployed `paystack-webhook` function and **subscribe** to refund events. Same HMAC verification as other events (`webhook_events` idempotency still applies).

---

## Implementation checklist (anti-scam + robustness)

| Item | Status | Where |
|------|--------|--------|
| Client chat risk warning + confirm send | Done | `src/lib/anti-scam-chat.ts`, `src/components/chat/MessageInput.tsx` |
| Hirer refund attestations on ticket | Done | `src/pages/HirerBookings.tsx`, `src/services/refund-ticketing.ts` |
| Bookings page trust reminders | Done | `HirerBookings.tsx`, `MusicianBookings.tsx` |
| Server auto-flag on message content | Done | `supabase/migrations/00058_message_auto_flag_scam_patterns.sql` |
| Paystack `refund.processed` / `refund.failed` | Done | `supabase/functions/paystack-webhook/index.ts` |
| Close support ticket from refund webhook | Pending | Needs `bookingId` / `ticketId` on Paystack metadata when initiating API refunds |
| One open refund ticket per booking | Pending | DB unique partial index or RPC guard |
| Admin notify on new `auto:` flag | Pending | Trigger → `notify_admins` or insert into `notifications` |
| Rate limits on `messages` insert | Pending | Supabase Edge + rate key, or RLS + RPC-only send |

---

## Robustness upgrades (recommended backlog)

1. **Structured logging** — Correlate `booking_id`, `user_id`, `paystack_reference`, `support_ticket_id` in one JSON field on tickets and transactions.  
2. **Refund ↔ ticket linkage** — Store `support_ticket_id` on `bookings` or in `transactions.metadata` when `createRefundTicket` runs so webhooks can auto-close tickets.  
3. **Dispute timeline** — Immutable `booking_events` table (append-only) for status/payment/confirmation changes — best evidence for chargebacks.  
4. **Message retention & legal hold** — Policy-driven archive; freeze threads when ticket opened.  
5. **Shadow mode for auto-flags** — Log matches without setting `flagged` until false-positive rate is measured (feature flag in `site_settings`).  
6. **Read-path hardening** — Admin message viewer via RPC returning redacted PII for non-admin roles.  
7. **Paystack metadata contract** — Always send `bookingId`, `hirerId`, `musicianId` on initialize/verify so webhooks stay deterministic.  
8. **Cron reconciliation** — Nightly job: Paystack list refunds vs `transactions` where status still `paid`.  

---

## Quick reference (files)

| Area | Primary files |
|------|-----------------|
| Review math (shared) | `src/lib/review-ratings.ts` |
| List profiles + ratings | `src/services/user.ts`, `src/services/search.ts` |
| Bookings + both party ratings | `src/services/booking.ts`, `src/contexts/BookingContext.tsx` |
| Refund tickets | `src/services/refund-ticketing.ts`, `src/pages/HirerBookings.tsx` |
| Paystack webhooks | `supabase/functions/paystack-webhook/index.ts`, `supabase/migrations/00019_webhook_idempotency.sql` |
| Chat monitor + flags | `src/services/chat-monitor.ts`, `src/components/dashboard/ChatMonitor.tsx` |
| Message auto-flag (DB) | `supabase/migrations/00058_message_auto_flag_scam_patterns.sql` |
| Client chat risk scan | `src/lib/anti-scam-chat.ts`, `src/components/chat/MessageInput.tsx` |
| Review submit + profile sync | `src/components/booking/ReviewDialog.tsx` |

This should be enough for an engineer or operator to extend refunds, monitoring, and moderation in small, verifiable steps while staying aligned with the current codebase.
