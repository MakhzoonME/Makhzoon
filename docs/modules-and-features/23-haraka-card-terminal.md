# Haraka — Card Terminal Integration (دفع بالبطاقة)

**Parent module**: Haraka (حركة) — Feature key: `pos`
**Brand color**: `#C2185B` (inherited from Haraka)

---

## Overview

Allows the POS register to communicate with a connected Visa/Mastercard payment terminal (card machine) when the cashier selects "Card" as the payment method. The terminal receives the exact sale amount automatically, the cashier completes the card swipe/tap/insert, and the POS waits for confirmation before marking the payment as complete.

---

## The Problem with Browser-Based Terminal Integration

Browsers cannot open raw TCP/serial/USB connections to payment terminals directly (security restrictions). The realistic integration strategies for a web POS are:

| Strategy | How it works | Complexity |
|----------|-------------|-----------|
| **Display-only (Manual)** | Shows the amount prominently; cashier enters it manually on the terminal | Zero — works today |
| **Local Bridge** | A small background app (Node.js / Electron) runs on the POS machine, exposes `http://localhost:PORT`; browser POSTs the charge, bridge communicates with terminal via SDK or serial port | Medium — requires installing the bridge app |
| **Cloud Terminal API** | Terminal manufacturer provides a cloud API; browser → Makhzoon server → terminal cloud → terminal device | Medium — depends on terminal brand |
| **Webhook / Callback** | Terminal sends payment result to Makhzoon webhook; browser polls for result | Works with cloud-capable terminals |

Makhzoon supports **all four** — configured per org in **Settings → Card Terminal**.

---

## Supported Terminal Modes

### 1. Display-only (default, no setup required)
- When card is selected in the Payment Dialog, the amount is displayed in a large, clear overlay for the cashier to read and manually key into the terminal.
- On any payment terminal; no integration setup needed.
- Cashier taps "Payment confirmed" manually to complete the sale.

### 2. Local Bridge
- Org admin installs the **Makhzoon POS Bridge** (a tiny cross-platform desktop app / Node.js service).
- Bridge URL configured in settings (default: `http://localhost:7433`).
- POS sends `POST /charge { amount, currency, reference }` to the bridge.
- Bridge communicates with the terminal via the manufacturer's local SDK or serial protocol.
- Bridge calls back via a webhook or the POS polls `GET /charge/status/:ref`.

### 3. Cloud Terminal (e.g. SumUp, Square, Paymob)
- API key + terminal device ID configured in settings.
- POS sends charge via Makhzoon server (to avoid exposing API key in browser).
- Makhzoon server calls the payment provider's API → terminal receives the charge.
- POS polls Makhzoon server for result (30s timeout, 3s interval).

### 4. Webhook
- Terminal (or its cloud backend) POSTs result to `POST /api/haraka/card-payment-result`.
- POS polls for result using the sale's `reference` ID.
- Useful for terminals that only support outbound webhooks (no polling API).

---

## Data Model

### haraka_card_terminal_config (one row per org)

```
organization_id   ← PRIMARY KEY
enabled           bool   — master on/off
mode              text   — 'display' | 'local_bridge' | 'cloud' | 'webhook'
bridge_url        text?  — for local_bridge mode (e.g. http://localhost:7433)
provider          text?  — for cloud mode: 'sumup' | 'square' | 'paymob' | 'custom'
api_key_enc       text?  — encrypted API key (server-side encryption, never returned to client)
terminal_id       text?  — physical terminal device ID
webhook_secret    text?  — for webhook mode: HMAC secret to verify incoming results
currency          text   — default 'JOD'
timeout_seconds   int    — how long to poll before showing "check terminal manually" (default 60)
updated_at, updated_by
```

### haraka_card_charges (one row per card charge attempt)
Tracks in-flight and completed card charges so the POS can poll for results.
```
id                uuid PK
organization_id   uuid
reference         text NOT NULL UNIQUE  — sale offlineId or a generated UUID
amount            numeric(14,4)
currency          text
status            text  — 'pending' | 'approved' | 'declined' | 'timeout' | 'cancelled'
provider_ref      text?  — terminal's own transaction ID
created_at        timestamptz
updated_at        timestamptz
```

---

## Register Flow (Payment Dialog)

When cashier selects "Card" in the Payment Dialog and `config.enabled = true`:

1. **Display-only**: A large amount display replaces the normal card form; "Mark as paid" button lets cashier confirm manually after the card swipe.
2. **Local Bridge / Cloud**: "Send to terminal" button appears → shows spinner "Waiting for terminal…" → polls for result → on `approved`: auto-fills the payment line and enables "Complete Sale"; on `declined`: shows error; on timeout: falls back to manual confirmation.
3. **Webhook**: Same as Local Bridge/Cloud but result arrives via push from the terminal cloud.

---

## Pages & UI

### Settings Page
**Route**: `/{locale}/{orgSlug}/settings/card-terminal`
**Permission**: `settings.fawtara`

Form sections:
| Section | Fields |
|---------|--------|
| General | Enable toggle, Mode selector (Display / Local Bridge / Cloud / Webhook) |
| Local Bridge | Bridge URL, Test connection button |
| Cloud | Provider dropdown, API key (masked), Terminal device ID |
| Webhook | Webhook URL (read-only, shown to copy), Webhook secret |
| Behaviour | Timeout (seconds), Currency |

### POS Register — Card Payment Panel
**Component**: `components/haraka/CardTerminalPayment.tsx`

Replaces the plain "Card" tab in `PaymentDialog` when the terminal is enabled:
- **Display mode**: Large amount + "Mark as paid" button
- **Bridge/Cloud/Webhook mode**: "Send to terminal" → polling spinner → result badge (approved / declined)

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/haraka/card-terminal-config` | GET, PATCH | Config CRUD |
| `/api/haraka/card-terminal-config/test` | POST | Test bridge or cloud connection |
| `/api/haraka/card-charges` | POST | Initiate a charge (bridge or cloud) |
| `/api/haraka/card-charges/[ref]/status` | GET | Poll charge status |
| `/api/haraka/card-payment-result` | POST | Webhook receiver (verifies HMAC) |

---

## Navigation

Add to Settings group in `lib/nav/index.ts` (org-scoped, after Cash Drawer):
```typescript
{ href: '/settings/card-terminal', label: 'Card Terminal', labelKey: 'nav.cardTerminal',
  permissionKey: 'settings.fawtara', featureKey: 'pos', scope: 'org' }
```
