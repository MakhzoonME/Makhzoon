# 05 — Support: Ticketing

**Status: Working, two known bugs**

## What a user can see & do

- Org side: raise a ticket (subject + description), see a threaded conversation, reply, and close their own ticket.
- Makhzoon side: see every org's tickets, filter by org/status/priority, change status or priority, and reply.
- Email notifications fire on ticket creation and every reply, in both directions.

## Priorities & statuses

Four priorities (Low/Medium/High/Urgent) and four statuses (Open/In Progress/Resolved/Closed). These are fixed in the app today — an org admin cannot add or rename them.

## ClickUp / Activepieces integration

Every ticket event — created, status changed, or replied to, from either side — sends a signed notification out to an external automation URL Makhzoon staff configure. In practice this lets a new ticket automatically create a task in ClickUp, or a reply automatically update one, without anyone manually copying information over. It's a best-effort, one-shot delivery: if the receiving side is briefly down, that one event is simply lost rather than retried.

## Two real bugs

1. Whatever priority a customer picks when creating a ticket is silently discarded — every new ticket is saved as Medium regardless.
2. There's no ticket-assignment/ownership feature at all — tickets aren't handed to a specific support person, they're just a shared pool.
