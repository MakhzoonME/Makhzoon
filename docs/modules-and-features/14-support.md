# Support Tickets

**Feature key**: `support`

---

## Overview

In-app support ticketing allows org users to submit support requests directly to the Makhzoon support team. Tickets are thread-based; both sides can reply. The Makhzoon team manages tickets from the superadmin portal.

---

## Data Model

```
SupportTicket
  id, organizationId
  subject (required), description (required)
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  createdBy, createdAt, updatedAt

TicketMessage
  id, ticketId, body
  authorId, authorName, authorRole
  createdAt
```

---

## Status Lifecycle

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
```

Status is managed by the Makhzoon support team. Org users can view status but not change it.

---

## Org Portal

### Ticket List
**Route**: `/{locale}/{orgSlug}/support`

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
**Route**: `/{locale}/{orgSlug}/support/[ticketId]`

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
- `FilterBar`: search by subject or org name, status filter, priority filter, org filter.
- `DataTable` with columns:
  - Organization
  - Subject
  - Status badge
  - Priority badge
  - Created By
  - Created At
  - Last Activity
  - Assigned To (Makhzoon team member)
  - Action: Open Ticket

**Ticket Detail (superadmin)**:
- Same thread view as org portal.
- Additional actions:
  - Change Status (OPEN → IN_PROGRESS → RESOLVED → CLOSED).
  - Change Priority.
  - Assign to a team member.
- Superadmin replies appear with the "Makhzoon Support" label.

---

## Permissions

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `support.view` | ✅ | ✅ | View tickets (own org) |
| `support.create` | ✅ | ✅ | Submit tickets and reply |
