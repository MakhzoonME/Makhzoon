# Support Tickets

**Feature key**: `support`

---

## Overview

In-app support ticketing allows org users to submit support requests directly to the Makhzoon support team. Tickets are thread-based; both sides can reply. The Makhzoon team manages tickets from the superadmin portal.

---

## Data Model

DB tables: `support_tickets`, `ticket_messages` (`supabase/migrations/0005_modules.sql`). `status`/`priority` are plain `text` columns with DB defaults, validated only at the Zod layer (`lib/validations/support-ticket.schema.ts`), not real DB enums.

```
support_tickets
  id, organization_id
  subject (required, 5-200 chars), description (required, 20-5000 chars)
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  created_by, created_at, updated_at, updated_by
  resolved_at, resolved_by

ticket_messages
  id, ticket_id, organization_id (denormalized)
  body (required, 1-2000 chars)
  author_id, author_name, author_role
  created_at
```

---

## Status Lifecycle

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
```

Status is primarily managed by the Makhzoon support team, but org users can also close their own ticket (`supportTicketOrgUpdateSchema` allows `status: 'CLOSED'` via `PATCH /api/support/[ticketId]`).

---

## Notifications

- **Email** (via Resend): sent on ticket creation and on every reply. Org-side actions (create, reply) email `info@makhzoon.me` / `support@makhzoon.me`; superadmin replies and status changes email the org's admins.
- **In-app notifications**: superadmin replies and status changes enqueue notification events `support.ticket_replied` and `support.ticket_status_changed`.

---

## Org Portal

### Ticket List
**Route**: `/{locale}/{orgSlug}/{space}/support`

**Layout**:
- `PageHeader` with "Support" + "New Ticket" button (gated by `support.create`).
- `FilterBar`: search by subject, status filter, priority filter.
- `DataTable` with columns:
  - Subject
  - Status badge (color-coded: OPEN = blue, IN_PROGRESS = amber, RESOLVED = green, CLOSED = gray)
  - Priority badge (LOW = gray, MEDIUM = blue, HIGH = orange, URGENT = red)
  - Created At
  - Last Updated
  - Action: View

**Empty state**: "No tickets yet. Submit a ticket if you need help."

### Ticket Detail / Thread
**Route**: `/{locale}/{orgSlug}/{space}/support/[ticketId]`

**Layout**:
- Ticket header: Subject, Status badge, Priority badge, Created by, Created at.
- Thread messages listed in chronological order:
  - Each message shows: author avatar, author name, role badge (org user vs. Makhzoon support), timestamp, message body.
  - Makhzoon support messages have a distinct background color to differentiate them.
- Reply textarea at the bottom + "Send Reply" button (gated by `support.create`).
- Replies are added as `TicketMessage` records.

### Create Ticket
**Route**: Via modal triggered from the list page or "New Ticket" button.

**Form**:
- Subject (required)
- Priority (dropdown: LOW / MEDIUM / HIGH / URGENT)
- Description (required textarea — describe the issue with as much detail as possible)

Footer: Cancel + Submit. Ticket is created with status `OPEN`.

---

## Superadmin Support Queue

**Route**: `/{locale}/superadmin/support`

The Makhzoon support team sees all tickets across all organizations.

**Layout**:
- `PageHeader` "Support Tickets".
- `FilterBar`: search by subject or org name, status filter, priority filter, org filter (`GET /api/support?orgId=...`, also supports `page`/`pageSize`/`sortBy`/`sortDir`).
- `DataTable` with columns:
  - Organization
  - Subject
  - Status badge
  - Priority badge
  - Created By
  - Created At
  - Last Activity
  - Action: Open Ticket

> Note: there is no ticket-assignment feature. No `assignedTo` column, API field, or UI action exists — the admin update schema only allows changing `status`/`priority`.

**Ticket Detail (superadmin)**:
- Same thread view as org portal.
- Additional actions:
  - Change Status (OPEN → IN_PROGRESS → RESOLVED → CLOSED).
  - Change Priority.
- Superadmin replies appear with the "Makhzoon Support" label.

---

## Permissions

Org-side (`types/user-permissions.types.ts`), enforced via `requirePermission`/`hasPermission`:

| Key | Description |
|-----|-------------|
| `support.view` | View own tickets |
| `support.viewOthers` | View other org members' tickets |
| `support.submit` | Create a new ticket |
| `support.replyOwn` | Reply on own tickets |
| `support.replyOthers` | Reply on other org members' tickets |

> Known issue: `app/api/support/route.ts` and `lib/modules/support/services/support.service.ts` call `requirePermission(user, 'support', 'create')` / `hasPermission(tenant, 'support', 'create')`, but `create` is not a key defined in the permission catalog above (the closest is `submit`). This check may not behave as intended and should be reviewed.

Superadmin-side (`lib/permissions/superadmin.ts`, `types/superadmin-permissions.types.ts`) is a separate permission set:

| Key | Description |
|-----|-------------|
| `support.view` | View all orgs' tickets |
| `support.respond` | Reply to tickets, change status/priority |
| `support.close` | Close tickets |

Recognized superadmin roles for support access: `super_admin`, `makhzoon_admin`, `makhzoon_support`.

---

## Known Issues

- **Priority ignored on ticket creation**: the create form/API accept a `priority`, and it's even used correctly in the confirmation email text, but `createSupportTicket()` (`lib/db/support-tickets.ts`) hardcodes `priority: 'MEDIUM'` regardless of what was submitted. The same gap exists in an apparently-unused duplicate service layer at `lib/modules/support/services/support.service.ts`.
- **`support.create` permission key mismatch** — see Permissions section above.
