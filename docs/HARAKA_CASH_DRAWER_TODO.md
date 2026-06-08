# Haraka Cash Drawer — Implementation Plan

> Feature doc lives in `docs/modules-and-features/22-haraka-cash-drawer.md`.
> Check off each item as it is completed.

---

## Status: ✅ Fully implemented

---

## What was built

- [x] `supabase/migrations/0022_haraka_cash_drawer.sql` — `haraka_cash_drawer_config` table
- [x] `lib/modules/haraka/printing/escpos-builder.ts` — added `kickDrawer(port, onTime, offTime)` method
- [x] `lib/modules/haraka/printing/webusb-transport.ts` — added `openCashDrawer(config)` function
- [x] `lib/modules/haraka/cash-drawer/schemas.ts` — Zod schema for config + PIN verify
- [x] `lib/modules/haraka/cash-drawer/cash-drawer.repository.ts` — get/upsert config, verify PIN
- [x] `lib/modules/haraka/cash-drawer/cash-drawer.service.ts` — permission checks
- [x] `app/api/haraka/cash-drawer-config/route.ts` — GET config, PATCH config
- [x] `app/api/haraka/cash-drawer-config/verify-pin/route.ts` — POST verify PIN
- [x] `hooks/haraka/useCashDrawer.ts` — `useCashDrawerConfig`, `useUpdateCashDrawerConfig`, `useVerifyDrawerPin`
- [x] `components/haraka/CashDrawerButton.tsx` — toolbar button + PIN dialog
- [x] `app/[locale]/[orgSlug]/settings/cash-drawer/page.tsx` — settings page
- [x] `lib/nav/index.ts` — Cash Drawer added to Settings group
- [x] `locales/messages.ts` — EN + AR keys added
- [x] `app/[locale]/[orgSlug]/[space]/haraka/register/page.tsx` — button in toolbar + auto-open on cash sale

---

## Notes for the next developer

- The kick command is `ESC p m t1 t2` where `t1 = Math.min(255, Math.round(onTimeMs / 2))` and same for `t2`
- PIN is stored as plaintext in `haraka_cash_drawer_config` (RLS-protected, admin-only read). It's a 4–6 digit operational code, not a user credential.
- Auto-open never requires PIN — only the manual button does
- If no printer is paired, `openCashDrawer()` returns false silently; the button shows a "No printer paired" toast
- The button is hidden when `config.enabled = false` or when no session is open
