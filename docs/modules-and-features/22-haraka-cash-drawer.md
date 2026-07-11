# Haraka — Cash Drawer (درج النقد)

**Parent module**: Haraka (حركة) — Feature key: `pos`
**Brand color**: `#C2185B` (inherited from Haraka)

---

## Overview

The Cash Drawer feature lets cashiers open a connected cash drawer directly from the POS register. The drawer is physically connected to the receipt printer's RJ11/RJ12 port and triggered via the ESC/POS `ESC p m t1 t2` command over the existing WebUSB printer connection.

Two triggering modes:
1. **Auto-open on cash sale** — the drawer kicks automatically after any sale that includes a cash payment.
2. **Manual open button** — a button in the register toolbar that can optionally require a PIN before sending the kick command.

All behaviour is org-wide and configured from **Settings → Cash Drawer**.

---

## ESC/POS Kick Command

```
ESC  p   m   t1   t2
1Bh 70h  m   t1   t2

m  = 0 (drawer port 0, RJ11 pin 2) | 1 (drawer port 1, RJ11 pin 5)
t1 = on-pulse duration (t1 × 2 ms, range 1–255) — how long the solenoid fires
t2 = off-time duration (t2 × 2 ms, range 1–255) — recovery time before next trigger
```

The command is sent through the same WebUSB `printRaw()` function used for receipts. If no printer is paired, the button shows a "No printer paired" error.

---

## Data Model

### haraka_cash_drawer_config (one row per org)

```
organization_id   ← PRIMARY KEY
enabled           bool   — master on/off
auto_open_on_cash bool   — kick after any cash payment on a completed sale
require_pin       bool   — require PIN for manual-open button
pin               text?  — 4–6 digit PIN (stored plaintext; table is RLS-protected, admin-only)
drawer_port       0 | 1  — RJ11 pin 2 or pin 5
on_time_ms        int    — solenoid fire duration (default 100 ms → t1=50)
off_time_ms       int    — recovery time (default 100 ms → t2=50)
updated_at, updated_by
```

---

## Register Integration

### Toolbar button
A cash drawer icon button appears in the register header when:
- A session is open, AND
- `config.enabled === true`

Clicking it:
- If `requirePin = false` → sends the kick command immediately
- If `requirePin = true` → opens a 4–6 digit PIN dialog; on correct PIN → sends kick; on wrong PIN → shows error

### Auto-open on cash sale
In `handleConfirmSale()`, after the transaction completes successfully:
```
if (config.autoOpenOnCashSale && payments.some(p => p.method === 'cash')) {
  openDrawer()
}
```
Auto-open never requires a PIN.

---

## Pages & UI

### Register button
**Component**: `components/haraka/CashDrawerButton.tsx`

- Vault / banknote icon
- Disabled state when no printer is paired
- If `requirePin` → renders an inline PIN dialog (4–6 digit numeric input, "Open" button)
- PIN verified via POST `/api/haraka/cash-drawer-config/verify-pin`

### Settings Page
**Route**: `/{locale}/{orgSlug}/settings/cash-drawer`
**Permission**: `settings.fawtara` (POS-adjacent hardware setting)

Form fields:
| Field | Type | Description |
|-------|------|-------------|
| Enable cash drawer | Toggle | Master on/off |
| Auto-open on cash sale | Toggle | Kick after cash payment |
| Require PIN for manual open | Toggle | Enables PIN fields below |
| PIN | Number input (4–6 digits) | Set/change the PIN |
| Drawer port | Select (Port 0 / Port 1) | RJ11 pin 2 or pin 5 |
| On-time (ms) | Number input | Solenoid fire duration |
| Off-time (ms) | Number input | Recovery time |

Save button → PATCH `/api/haraka/cash-drawer-config`.

---

## Permissions

No new permission keys — uses `settings.fawtara` to gate the settings page and `pos.open_session` to gate the button (any cashier who can run a session can use the button).

---

## Navigation

Add to Settings group in `lib/nav/index.ts` (org-scoped, after Receipt):
```typescript
{ href: '/settings/cash-drawer', label: 'Cash Drawer', labelKey: 'nav.cashDrawer',
  permissionKey: 'settings.fawtara', featureKey: 'pos', scope: 'org' }
```
