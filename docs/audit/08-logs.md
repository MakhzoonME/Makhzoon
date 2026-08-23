# 08 — Logs: Audit Trail

**Status: Working, one gap for org admins**

## What's logged & who sees it

Every meaningful change across the app — asset, inventory, sale, user, and settings changes — is written to an immutable log capturing who, what, before/after values, and when. Org admins see their own org's activity (scoped to one location or the whole org), with search, filters, and a detail view showing exactly what changed. Staff cannot access this at all. Makhzoon staff see every org's logs in one place.

## Gap: no self-service export

An org admin can view and filter their own audit trail but cannot download it. Exporting is restricted to Makhzoon staff only — the opposite of what the internal documentation currently describes. There's also no retention/cleanup policy anywhere, so log volume will grow indefinitely.
