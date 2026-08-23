# Haraka — Discount Approval (موافقة الخصم)

**Parent module**: Haraka (حركة) — Feature key: `pos`
**Permission keys**: `haraka.applyDiscount` (apply a discount to a receipt), `haraka.approveDiscount` (set/hold a PIN and self-approve own discounts)
**Brand color**: `#C2185B` (inherited from Haraka)

---

## Overview

Discount approval is a PIN-gated control on POS checkout: any cashier who holds `applyDiscount` can put a discount on a line, but the sale can only complete if the discount is *approved* by someone holding `approveDiscount`.

- There is no threshold/amount logic — approval is required whenever **any** cart line has `discount > 0`, regardless of size. It is purely role-based, not amount-based.
- Each approver sets their **own** 4-digit PIN (bcrypt-hashed) from their profile page. Cashiers do not have PINs.
- If the cashier applying the discount *already* holds `approveDiscount`, the sale self-approves — no PIN prompt, the cashier is recorded as their own approver.
- Otherwise, checkout is blocked with `403 DISCOUNT_APPROVAL_REQUIRED` until a valid approver PIN is supplied. The register UI catches this and pops a PIN-entry dialog; the cashier hands the device to an approver (or asks them for the PIN) and retries the sale with `approverPin` attached.
- A submitted PIN is checked against **every current approver's PIN** in the org (not a specific named approver) — first match wins.
- There is no persistent "approval request" record/queue — this is a synchronous checkout gate, not an async workflow. The only durable trace is on the completed transaction itself (`discount_approved_by`, `discount_approved_by_name`).
- PIN collisions are rejected: when an approver sets a PIN, it must not match any other current approver's PIN in the org (`409` if it does).

---

## Data Models

### `users.discount_pin_hash` (column, not a separate table)
```
discount_pin_hash   text, nullable   ← bcrypt hash of the approver's own 4-digit PIN
```
Set/cleared via `PUT /api/haraka/discount-approval/pin`. No separate "approver" table — anyone with `haraka.approveDiscount` who has set a hash is eligible.

### `pos_transactions` (added columns)
```
discount_approved_by        uuid, references users(id) on delete set null
discount_approved_by_name   text        ← snapshot of approver's display name at sale time
```
Populated only when the sale contains a discounted line; both null otherwise. Set inside `haraka_complete_sale` (the same SECURITY DEFINER RPC used for all POS sale completion).

---

## Approval Flow (not a status machine)

There is no multi-step approval status (`pending` → `approved` → ...). It is a single synchronous gate evaluated at `POST` sale-completion time:

```
cart has discount line?
 ├─ no  → complete sale normally
 └─ yes → cashier holds approveDiscount?
           ├─ yes → self-approve (discount_approved_by = cashier)
           └─ no  → approverPin supplied and matches an approver's PIN?
                     ├─ yes → approve (discount_approved_by = matching approver)
                     └─ no  → 403 DISCOUNT_APPROVAL_REQUIRED → client shows PIN dialog → retry
```
Logic lives in `TransactionsService.completeSale()` (`lib/modules/haraka/transactions/transactions.service.ts`).

---

## Key Files

| Layer | Path |
|---|---|
| DB migration | `supabase/migrations/0056_discount_approval.sql` |
| Schema | `lib/modules/haraka/discount-approval/schemas.ts` — `setDiscountPinSchema` |
| Repository | `lib/modules/haraka/discount-approval/discount-approval.repository.ts` |
| Service | `lib/modules/haraka/discount-approval/discount-approval.service.ts` |
| Sale-completion integration | `lib/modules/haraka/transactions/transactions.service.ts` (`completeSale`) |
| API — PIN get/set | `app/api/haraka/discount-approval/pin/route.ts` |
| Hook | `hooks/haraka/useDiscountApproval.ts` — `useDiscountApprovalPin`, `useSetDiscountApprovalPin` |
| PIN-entry dialog (checkout) | `components/haraka/DiscountApprovalPinDialog.tsx` |
| Register/checkout integration | `app/[locale]/[orgSlug]/[space]/haraka/sessions/[sessionId]/register/page.tsx` |
| PIN self-management UI | `app/[locale]/[orgSlug]/profile/page.tsx` ("Discount Approval PIN" section, shown only when `approveDiscount` held) |
| Permission definitions | `types/user-permissions.types.ts` (`applyDiscount`, `approveDiscount` under the `haraka` module) |

---

## Permissions

| Key | Gates |
|---|---|
| `haraka.applyDiscount` | Applying a non-zero discount to a cart line at checkout. Requires `chargeReceipt`. |
| `haraka.approveDiscount` | Setting/clearing your own PIN (`PUT /api/haraka/discount-approval/pin`); self-approving your own discounted sales without a PIN prompt; your PIN being eligible to approve other cashiers' discounted sales. Requires `chargeReceipt`. |

The API route additionally gates on `requireFeature(tenant, 'pos')` and rate-limits PIN changes to 10/min per tenant (`rateLimitTenant(tenant, 'discount-pin-set', 10, 60_000)`).

Two separate `hasPermission` helpers are used across this feature: `lib/platform/permissions` (operates on `TenantContext`, used in the service and in `transactions.service.ts`) and `lib/permissions` (operates on an `AuthUser`-shaped row, used in the repository to filter the `users` table when computing the approver list). Both check the same `haraka.approveDiscount` key — this is an existing split in the codebase, not specific to this feature.

---

## Notes / Observations

- No managed list — this feature has no status/enum driven by a lists table.
- No dedicated "approval log" — approvals are only traceable via the two columns on `pos_transactions`; there's no audit trail of *rejected* PIN attempts.
- PIN is 4 digits only (`^\d{4}$`), enforced both client-side (`DiscountApprovalPinDialog`, profile form) and via `setDiscountPinSchema` server-side.
