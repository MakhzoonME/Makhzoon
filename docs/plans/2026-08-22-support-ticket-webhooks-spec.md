# Support Ticket Webhooks — Engineering Spec

**Purpose**: Emit outbound webhooks from Makhzoon so an external automation (Activepieces) can create and keep in sync a ClickUp bug task for every support ticket — including status changes and comments.

**Consumer**: A single Activepieces flow. Not built by engineering — engineering only needs to implement the sending side described below.

**Scope**: 3 outbound events. No new read API, no ticket schema fields required for correlation (see [Out of scope](#7-out-of-scope)).

---

## 1. Delivery target

- One webhook URL, stored as an env-configurable value (e.g. `SUPPORT_AUTOMATION_WEBHOOK_URL`) — not hardcoded, since the URL will change if the Activepieces flow is rebuilt.
- All three event types POST to the **same URL**. The event type is carried in the payload (`event` field) so the receiving flow can route internally. This avoids managing three separate URLs/config values.
- Method: `POST`, `Content-Type: application/json`.

---

## 2. Events to emit

### 2.1 `ticket.created`

**Fires**: immediately after a new `SupportTicket` row is inserted (status is always `OPEN` at creation).

| Field | Type | Required | Notes |
|---|---|---|---|
| `event` | string | ✅ | `"ticket.created"` |
| `eventId` | string (UUID) | ✅ | Unique per webhook attempt — see [§4 Idempotency](#4-delivery-requirements) |
| `timestamp` | string (ISO 8601) | ✅ | When the event was emitted |
| `ticketId` | string | ✅ | `SupportTicket.id` — the join key for all future events on this ticket |
| `organizationId` | string | ✅ | `SupportTicket.organizationId` |
| `organizationName` | string | ✅ | Denormalized org name at emit time — the automation has no other way to resolve this |
| `subject` | string | ✅ | `SupportTicket.subject` |
| `description` | string | ✅ | `SupportTicket.description` |
| `priority` | enum | ✅ | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` |
| `status` | enum | ✅ | Always `OPEN` for this event, included for consistency with other events |
| `createdById` | string | ✅ | `SupportTicket.createdBy` |
| `createdByName` | string | ✅ | Denormalized display name of the ticket creator |
| `ticketUrl` | string (URL) | ✅ | Deep link: `https://app.makhzoon.me/{locale}/{orgSlug}/support/{ticketId}` — **not currently in the data model, needs to be constructable at emit time** |

```json
{
  "event": "ticket.created",
  "eventId": "8f1a2e3b-...",
  "timestamp": "2026-08-22T10:14:00Z",
  "ticketId": "tkt_9f21",
  "organizationId": "org_7a3",
  "organizationName": "Acme Trading Co.",
  "subject": "Cannot upload invoice attachments",
  "description": "Getting a 500 error when attaching a PDF larger than 2MB.",
  "priority": "HIGH",
  "status": "OPEN",
  "createdById": "usr_44",
  "createdByName": "Sara Ali",
  "ticketUrl": "https://app.makhzoon.me/en/acme/support/tkt_9f21"
}
```

### 2.2 `ticket.status_changed`

**Fires**: every time `SupportTicket.status` transitions (`OPEN → IN_PROGRESS`, `IN_PROGRESS → RESOLVED`, `RESOLVED → CLOSED`, or any manual override by the Makhzoon support team from the superadmin portal).

| Field | Type | Required | Notes |
|---|---|---|---|
| `event` | string | ✅ | `"ticket.status_changed"` |
| `eventId` | string (UUID) | ✅ | |
| `timestamp` | string (ISO 8601) | ✅ | |
| `ticketId` | string | ✅ | Join key — matches the `ticket.created` event for this ticket |
| `oldStatus` | enum | ✅ | Status before the change |
| `newStatus` | enum | ✅ | Status after the change |
| `changedById` | string | ⬜ | Makhzoon support/superadmin user who made the change, if available |
| `changedByName` | string | ⬜ | Denormalized display name |

```json
{
  "event": "ticket.status_changed",
  "eventId": "3c9d1f0a-...",
  "timestamp": "2026-08-22T11:02:00Z",
  "ticketId": "tkt_9f21",
  "oldStatus": "OPEN",
  "newStatus": "IN_PROGRESS",
  "changedById": "usr_makhzoon_7",
  "changedByName": "Omar (Support)"
}
```

### 2.3 `ticket.comment_added`

**Fires**: every time a new `TicketMessage` is created — **by either side** (org user reply or Makhzoon support reply). Both need to be sent so the ClickUp task thread mirrors the full conversation.

| Field | Type | Required | Notes |
|---|---|---|---|
| `event` | string | ✅ | `"ticket.comment_added"` |
| `eventId` | string (UUID) | ✅ | |
| `timestamp` | string (ISO 8601) | ✅ | |
| `ticketId` | string | ✅ | Join key |
| `messageId` | string | ✅ | `TicketMessage.id` |
| `body` | string | ✅ | `TicketMessage.body` |
| `authorId` | string | ✅ | `TicketMessage.authorId` |
| `authorName` | string | ✅ | `TicketMessage.authorName` |
| `authorRole` | enum | ✅ | `ORG_USER` \| `MAKHZOON_SUPPORT` — used to label the comment correctly in ClickUp |

```json
{
  "event": "ticket.comment_added",
  "eventId": "6b7e4a2c-...",
  "timestamp": "2026-08-22T11:05:30Z",
  "ticketId": "tkt_9f21",
  "messageId": "msg_331",
  "body": "Can you share the exact file size that fails?",
  "authorId": "usr_makhzoon_7",
  "authorName": "Omar (Support)",
  "authorRole": "MAKHZOON_SUPPORT"
}
```

> **Resolved**: the internal `TicketMessage.authorRole` DB value is actually `SUPER_ADMIN`, not `MAKHZOON_SUPPORT`. The webhook layer translates `SUPER_ADMIN` → `MAKHZOON_SUPPORT` at dispatch time (see `app/api/support/[ticketId]/messages/route.ts`) so the payload's `authorRole` matches this spec exactly; the DB row itself keeps `SUPER_ADMIN`.

---

## 3. Common fields

Every event carries `event`, `eventId`, `timestamp`, and `ticketId`. These four are what let the receiving flow route the event and find the right ClickUp task — treat them as non-optional on every payload, no exceptions.

---

## 4. Delivery requirements

- **Async, non-blocking**: dispatch via a background job/queue. The ticket-creation request, status-change action, and reply submission must not wait on the webhook call's response.
- **Timeout**: 5s connect/read timeout on the outbound call; treat a timeout as a failure to be retried, not an error surfaced to the user.
- **Retries**: on non-2xx response or timeout, retry with backoff (e.g. 3 attempts over ~15 minutes). After final failure, log it — don't raise a user-facing error.
  - **Implementation decision**: the codebase has no persisted job queue or cron-retry infra (fire-and-forget IIFEs are the only existing async pattern, e.g. notification/email dispatch). Building persisted retries would require a new table + cron sweep. Shipped v1 does a **single delivery attempt, no retry** — failures are logged and dropped. Revisit with a persisted-retry table + cron sweep (matching `app/api/cron/*`) if delivery reliability becomes a problem in practice.
- **Idempotency**: each attempt (including retries of the same logical event) reuses the same `eventId`, so the consumer can dedupe. Do not generate a new `eventId` per retry.
- **Ordering**: not guaranteed. `ticket.status_changed` or `ticket.comment_added` could in rare cases arrive before `ticket.created` is processed downstream. The `timestamp` field lets the consumer be defensive about this; no ordering guarantee needs to be engineered on the Makhzoon side.
- **Logging**: log every delivery attempt (event, ticketId, response code, timestamp) for debugging missing/duplicate ClickUp tasks.

---

## 5. Security

- Sign the payload: `X-Makhzoon-Signature: sha256=<HMAC-SHA256(payload, shared_secret)>`.
- Include the timestamp in the signed string (e.g. sign `timestamp + "." + rawBody`) to prevent replay of captured payloads.
- The shared secret lives in the secrets manager / env config, shared out-of-band with whoever configures the Activepieces flow — never committed to the repo.

---

## 6. Enum reference

| Enum | Values |
|---|---|
| `priority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `status` (in `ticket.created`), `oldStatus`/`newStatus` (in `ticket.status_changed`) | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `authorRole` | `ORG_USER`, `MAKHZOON_SUPPORT` *(confirm against actual model)* |

---

## 7. Out of scope

- **No filtering/categorization needed.** Every ticket generates a bug task — no `category` or `type` field required on `SupportTicket`.
- **No new read API.** This is push-only; the automation never calls back into Makhzoon to fetch ticket data.
- **No need to store a ClickUp task ID on the ticket.** Correlation happens on the automation side using `ticketId` — nothing to build here for that.

---

## 8. Rollout checklist

- [x] `SUPPORT_AUTOMATION_WEBHOOK_URL` + `SUPPORT_AUTOMATION_WEBHOOK_SECRET` added as env-configurable values (`.env.*.example`, one pair per environment)
- [x] `ticket.created` emitted on ticket submission (org portal) — `app/api/support/route.ts`
- [x] `ticket.status_changed` emitted on every superadmin status transition — `app/api/support/[ticketId]/route.ts` (org-side self-close does not currently emit this event)
- [x] `ticket.comment_added` emitted on every new `TicketMessage`, from both org users and Makhzoon support — `app/api/support/[ticketId]/messages/route.ts`
- [x] `ticketUrl` correctly constructed per locale/org slug — `lib/webhooks/support-ticket-webhooks.ts` (`buildTicketUrl`), locale from the `makhzoon-locale` cookie, org subdomain from `getOrganizationById`
- [x] HMAC signing implemented (`lib/webhooks/support-ticket-webhooks.ts`) — secret still needs to be generated and shared securely per environment
- [ ] Async dispatch in place; retry/backoff **descoped for v1** (see §4 implementation decision) — single attempt, logged on failure
- [ ] 3 test events sent from staging, delivery confirmed by whoever owns the Activepieces flow

**Implementation**: `lib/webhooks/support-ticket-webhooks.ts` (signing + dispatch), wired into the three routes above.
