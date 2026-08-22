# Notifications System

**Scope**: Platform-wide — all modules (Haraka, Raseed, Usool, Requests, etc.)
**Feature key**: `notifications` (new)

---

## Overview

A unified notification system that delivers alerts across the entire platform. Every significant business event — a new order, low stock, a completed sale, an expiring warranty, a failed Fawtara submission — can trigger an in-app notification and/or an email, routed to the right users based on configurable preferences.

### Three delivery channels

| Channel | Mechanism | When |
|---------|-----------|------|
| **In-app** | Persisted `notifications` table, polled via React Query | Real-time feel (15s stale time); bell icon in header |
| **Email** | Existing Resend integration | Async, fire-and-forget |
| **Push** | Web Push API (VAPID, `web-push` npm package) via `sendWebPush()` (`lib/webpush/index.ts`) | Already implemented — fired alongside every `notificationQueue` send to all of the recipient's registered `web_push_subscriptions`; subscribe/unsubscribe toggle lives on the Settings → Notifications page |

### Architecture decision — service-layer fanout, not event bus

The existing `EventBus` is in-memory and unreliable in Next.js serverless (each request is a new process, so `.on()` subscribers don't persist). The notification system instead follows the same pattern as `auditLog.queue()`: services call `notificationQueue.enqueue()` directly — a fire-and-forget async function that writes to the DB and optionally sends email. This is the proven pattern already in use.

---

## Notification Event Catalog

Each event type has a fixed `key`, a human label, which roles receive it by default, and default channel settings. Org admins can override all defaults. Source of truth: `lib/notifications/catalog.ts` (`NOTIFICATION_CATALOG`).

> Note: there is no `requests.*` module in the catalog (Requests isn't wired into notifications yet). The actual catalog additionally covers Service Jobs, Support, and Appointments, none of which are in the original design doc.

| key | Label | Default roles | In-app | Email |
|-----|-------|--------------------|--------|-------|
| `order.created` | New order received | admin, org_owner | ✅ | ❌ |
| `order.status_changed` | Order status updated | admin, org_owner | ✅ | ❌ |
| `order.assigned_to_you` | Order assigned to you | staff, admin | ✅ | ✅ |
| `order.payment_recorded` | Payment recorded on order | admin, org_owner | ✅ | ❌ |
| `pos.session_closed` | POS session closed | admin, org_owner | ✅ | ❌ |
| `pos.refund_issued` | Refund issued | admin, org_owner | ✅ | ✅ |
| `pos.sale_voided` | Sale voided | admin, org_owner | ✅ | ✅ |
| `inventory.low_stock` | Item stock is low | admin, org_owner | ✅ | ✅ |
| `inventory.out_of_stock` | Item is out of stock | admin, org_owner | ✅ | ✅ |
| `inventory.purchase_received` | Purchase received | admin, org_owner | ✅ | ❌ |
| `inventory.audit_completed` | Stock audit completed | admin, org_owner | ✅ | ❌ |
| `users.invited` | New user invited | admin, org_owner | ✅ | ❌ |
| `users.joined` | New user joined org | admin, org_owner | ✅ | ❌ |
| `warranty.expiring` | Warranty expiring soon | admin, org_owner | ✅ | ✅ |
| `subscription.expiring` | Subscription expiring | org_owner | ✅ | ✅ |
| `fawtara.failed` | Fawtara submission failed | admin, org_owner | ✅ | ✅ |
| `service_job.created` | New service job created | admin, org_owner | ✅ | ❌ |
| `service_job.status_changed` | Service job status updated | admin, org_owner | ✅ | ❌ |
| `service_job.agents_assigned` | Service job assigned to agents | admin, org_owner | ✅ | ❌ |
| `service_job.rating_requested` | Rating requested from customer | admin, org_owner | ✅ | ❌ |
| `support.ticket_replied` | Reply on your support ticket | admin, org_owner | ✅ | ✅ |
| `support.ticket_status_changed` | Support ticket status updated | admin, org_owner | ✅ | ✅ |
| `appointment.booked` | New appointment booked | admin, org_owner | ✅ | ❌ |
| `appointment.status_changed` | Appointment status updated | admin, org_owner | ✅ | ❌ |

---

## Data Models

### notifications
One row per recipient per event. Never updated in-place — only `is_read` and `read_at` are mutable.
```
id, organization_id, space_id?
recipient_id            ← user who receives this notification
event_type              ← key from the catalog above
title                   ← localized title text (stored as-is at creation time)
body?                   ← optional detail text
data jsonb              ← context payload, e.g. { orderId, orderNumber, itemName }
link?                   ← in-app route to navigate to on click
is_read                 ← bool, default false
read_at?                ← timestamptz
created_at
```

### notification_preferences
Per-user, per-event-type opt-in/out. Missing rows → org defaults apply.
```
organization_id, user_id, event_type  ← PRIMARY KEY
in_app    bool
email     bool
```

### notification_org_defaults
Admin-controlled defaults for which events fire and who gets them.
```
organization_id, event_type  ← PRIMARY KEY
in_app_enabled   bool default true
email_enabled    bool default false
notify_roles     text[]  ← e.g. ['admin'] or ['admin', 'member']
```

---

## Triggering — How Notifications Are Created

Services call `notificationQueue.enqueue()` at the right moment, same pattern as `auditLog.queue()`:

```typescript
// Example inside orders.service.ts after creating an order:
notificationQueue.enqueue({
  tenant,
  eventType: 'order.created',
  data: { orderId: order.id, orderNumber: order.orderNumber, channel: order.channel },
  link: `/haraka/orders/${order.id}`,
})
```

There is no `titleKey`/localization mechanism — the notification title is either an explicit `titleOverride` passed by the caller or falls back to the catalog entry's (English-only) `label`.

`notificationQueue.enqueue()` (fire-and-forget, `lib/notifications/notification-queue.ts`) does:
1. Resolves which users in the org should receive this (from `notification_org_defaults` → role matching → `notification_preferences` overrides)
2. Inserts one row into `notifications` per recipient who wants the in-app channel
3. For each recipient who wants the email channel: calls `sendEmail()` — using the caller's `emailHtml`/`emailText`/`emailSubject` if provided, otherwise a generic auto-generated HTML template (`buildSimpleEmailHtml()`, not a per-category template)
4. Sends a Web Push notification to every recipient's registered devices via `sendWebPush()`

There is also an awaited variant, `notificationQueue.send()`, for callers (like cron jobs) that must finish before the serverless function is frozen.

---

## Permissions

Notification preferences are user-managed (no permission key needed for reading/writing own preferences). Org-level defaults are gated by a dedicated permission module, `settingsNotifications` (`view` / `update`), checked in `app/api/notification-org-defaults/route.ts` via `hasPermission(tenant, 'settingsNotifications', 'view'|'update')` — not `settings.orgInfo`, and not a reuse of an existing module as originally planned.

---

## UI

### Bell icon — AppHeader
- Appears in the top navigation bar for all authenticated users (org portal + superadmin portal)
- Shows a red badge with unread count (hidden when zero)
- Polling: `useNotifications()` with `staleTime: 15_000` (same as sessions hook)
- Clicking opens `NotificationPanel`

### NotificationPanel — slide-over or dropdown
- Lists recent notifications (newest first), max 50 shown
- Each item: icon (module-colored dot), title, body snippet, relative time, unread indicator
- Click on item → navigates to `notification.link`, marks as read
- "Mark all as read" button at the top
- "View all" → `/notifications` full list page

### Notifications List Page
**Route**: `/{locale}/{orgSlug}/notifications` (org-scoped, no space in URL)
- Full paginated list of all notifications for the current user
- Filters: unread only toggle (no event-type filter is implemented)
- "Mark all as read" button; no bulk-delete and no per-item delete (see Known Issues)

### User Notification Preferences & Org Notification Defaults
**Route**: `/{locale}/{orgSlug}/settings/notifications` (org-scoped) — a single page, not two
- Table of all event types grouped by module, with per-event toggles (In-app ✅/❌, Email ✅/❌), saved per user+org combination
- Also includes a push-subscription toggle (browser Web Push opt-in/out)
- Admin-only section on the same page controls the org-wide defaults and which roles receive each type

---

## Notification Hooks

Source: `hooks/notifications/index.ts`.

| Hook | Purpose |
|------|---------|
| `useNotifications(params?)` | List notifications (page, unreadOnly) |
| `useUnreadCount()` | Lightweight count for bell badge (polls every 30s) |
| `useMarkAsRead()` | Mutation — mark one as read |
| `useMarkAllAsRead()` | Mutation — mark all as read |
| `useNotificationPreferences()` | Get current user's preferences |
| `useUpdateNotificationPreferences()` | Save user preferences |
| `useOrgNotificationDefaults()` | Get org defaults (admin) |
| `useUpdateOrgNotificationDefaults()` | Save org defaults (admin) |

> Known issue: `useDeleteNotification()` does not exist — there is no delete-notification API route or mutation. The full list page also has no bulk-delete or event-type filter, despite both being described below.

---

## Email Templates

There is no per-category email-template system. `lib/notifications/notification-queue.ts` builds a generic HTML email inline (`buildSimpleEmailHtml()`) for any event whose caller didn't supply custom `emailHtml`/`emailText`. `lib/email/templates.ts` only defines a handful of hand-written templates unrelated to the generic notification catalog: `warrantyAlertEmail()`, `inviteEmail()`, `supportTicketNotificationEmail()`, `supportTicketReplyEmail()`.

---

## Cron Integration

The existing warranty alert cron (`/api/cron/warranty-alerts`) is time-based (expiry proximity), not action-triggered — the exception to the event-driven pattern. It already calls `notificationQueue.send()` (the awaited variant) in addition to sending email, so the in-app bell and push both show warranty expiry alerts.

---

## Navigation

- Bell icon in AppHeader (not a nav item — always visible)
- Settings → Notifications (`/settings/notifications`) hosts **both** the user's own channel preferences and, for admins, the org-wide defaults section on the same page — not two separate routes/tabs
- Full list: `/{locale}/{orgSlug}/notifications` (no sidebar entry — accessible from panel "View all")
