# 11 — Hardcoded vs. Configurable

Using Usool's asset statuses/locations/categories as the bar for "a Superadmin or org admin can change this without asking engineering" — here's how everything else measures up.

| Area | Today |
|---|---|
| Asset statuses / locations / categories (Usool) | **Configurable** — the reference standard this section is measured against |
| Subscription packages & module mapping | **Configurable** — full Superadmin screen, see [09 — Subscription-based module access](09-subscription-access.md) |
| Role definitions & default permissions | **Hardcoded** — the role list (Owner/Admin/Staff, Superadmin/Makhzoon Admin/Makhzoon Support) and what each defaults to is fixed in code. Individual users can be adjusted, but the roles and their starting defaults cannot. |
| Support ticket priorities & statuses | **Hardcoded** — fixed four-value lists, not editable by anyone |
| Request types | Not applicable — the module doesn't exist, see [04 — Requests](04-requests.md) |
| Maintenance event types (Usool) | **Configurable** — same managed-list mechanism as asset statuses |
| Inventory units & storage locations (Raseed) | **Configurable** — org-extensible |

## The clearest candidate to fix

Role definitions and their default permissions are the one area that arguably should follow the same pattern as asset statuses and support priorities — right now, changing what a default Staff or Admin account can do requires an engineering change, while individual per-user exceptions can already be made through the UI. Support ticket priorities/statuses are a smaller, lower-stakes version of the same pattern.
