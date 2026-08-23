# 03 — Haraka: POS & Transactions

**Status: Fully working**

Haraka is really two things: a base point-of-sale register that every org with Haraka gets, plus **four separately-priced sub-modules** an org can add on top. All four are real, working features — none are placeholders.

## The four sub-modules

| Sub-module | What it's for | Status |
|---|---|---|
| **Orders** (طلبات) | Phone / WhatsApp / Instagram sales that need to be confirmed, assigned to a delivery or pickup agent, and tracked to completion — including a public link a delivery driver can open with no login to update status and collect payment. | Working |
| **Service Jobs** (الخدمات) | For repair shops, salons, and field-service businesses — free-text service line items rather than inventory, moving from new → confirmed → in progress → done, invoiced once complete. | Working |
| **Retainers** (العقود) | Recurring billing contracts (monthly/quarterly/annual). A staff member manually generates each cycle's invoice — there's no automatic recurring billing, so a missed manual step means that cycle silently goes unbilled. | Working, manual billing |
| **Appointments** (المواعيد) | A real bookable calendar for clinics and providers, with conflict checking against working hours and existing bookings. This is the sub-module two recent fixes were specifically about — see note below. | Working |

**Recently fixed, worth flagging:** until very recently, an org that hadn't purchased the Appointments add-on could sometimes still reach it, because the toggle wasn't enforced everywhere — a real revenue-leakage gap. It's now closed and covered by an automated regression test, but it's worth knowing it existed until this recently.

## Base register (included for every Haraka org)

- Open a till with a starting cash float, scan or search to build a cart, attach a customer, apply discounts.
- Charge with split payment across cash / card / other in one sale.
- Close the till and see the discrepancy between expected and actual cash.
- Void a sale (only while the till is still open) or issue a full or partial refund (any time) — both restock inventory correctly.
- Discount approval: a cashier without approval rights needs a manager PIN, checked on the server — not just hidden in the UI.

## Also confirmed built (docs say otherwise)

Two internal planning documents still say "not started" for warranty certificates and card-terminal payments (Paymob, Square, SumUp) — both are actually fully implemented. The docs are stale, not the product; don't take those specific documents at face value.
