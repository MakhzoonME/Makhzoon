# Notifications System — Implementation Plan

> Feature doc lives in `docs/modules-and-features/21-notifications.md`.
> Pick up from here. Check off each item as it is completed.

---

## Status: ⬜ Not started

---

## Before you start — read these

- `docs/modules-and-features/21-notifications.md` — full feature spec and architecture decisions
- `lib/platform/audit/index.ts` — the `auditLog.queue()` pattern to copy exactly for `notificationQueue.enqueue()`
- `lib/email/resend.ts` + `lib/email/templates.ts` — existing email infrastructure
- `lib/platform/events/event-bus.ts` — event bus (already emitting events; do NOT add event-bus subscribers for notifications — see architecture note in feature doc)
- `lib/modules/haraka/transactions/transactions.service.ts` — example of a service that does both `auditLog.queue()` and `eventBus.emit()` — add `notificationQueue.enqueue()` in the same way
- `hooks/haraka/useTransactions.ts` — polling pattern with `staleTime` to copy for `useNotifications`
- `components/layout/AppSidebar.tsx` — where to add the bell icon

---

## 1. Database

- [ ] `supabase/migrations/0019_notifications.sql`

  **`notifications` table**:
  ```sql
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
  space_id text  -- nullable
  recipient_id uuid NOT NULL  -- user who receives this
  event_type text NOT NULL    -- key from catalog, e.g. 'order.created'
  title text NOT NULL         -- stored at creation time (no i18n lookup at read time)
  body text                   -- optional detail
  data jsonb NOT NULL DEFAULT '{}'  -- e.g. { orderId, orderNumber, itemName }
  link text                   -- in-app route, e.g. '/haraka/orders/xxx'
  is_read boolean NOT NULL DEFAULT false
  read_at timestamptz
  created_at timestamptz NOT NULL DEFAULT now()
  ```
  Indexes: `(organization_id, recipient_id, is_read, created_at DESC)`, `(organization_id, recipient_id, created_at DESC)`

  **`notification_preferences` table**:
  ```sql
  organization_id uuid NOT NULL
  user_id uuid NOT NULL
  event_type text NOT NULL
  in_app boolean NOT NULL DEFAULT true
  email boolean NOT NULL DEFAULT false
  PRIMARY KEY (organization_id, user_id, event_type)
  ```

  **`notification_org_defaults` table**:
  ```sql
  organization_id uuid NOT NULL
  event_type text NOT NULL
  in_app_enabled boolean NOT NULL DEFAULT true
  email_enabled boolean NOT NULL DEFAULT false
  notify_roles text[] NOT NULL DEFAULT '{admin}'
  PRIMARY KEY (organization_id, event_type)
  ```

  **RLS**:
  - `notifications`: users can SELECT/UPDATE their own rows (`recipient_id = auth.uid()`); platform admins see all
  - `notification_preferences`: users can SELECT/UPDATE their own rows; org managers see all
  - `notification_org_defaults`: org managers can manage; staff can SELECT

---

## 2. Notification Event Catalog

- [ ] `lib/notifications/catalog.ts`
  - Define the `NotificationEventType` union type (all string literals from the catalog in the feature doc)
  - Define `NotificationCatalogEntry` interface: `{ key, labelKey, defaultRoles, defaultInApp, defaultEmail, module }`
  - Export `NOTIFICATION_CATALOG: NotificationCatalogEntry[]` — full list of all event types with defaults
  - Export `NOTIFICATION_EVENT_TYPES` as a readonly array for runtime validation
  - This file is imported by the preferences UI and by `notificationQueue.enqueue()` for validation

---

## 3. Core Queue (the heart of the system)

- [ ] `lib/notifications/notification-queue.ts`
  - Export `notificationQueue` singleton (same pattern as `auditLog`)
  - `enqueue(input: NotificationEnqueueInput): void` — fire-and-forget (never throws to caller)
    - Input shape:
      ```typescript
      {
        tenant: TenantContext
        eventType: NotificationEventType
        data: Record<string, unknown>   // e.g. { orderId, orderNumber }
        link?: string                    // in-app route
        titleOverride?: string           // when title needs runtime interpolation
        recipientIds?: string[]          // explicit recipients (skips role-based fanout)
      }
      ```
    - Internally calls `_send()` in an unhandled promise (same as `auditLog.queue()`)
  - `_send(input)` async internal method:
    1. If `recipientIds` provided: use those. Otherwise: resolve recipients from `notification_org_defaults` (which roles) + fetch org members with those roles
    2. For each recipient: check `notification_preferences` (user override) or fall back to org default
    3. Bulk-insert `notifications` rows for in-app channel
    4. For email channel: call the appropriate email template + `sendEmail()`
    5. Errors are caught and logged (`console.error`) — never rethrown

- [ ] `lib/notifications/types.ts`
  - `NotificationEnqueueInput` — input to `notificationQueue.enqueue()`
  - `NotificationRow` — DB row shape
  - `NotificationPreference` — preference row shape
  - `OrgNotificationDefault` — org default row shape

- [ ] `lib/notifications/resolve-recipients.ts`
  - `resolveRecipients(tenant, eventType, orgMembers): string[]`
  - Looks up `notification_org_defaults` for the org + event type
  - Filters org members by `notify_roles`
  - Returns array of user IDs

---

## 4. Email Templates

- [ ] Add to `lib/email/templates.ts`:
  - `orderNotificationEmail({ eventType, orderNumber, customerName, status?, orgName, link })` → `{ subject, html, text }`
  - `inventoryAlertEmail({ eventType, itemName, currentStock?, orgName, link })` → `{ subject, html, text }`
  - `posAlertEmail({ eventType, receiptNumber?, cashierName?, amount?, orgName, link })` → `{ subject, html, text }`
  - `requestNotificationEmail({ eventType, requesterName?, requestType?, orgName, link })` → `{ subject, html, text }`
  - `systemAlertEmail({ eventType, detail, orgName, link })` → `{ subject, html, text }`
  - `userActivityEmail({ eventType, userName, orgName })` → `{ subject, html, text }`

---

## 5. Wire Notifications Into Existing Services

Add `notificationQueue.enqueue(...)` calls to each service. Do NOT change anything else in the service — just add one call after the existing `auditLog.queue()` call.

- [ ] `lib/modules/haraka/orders/orders.service.ts`
  - `create()` → enqueue `order.created`
  - `updateStatus()` → enqueue `order.status_changed`; if agent assigned → also `order.assigned_to_you` (recipientIds: the delivery agent)
  - `recordPayment()` → enqueue `order.payment_recorded`

- [ ] `lib/modules/haraka/transactions/transactions.service.ts`
  - `voidSale()` → enqueue `pos.sale_voided`
  - `refundSale()` → enqueue `pos.refund_issued`

- [ ] `lib/modules/haraka/sessions/sessions.service.ts`
  - `close()` → enqueue `pos.session_closed`

- [ ] `lib/modules/inventory/services/inventory.service.ts`
  - After a stock-OUT transaction: check if `quantityAfter <= minimumThreshold` → enqueue `inventory.low_stock`
  - After a stock-OUT transaction: check if `quantityAfter === 0` → enqueue `inventory.out_of_stock`

- [ ] `lib/modules/inventory/purchases/purchases.service.ts`
  - `receive()` → enqueue `inventory.purchase_received`

- [ ] `lib/modules/inventory/services/stock-audit.service.ts`
  - `complete()` → enqueue `inventory.audit_completed`

- [ ] `lib/modules/requests/` (find the requests service)
  - `create()` → enqueue `requests.submitted` (to admin roles)
  - `approve()` → enqueue `requests.approved` (recipientIds: requester)
  - `reject()` → enqueue `requests.rejected` (recipientIds: requester)

- [ ] User invite / join flow (find the relevant service)
  - `inviteUser()` → enqueue `users.invited`
  - `acceptInvite()` → enqueue `users.joined`

- [ ] `lib/modules/haraka/fawtara/service.ts`
  - On failed submission → enqueue `fawtara.failed`

- [ ] `app/api/cron/warranty-alerts/route.ts`
  - After sending emails: also write `notifications` rows for each admin (in-app channel) so the bell shows warranty alerts too

---

## 6. API Routes

- [ ] `app/api/notifications/route.ts` — GET list
  - Query params: `page`, `pageSize`, `unreadOnly`
  - Returns paginated list for the current user (from `resolveTenant().userId`)
  - Sorted by `created_at DESC`

- [ ] `app/api/notifications/unread-count/route.ts` — GET unread count
  - Returns `{ count: number }` — used by the bell badge (lightweight, frequent polling)

- [ ] `app/api/notifications/[notificationId]/read/route.ts` — POST mark as read
  - Sets `is_read = true`, `read_at = now()` for the current user's notification

- [ ] `app/api/notifications/read-all/route.ts` — POST mark all as read
  - Bulk-update all unread for `recipient_id = currentUser`

- [ ] `app/api/notifications/[notificationId]/route.ts` — DELETE

- [ ] `app/api/notification-preferences/route.ts` — GET + PATCH
  - GET: returns all preferences for current user in this org (missing rows = use org defaults)
  - PATCH: upsert one or more preferences `{ eventType, inApp, email }[]`

- [ ] `app/api/notification-org-defaults/route.ts` — GET + PATCH (admin only)
  - GET: returns org defaults (fills in catalog defaults for event types with no row)
  - PATCH: upsert one or more defaults `{ eventType, inAppEnabled, emailEnabled, notifyRoles }[]`

---

## 7. Hooks

- [ ] `hooks/notifications/useNotifications.ts`
  - `useNotifications(params?)` — `{ unreadOnly?, page?, pageSize? }` → list
  - `useUnreadCount()` — polls every 30s for the bell badge count
  - `useMarkAsRead()` — mutation
  - `useMarkAllAsRead()` — mutation
  - `useDeleteNotification()` — mutation

- [ ] `hooks/notifications/useNotificationPreferences.ts`
  - `useNotificationPreferences()` — current user's preferences
  - `useUpdateNotificationPreferences()` — mutation

- [ ] `hooks/notifications/useOrgNotificationDefaults.ts`
  - `useOrgNotificationDefaults()` — org-level defaults (admin)
  - `useUpdateOrgNotificationDefaults()` — mutation

- [ ] `hooks/notifications/index.ts` — re-exports

---

## 8. UI Components

- [ ] `components/notifications/NotificationBell.tsx`
  - Bell icon button for AppHeader
  - Uses `useUnreadCount()` — shows red badge with count when > 0
  - Clicking toggles `NotificationPanel`

- [ ] `components/notifications/NotificationPanel.tsx`
  - Popover/sheet showing recent notifications (last 20)
  - Uses `useNotifications({ pageSize: 20 })`
  - Each row: module-color dot, title, body snippet, relative time, unread indicator
  - Clicking a row: navigate to `notification.link`, call `useMarkAsRead()`
  - Header: "Notifications" title + "Mark all read" button
  - Footer: "View all" link → `/[locale]/[orgSlug]/notifications`

- [ ] `components/notifications/NotificationItem.tsx`
  - Single notification row (used in both panel and list page)

---

## 9. Pages

- [ ] Add bell to AppHeader
  - Modify `components/layout/AppSidebar.tsx` or the header component to include `<NotificationBell />`

- [ ] `app/[locale]/[orgSlug]/notifications/page.tsx` — **full list** (org-scoped, no space)
  - DataTable: icon, title, body, date, read/unread
  - Filter: unread only toggle, event type select
  - Bulk: mark selected as read, delete selected
  - No sidebar nav entry — accessed via "View all" in the panel

- [ ] `app/[locale]/[orgSlug]/settings/notifications/page.tsx` — **user preferences**
  - Grouped by module (Haraka, Inventory, Requests, etc.)
  - For each event type: label, In-app toggle, Email toggle
  - Shows org default when user has no override ("Using org default")
  - Saves via `useUpdateNotificationPreferences()`
  - Add this page to the Settings group in `lib/nav/index.ts`

- [ ] `app/[locale]/[orgSlug]/settings/organization/page.tsx` (or a sub-tab) — **org defaults** section
  - Admin-only section within org settings (or a dedicated `/settings/notification-defaults` page)
  - Same table as user preferences but controls org-wide defaults + notify_roles column
  - Saves via `useUpdateOrgNotificationDefaults()`

---

## 10. Navigation + i18n

- [ ] `lib/nav/index.ts`
  - Add to Settings group (org-scoped):
    ```typescript
    { href: '/settings/notifications', label: 'Notifications', labelKey: 'nav.notificationSettings', scope: 'org' }
    ```

- [ ] `locales/messages.ts` — add keys (EN + AR):
  - `nav.notificationSettings` / `'Notification Settings'` / `'إعدادات الإشعارات'`
  - `nav.allNotifications` / `'All Notifications'` / `'كل الإشعارات'`
  - `notifications.markAllRead` / `'Mark all as read'` / `'تحديد الكل كمقروء'`
  - `notifications.noNotifications` / `'No notifications yet.'` / `'لا توجد إشعارات بعد.'`
  - `notifications.viewAll` / `'View all'` / `'عرض الكل'`
  - `notifications.preferences` / `'Notification Preferences'` / `'تفضيلات الإشعارات'`
  - `notifications.orgDefaults` / `'Organization Defaults'` / `'الإعدادات الافتراضية للمنظمة'`
  - One key per event type label, e.g.:
    - `notificationEvent.order.created` / `'New order received'` / `'طلب جديد'`
    - `notificationEvent.inventory.low_stock` / `'Item stock is low'` / `'مخزون منخفض'`
    - ... (full list in feature doc)

---

## Notes for the next developer

- **Architecture decision**: Do NOT use the EventBus for notification subscriptions. Next.js serverless functions are stateless — `.on()` subscribers don't persist between requests. Use `notificationQueue.enqueue()` directly in services instead, exactly like `auditLog.queue()`. See `lib/platform/audit/index.ts` for the exact pattern to copy.

- **The `notifications` table is append-only**: Never update a notification row except to set `is_read` / `read_at`. Do not edit `title`, `body`, or `data` after creation.

- **Missing preference row = use org default**: The `notification_preferences` table only has rows where the user has explicitly overridden the default. If no row exists for a user+eventType, fall back to `notification_org_defaults`, then fall back to the catalog default.

- **Recipient resolution is the trickiest part**: `resolve-recipients.ts` needs to query org members by role. Look at how `lib/db/users.ts` fetches org members — use the same query. The `notify_roles` column in `notification_org_defaults` is a text array like `['admin']` or `['admin', 'member']`.

- **The bell badge must be lightweight**: `useUnreadCount()` should hit a dedicated `/api/notifications/unread-count` endpoint that does a single `COUNT(*)` query, not a full list fetch. Poll every 30 seconds.

- **Email is fire-and-forget**: `sendEmail()` failures inside `_send()` should be caught and logged, never thrown. The notification row is still written to the DB even if email fails.

- **The warranty alert cron** (`/api/cron/warranty-alerts`) already sends emails — extend it to also write `notifications` rows (in-app channel) for each recipient admin. The `event_type` for these should be `'warranty.expiring'`.

- **Superadmin portal**: The bell icon should also appear in the superadmin layout (it's a separate layout at `app/[locale]/superadmin/layout.tsx`). Superadmin notifications are platform-level (support tickets, new org signups, etc.) — these can be added in a follow-up but plan for the bell component to be reusable in both layouts.

- **i18n for notification titles**: Notification `title` is stored as a plain string at creation time (English only for v1). Store the title in the language of the org at the time of creation. Do not store i18n keys — that would require a lookup at read time. If bilingual support is needed later, store `{ en, ar }` in the `data` jsonb field.
