# 04 — Requests: Approval Workflow

**Status: Not built (was removed)**

This isn't a partially-built feature — it doesn't exist right now. A Requests module (staff submit a request to refill stock, retire an asset, buy something new, or extend a warranty; an admin approves or rejects it) was built at one point and then intentionally deleted from the product before the current branch. There is no page, no API, no notification, and no permission for it today.

## What's left behind

A handful of harmless leftovers from the removal: an unused database table, an unused "reorder quantity" field on inventory items, a couple of audit-log entry types that nothing fires anymore, and a delete-safety check on inventory that still references "open requests" even though none can ever exist. None of this affects users — it's just cleanup debt.

## Implication

Because the permission model and data structures have moved on since it was removed, bringing Requests back is realistically a **new build**, not a revert.
