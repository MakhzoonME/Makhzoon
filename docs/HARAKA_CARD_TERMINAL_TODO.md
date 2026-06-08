# Haraka Card Terminal Integration — Implementation Plan

> Feature doc lives in `docs/modules-and-features/23-haraka-card-terminal.md`.
> Pick up from here. Check off each item as it is completed.

---

## Status: ⬜ Not started

---

## Before you start — read these

- `docs/modules-and-features/23-haraka-card-terminal.md` — full feature spec + mode options
- `components/haraka/PaymentDialog.tsx` — the card tab you'll extend
- `app/[locale]/[orgSlug]/[space]/haraka/register/page.tsx` — register page, specifically `handleConfirmSale()`
- `app/[locale]/[orgSlug]/settings/cash-drawer/page.tsx` — copy the settings page pattern
- `lib/modules/haraka/cash-drawer/` — copy the backend pattern (schemas, repository, service, routes)

---

## 1. Database

- [ ] `supabase/migrations/0024_haraka_card_terminal.sql`
  - **`haraka_card_terminal_config`** table (one row per org):
    ```sql
    organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE
    enabled         boolean NOT NULL DEFAULT false
    mode            text NOT NULL DEFAULT 'display'
                    CHECK (mode IN ('display','local_bridge','cloud','webhook'))
    bridge_url      text    -- http://localhost:7433
    provider        text    -- 'sumup' | 'square' | 'paymob' | 'custom'
    api_key_enc     text    -- server-side encrypted; NEVER returned to client
    terminal_id     text
    webhook_secret  text    -- HMAC secret for webhook verification
    currency        text NOT NULL DEFAULT 'JOD'
    timeout_seconds int NOT NULL DEFAULT 60
    updated_at      timestamptz NOT NULL DEFAULT now()
    updated_by      uuid
    ```
  - **`haraka_card_charges`** table (tracks in-flight + completed charges):
    ```sql
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
    reference       text NOT NULL UNIQUE  -- offlineId or generated UUID
    amount          numeric(14,4) NOT NULL
    currency        text NOT NULL DEFAULT 'JOD'
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','declined','timeout','cancelled'))
    provider_ref    text     -- terminal's own transaction ID
    created_at      timestamptz NOT NULL DEFAULT now()
    updated_at      timestamptz NOT NULL DEFAULT now()
    ```
  - Add index on `(organization_id, reference)` and `(organization_id, created_at DESC)`
  - RLS: org members can read their own charges; org managers can write

---

## 2. Types

- [ ] `types/pos.types.ts` — add:
  - `CardTerminalMode = 'display' | 'local_bridge' | 'cloud' | 'webhook'`
  - `CardChargeStatus = 'pending' | 'approved' | 'declined' | 'timeout' | 'cancelled'`
  - `HarakaCardTerminalConfig` — config interface
  - `HarakaCardCharge` — charge row interface

---

## 3. Backend

- [ ] `lib/modules/haraka/card-terminal/schemas.ts`
  - `cardTerminalConfigSchema` — Zod validation for config PATCH
  - `initiateChargeSchema` — `{ reference, amount, currency }`

- [ ] `lib/modules/haraka/card-terminal/card-terminal.repository.ts`
  - `getConfig(tenant)` — returns config or defaults
  - `updateConfig(tenant, patch)` — upsert, never returns `api_key_enc`
  - `createCharge(tenant, input)` — insert pending charge
  - `updateChargeStatus(tenant, ref, status, providerRef?)` — update status
  - `getChargeByRef(tenant, ref)` — poll result

- [ ] `lib/modules/haraka/card-terminal/card-terminal.service.ts`
  - `getConfig` — gated by `pos.open_session` (cashiers need it)
  - `updateConfig` — gated by `settings.fawtara`
  - `initiateCharge(tenant, input)` — creates charge row; if mode = 'cloud', calls provider API; if mode = 'local_bridge', proxies to bridge URL; if mode = 'display' | 'webhook', just creates the row
  - `getChargeStatus(tenant, ref)` — returns current status from DB
  - `receiveWebhook(payload, signature, secret)` — HMAC-SHA256 verify, update charge status

- [ ] `app/api/haraka/card-terminal-config/route.ts` — GET, PATCH
- [ ] `app/api/haraka/card-terminal-config/test/route.ts` — POST (test bridge or cloud connection)
- [ ] `app/api/haraka/card-charges/route.ts` — POST initiate charge
- [ ] `app/api/haraka/card-charges/[ref]/status/route.ts` — GET poll status
- [ ] `app/api/haraka/card-payment-result/route.ts` — POST webhook receiver (HMAC verify → update charge status)

---

## 4. Hooks

- [ ] `hooks/haraka/useCardTerminal.ts`
  - `useCardTerminalConfig()` — GET config
  - `useUpdateCardTerminalConfig()` — mutation
  - `useInitiateCharge()` — mutation
  - `useChargeStatus(ref, enabled)` — polls `/api/haraka/card-charges/[ref]/status` every 3s while `status === 'pending'`

- [ ] `hooks/haraka/index.ts` — re-export

---

## 5. Component — CardTerminalPayment

- [ ] `components/haraka/CardTerminalPayment.tsx`

  Replaces the plain card amount input in `PaymentDialog` when the terminal is enabled:

  **Display mode:**
  - Shows a large formatted amount
  - "Mark as paid" button → user confirms manually → payment line filled → sale can proceed

  **Local Bridge / Cloud / Webhook modes:**
  - "Send to terminal" button → `useInitiateCharge()`
  - Spinner + "Waiting for terminal…" message
  - Polls `useChargeStatus(ref, true)` every 3s
  - `approved` → show green badge, auto-fill payment line, enable "Complete Sale"
  - `declined` → show red badge + "Try again" button
  - `timeout` → show amber warning "Check terminal manually" + fallback "Mark as paid"
  - "Cancel" → cancels the charge row (status → 'cancelled'), returns to normal card input

---

## 6. Settings Page

- [ ] `app/[locale]/[orgSlug]/settings/card-terminal/page.tsx`
  - Enable/disable toggle
  - Mode selector: Display / Local Bridge / Cloud / Webhook
  - **Local Bridge section** (shown when mode = 'local_bridge'):
    - Bridge URL input (default `http://localhost:7433`)
    - "Test connection" button → POST `/api/haraka/card-terminal-config/test`
    - Download link for the POS Bridge app (if available)
  - **Cloud section** (shown when mode = 'cloud'):
    - Provider dropdown (SumUp, Square, Paymob, Custom)
    - API key input (masked, "••••" if already set; clear to replace)
    - Terminal device ID input
  - **Webhook section** (shown when mode = 'webhook'):
    - Webhook URL (read-only): `https://app.makhzoon.me/api/haraka/card-payment-result`
    - Webhook secret (set here; stored server-side)
  - **Behaviour section** (always visible):
    - Timeout (seconds) input
    - Currency display (read-only, pulled from org)
  - Save button

---

## 7. PaymentDialog Integration

- [ ] Modify `components/haraka/PaymentDialog.tsx`
  - Import `useCardTerminalConfig` and `CardTerminalPayment`
  - When `config.enabled = true`: replace the Card tab's content with `<CardTerminalPayment />`
  - `CardTerminalPayment` calls `onPaymentConfirmed(amount)` when approved → parent adds the payment line

---

## 8. Navigation + i18n

- [ ] `lib/nav/index.ts` — add to Settings group (after Cash Drawer):
  ```typescript
  { href: '/settings/card-terminal', label: 'Card Terminal', labelKey: 'nav.cardTerminal',
    permissionKey: 'settings.fawtara', featureKey: 'pos', scope: 'org' }
  ```

- [ ] `locales/messages.ts` — add keys (EN + AR):
  - `nav.cardTerminal` / `'Card Terminal'` / `'الدفع بالبطاقة'`
  - `haraka.cardTerminal` / `haraka.sendToTerminal` / `haraka.waitingTerminal`
  - `haraka.paymentApproved` / `haraka.paymentDeclined` / `haraka.terminalTimeout`
  - `haraka.markAsPaid` / `haraka.cardMode.display` / `haraka.cardMode.localBridge`
  - `haraka.cardMode.cloud` / `haraka.cardMode.webhook`

---

## Notes for the next developer

- **Never return `api_key_enc` to the client** — in the repository, exclude it from all GET responses. When updating, only write to it if a new non-empty key is provided.
- **Webhook HMAC**: verify with `HMAC-SHA256(secret, rawBody)` — use `crypto.subtle` (available in Cloudflare Workers). Compare with `timingSafeEqual` to prevent timing attacks.
- **Local Bridge timeout**: if the bridge doesn't respond within `timeout_seconds`, update the charge to `timeout` and surface the fallback "Mark as paid" UI.
- **Display mode is always safe**: even if cloud/bridge fails at runtime, you can fall back to display mode for the cashier.
- **The `reference` field** should be the POS `offlineId` so the charge row can be correlated with the transaction after the sale is saved.
- Check `mode` before doing anything — the service should be a no-op for `display` mode (no DB charge row needed for display-only).
