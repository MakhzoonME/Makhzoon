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
| **Email** | Existing Resend integration + new templates | Async, fire-and-forget |
| **Push** *(future)* | Web Push API / mobile | Explicitly out of scope for v1; data model is designed to accommodate it |

### Architecture decision — service-layer fanout, not event bus

The existing `EventBus` is in-memory and unreliable in Next.js serverless (each request is a new process, so `.on()` subscribers don't persist). The notification system instead follows the same pattern as `auditLog.queue()`: services call `notificationQueue.enqueue()` directly — a fire-and-forget async function that writes to the DB and optionally sends email. This is the proven pattern already in use.

---

## Notification Event Catalog

Each event type has a fixed `key`, a human label, which roles receive it by default, and default channel settings. Org admins can override all defaults.

| key | Label | Default recipients | In-app | Email |
|-----|-------|--------------------|--------|-------|
| `order.created` | New order received | admin | ✅ | ❌ |
| `order.status_changed` | Order status updated | admin | ✅ | ❌ |
| `order.assigned_to_you` | Order assigned to you | assigned agent | ✅ | ✅ |
| `order.payment_recorded` | Payment recorded on order | admin | ✅ | ❌ |
| `pos.session_closed` | POS session closed | admin | ✅ | ❌ |
| `pos.refund_issued` | Refund issued | admin | ✅ | ✅ |
| `pos.sale_voided` | Sale voided | admin | ✅ | ✅ |
| `inventory.low_stock` | Item stock is low | admin | ✅ | ✅ |
| `inventory.out_of_stock` | Item is out of stock | admin | ✅ | ✅ |
| `inventory.purchase_received` | Purchase received (stock-in) | admin | ✅ | ❌ |
| `inventory.audit_completed` | Stock audit completed | admin | ✅ | ❌ |
| `requests.submitted` | New request submitted | admin | ✅ | ✅ |
| `requests.approved` | Your request was approved | requester | ✅ | ✅ |
| `requests.rejected` | Your request was rejected | requester | ✅ | ✅ |
| `users.invited` | New user invited | admin | ✅ | ❌ |
| `users.joined` | New user joined org | admin | ✅ | ❌ |
| `warranty.expiring` | Warranty expiring soon | admin | ✅ | ✅ |
| `subscription.expiring` | Subscription expiring | admin | ✅ | ✅ |
| `fawtara.failed` | Fawtara submission failed | admin | ✅ | ✅ |

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
  titleKey: 'notification.order.created',
})
```

`notificationQueue.enqueue()` (fire-and-forget) does:
1. Resolves which users in the org should receive this (from `notification_org_defaults` → role matching → `notification_preferences` overrides)
2. Inserts one row into `notifications` per recipient
3. For each recipient where email is enabled: calls `sendEmail()` with the appropriate template

---

## Permissions

Notification preferences are user-managed (no new permission key needed for reading own notifications). Org-level defaults require `settings.orgInfo`.

No new permission module — reuses existing `settings` permission.

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
- Filters: unread only toggle, event type
- Bulk mark-as-read, bulk delete

### User Notification Preferences
**Route**: `/{locale}/{orgSlug}/settings/notifications` (org-scoped)
- Table of all event types grouped by module
- Per-event toggles: In-app ✅/❌, Email ✅/❌
- Saved per user+org combination

### Org Notification Defaults
**Route**: Part of `/{locale}/{orgSlug}/settings/organization` or a dedicated tab
- Admin-only section
- Same event-type table but controls the org-wide defaults and which roles receive each type

---

## Notification Hooks

| Hook | Purpose |
|------|---------|
| `useNotifications(params?)` | List notifications (page, unreadOnly) |
| `useUnreadCount()` | Lightweight count for bell badge (polls frequently) |
| `useMarkAsRead()` | Mutation — mark one as read |
| `useMarkAllAsRead()` | Mutation — mark all as read |
| `useDeleteNotification()` | Mutation — delete one |
| `useNotificationPreferences()` | Get current user's preferences |
| `useUpdateNotificationPreferences()` | Save user preferences |
| `useOrgNotificationDefaults()` | Get org defaults (admin) |
| `useUpdateOrgNotificationDefaults()` | Save org defaults (admin) |

---

## Email Templates (additions to `lib/email/templates.ts`)

One template per notification category (not one per event type — grouped by urgency/format):

| Template function | Used for |
|-------------------|---------|
| `orderNotificationEmail()` | order.created, order.status_changed, order.assigned_to_you |
| `inventoryAlertEmail()` | low_stock, out_of_stock, purchase_received, audit_completed |
| `posAlertEmail()` | refund_issued, sale_voided, session_closed |
| `requestNotificationEmail()` | requests.submitted, requests.approved, requests.rejected |
| `systemAlertEmail()` | fawtara.failed, subscription.expiring |
| `userActivityEmail()` | users.invited, users.joined |

The existing `warrantyAlertEmail()` is kept as-is (cron-based batch, not event-driven).

---

## Cron Integration

The existing warranty alert cron (`/api/cron/warranty-alerts`) stays as-is. It is the exception to the event-driven pattern because it is time-based (expiry proximity), not action-triggered. It should be extended to also write rows into the `notifications` table in addition to sending email, so the in-app bell also shows warranty expiry alerts.

---

## Navigation

- Bell icon in AppHeader (not a nav item — always visible)
- User preferences: add `{ href: '/settings/notifications', labelKey: 'nav.notifications', scope: 'org' }` to Settings group
- Full list: `{ href: '/notifications', labelKey: 'nav.allNotifications', scope: 'org' }` (no sidebar entry — accessible from panel "View all")
