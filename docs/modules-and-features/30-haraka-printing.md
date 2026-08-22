# Haraka — Printing (ESC/POS & WebUSB)

**Parent module**: Haraka (حركة) — Feature key: `pos`
**Settings cross-reference**: [13-settings.md § Receipt](13-settings.md) (`settingsReceipt.view`) and [13-settings.md § Order Documents](13-settings.md) for the config UI; this doc covers the technical implementation only.
**No dedicated "print" permission** — the print action itself is not permission-gated. Any user who can reach the register (session access) or the Receipt/Cash Drawer settings pages can trigger a print or drawer kick.

---

## Overview

Haraka prints thermal receipts straight from the browser via **WebUSB** — no print server, no OS print dialog, no native app. The whole pipeline lives under `lib/modules/haraka/printing/`:

1. A receipt is **rendered once to a `<canvas>`** (`receipt-canvas.ts`) at the printer's exact dot width, producing both a PNG (for on-screen preview) and a 1-bit boolean matrix (for the printer).
2. The matrix is wrapped in an **ESC/POS byte stream** (`escpos-builder.ts`) as a raster bit-image command, plus init/cut/drawer-kick commands.
3. The bytes are sent to the paired USB printer over **WebUSB** (`webusb-transport.ts`).

Two rendering paths exist:
- **Thermal templates** (`thermal-58` / `thermal-80`) — the canvas-rendered receipt bitmap is sent directly (`receipt-template.ts` → `buildReceiptFromMatrix`).
- **A4 templates** (`a4-modern` / `a4-invoice`) — the on-screen `ReceiptPreview` DOM node is rasterized with `html-to-image` and sent the same way (`raster-print.ts` → `printPreviewNode`). A4 templates are not "printed" via a native page-print flow; they're rasterized to a bitmap and pushed through the same ESC/POS/WebUSB path as thermal.

Everything ships as raster images, never as ESC/POS text mode. This is a deliberate design choice (documented in `receipt-template.ts`): thermal printers have no Arabic font ROM/shaping/RTL support, and the logo + Fawtara QR are images regardless — so rendering once to canvas and rastering that is the only path that keeps the on-screen preview and the printed paper pixel-identical.

---

## How Printing Is Triggered

| Trigger | Location | Behavior |
|---|---|---|
| Sale completion (auto-print) | `app/[locale]/[orgSlug]/[space]/haraka/sessions/[sessionId]/register/page.tsx` → `ReceiptShareDialog` (`autoPrint` prop) | On `handleConfirmSale` success, `ReceiptShareDialog` opens and immediately fires `handlePrint()` once per transaction (`autoPrintedFor` ref dedupes it). |
| Manual (re)print | `ReceiptShareDialog` → "Print" footer button | Same `handlePrint()`, callable repeatedly. |
| Cash drawer kick (auto) | Register page `maybeOpenCashDrawer` | Fired from the dialog's `onPrinted` callback — the drawer opens **after** the receipt print is sent, in sync, only if `drawerCfg.autoOpenOnCash` and a cash payment was made. |
| Cash drawer kick (manual) | `components/haraka/CashDrawerButton.tsx` | Register-page button; optionally gated behind a PIN (`useVerifyDrawerPin`) if `config.requirePin` is set. |
| Test print — Settings | `app/[locale]/[orgSlug]/settings/receipt/page.tsx` → `handleTestPrint` / `handlePrintPreview` | Sends a hand-built ESC/POS test page, or prints the live settings-page preview bitmap. |
| Printer pair/unpair/test print | `components/haraka/PrinterSettingsDialog.tsx` | Standalone dialog embedded wherever printer status needs to be checked (e.g. transaction detail page). |
| Manual reprint from transaction history | `app/[locale]/[orgSlug]/[space]/haraka/transactions/[transactionId]/page.tsx` | Reuses `ReceiptShareDialog` without `autoPrint`. |

`handlePrint()` in `ReceiptShareDialog` picks the path by template: if thermal and a raster already exists (rendered for the preview via `useReceiptRaster`), it sends that matrix directly (`printRaw(buildReceiptFromMatrix(raster.matrix, cutFeed), copies)`) — no second render. Otherwise (A4) it rasterizes the DOM preview node (`printPreviewNode`).

---

## ESC/POS Command Builder (`escpos-builder.ts`)

`EscPosBuilder` is a minimal chainable byte-stream builder — not a full ESC/POS library. Supported commands:

| Method | ESC/POS command | Purpose |
|---|---|---|
| `init()` | `ESC @` | Reset printer state |
| `align(a)` | `ESC a n` | left / center / right |
| `bold(on)` | `ESC E n` | Bold on/off |
| `size(value)` | `GS ! n` | 0 normal, 1 = 2× tall, 16 = 2× wide, 17 = 2× both |
| `text(s)` / `line(s)` | raw bytes + `LF` | Best-effort Latin-1/CP437 encode; non-Latin chars become `?` — Arabic is **not** printed via text mode (see raster note below) |
| `feed(n)` | `LF` × n | Line feed |
| `feedDots(dots)` | `ESC J n` | Feed by exact dot rows (203 dpi), used instead of `feed()` when a physical distance matters — e.g. after a raster image, since line spacing is unreliable there. Splits across multiple commands (n is a single byte, max 255) |
| `divider(char, width)` | — | Text divider line |
| `rasterImage(matrix)` | `GS v 0` | Single bit-image command; risks exceeding a printer's raster buffer on tall images |
| `rasterImageChunked(matrix, maxRows=200)` | multiple `GS v 0` | Splits a tall image into buffer-safe chunks sent back-to-back — used for whole receipts |
| `qrRaster(matrix)` | `GS v 0` | Alias of `rasterImage`, for QR-only images |
| `cut(extraLines)` | `ESC J` clearance + `GS V 0` | Full cut. **Always** feeds `BLADE_CLEARANCE_DOTS` (200 dots ≈ 25mm) before cutting, regardless of caller input — `extraLines` can only add to it, never reduce it. This fixed clearance exists because an org-configured `cutFeed` below the physical head-to-blade distance would silently cut off the receipt footer |
| `kickDrawer(port, onTimeMs, offTimeMs)` | `ESC p m t1 t2` | Cash-drawer solenoid kick; `onTimeMs`/`offTimeMs` are halved and clamped to 1–255 per the command's byte encoding |
| `build()` | — | Concatenates all parts into one `Uint8Array` |

Native `GS ( k` QR commands are deliberately **not** implemented — raster bit-image works across every ESC/POS-speaking printer (cheap Bluetooth rolls through Star TSP100), whereas native QR command support varies by vendor.

---

## WebUSB Transport (`webusb-transport.ts`)

Client-only module (`'use client'`). No Ethernet/network printer support — browsers cannot open raw TCP sockets, and a local print-bridge daemon is explicitly out of scope for v1.

**Pairing flow**:
1. `pairPrinter()` calls `navigator.usb.requestDevice({ filters: [{ classCode: 7 }] })` — filters the browser's device picker to USB printer-class devices only.
2. The paired device's `{ vendorId, productId }` is saved to `localStorage` under key `makhzoon:posPrinter` (`savePrinter`/`readSavedPrinter`/`clearSavedPrinter`).
3. Pairing is **per-browser/per-machine** — WebUSB has no concept of a device shared across computers. Every register computer must pair independently. Paper size, copies, and cut feed are *not* stored here; they come from the org-wide `ReceiptConfig` so every register prints identically regardless of which machine sends the job.
4. `store/printer.store.ts` (Zustand) wraps this as reactive state (`paired`, `vendorId`, `productId`) with `hydrate()` called on mount/dialog-open to reflect `localStorage`.

**Sending a job** (`printRaw(bytes, copies=1)`):
- Looks up the saved device among `navigator.usb.getDevices()` (only devices the user already granted permission to — this does not re-prompt).
- Returns `false` silently if WebUSB is unsupported, nothing is paired, or the device isn't currently connected — callers are expected to fall back to on-screen/PDF receipt viewing.
- Opens the device, selects configuration 1, claims the first interface, finds the first `out`-direction endpoint, and calls `transferOut` once per copy.
- **Serialized via a module-level promise queue** (`usbQueue`): receipt prints and cash-drawer kicks can be fired back-to-back without awaiting each other (e.g. print-then-kick-drawer), and without this queue their `claimInterface`/`transferOut` calls race and can clobber one another. A failed job doesn't break the queue for subsequent calls (`.catch(() => undefined)`).

**Browser compatibility**: WebUSB is Chromium-only (Chrome, Edge, Brave) — `isWebUsbSupported()` gates the UI accordingly. `PrinterSettingsDialog` shows an explicit fallback message on unsupported browsers (Safari, Firefox) stating receipts can still be viewed on screen but not printed.

`openCashDrawer(opts)` is a thin wrapper: builds a `kickDrawer` ESC/POS command and sends it through the same `printRaw` queue.

---

## Raster / Image Printing

### Canvas renderer (`receipt-canvas.ts`)

`renderReceiptRaster(transaction, opts, lang)` is the single source of truth for what a thermal receipt looks like. It:
- Renders to an off-screen `<canvas>` sized to the printer's exact dot width (58mm → 384 dots, 80mm → 576 dots, both at 203 dpi).
- Runs a **two-pass paint**: pass 1 measures total height with no drawing (needed because Arabic word-wrap depends on `measureText()`), pass 2 resizes the canvas and paints for real.
- Fully supports **bilingual/RTL** layout — Arabic is laid out and shaped by the browser's canvas text engine, sidestepping the printer's font ROM entirely (thermal printers have no Arabic font/shaping/RTL support).
- Draws the Fawtara QR code (via the `qrcode` package, `errorCorrectionLevel: 'M'`) only when `showFawtaraQr` is on, the transaction's Fawtara status is `submitted`, and a `qrPayload` exists; a QR generation failure is caught and logged, not fatal.
- Draws the org logo when `showLogo` + `logo` are set, loaded with `crossOrigin: 'anonymous'`; a failed/missing logo resolves to `null` rather than blocking the receipt. If the logo taints the canvas (`getImageData` throws `SecurityError` — e.g. a storage host missing CORS headers on redirects), the function catches it and **retries once with the logo forced off**.
- Thresholds the final canvas to 1-bit: text/rules get a hard luminance cutoff (150), but the logo's bounding rect is dithered with a 4×4 Bayer ordered-dither matrix so photographic/gradient logos keep visible shading instead of clipping to a black blob. The dithering decision is written back into the canvas pixels so the on-screen PNG preview matches the 1-bit bitmap exactly (WYSIWYG).
- Returns `{ matrix, dataUrl, width, height }` — `matrix` (`boolean[][]`, `true` = black dot) feeds the printer; `dataUrl` (PNG) feeds the `<img>` preview.

`renderReceiptCanvas()` is a back-compat shim returning just the matrix. `sampleReceiptTransaction()` provides a stand-in transaction for the receipt-designer preview in Settings.

### DOM rasterizer (`raster-print.ts`)

`printPreviewNode(node, opts)` is the A4-template path: captures a live DOM node with `html-to-image`'s `toCanvas` (scaled by `pixelRatio = dotWidth / cssWidth` so the output lands on the target paper's dot width), thresholds it to a boolean matrix (alpha > 32 and luminance < 200 = black), then builds and sends the same ESC/POS raster envelope as the thermal path.

### ESC/POS envelope (`receipt-template.ts`)

`buildReceiptFromMatrix(matrix, cutFeed?)` — thin wrapper: `init()` → `rasterImageChunked(matrix)` → `cut(cutFeed)`. Always chunked, never a single `GS v 0`, because a full receipt can exceed a printer's raster buffer and get silently truncated (typically manifesting as a missing footer or the tail bleeding into the next print job).

`buildReceipt(transaction, opts)` combines rendering + enveloping in one call for callers that haven't already rendered a raster elsewhere.

### Preview component (`components/haraka/ReceiptRasterPreview.tsx`)

`useReceiptRaster(...)` hook wraps `renderReceiptRaster` with debounced re-render (keyed on JSON-stringified text + other inputs) and a run-id guard against out-of-order async results. `ReceiptRasterPreview` renders the resulting PNG as a plain `<img>` at `scale` CSS px per printer dot (default 0.5, i.e. 2× density) — what's on screen is literally the bitmap sent to the printer, not a re-created HTML receipt.

---

## Receipt Template / Layout System

Four template IDs, defined in `components/settings/receipt/ReceiptPreview.tsx` (`TemplateId` type) and picked in `app/[locale]/[orgSlug]/settings/receipt/page.tsx`:

| Template | Rendering path | Paper/page |
|---|---|---|
| `thermal-58` | Canvas raster (`receipt-canvas.ts`) | 58mm roll, 384 dots |
| `thermal-80` | Canvas raster (`receipt-canvas.ts`) | 80mm roll, 576 dots |
| `a4-modern` | DOM (`ReceiptPreview` component) rasterized via `html-to-image` for printing; also used directly for the public receipt page / PDF | A4 |
| `a4-invoice` | Same as `a4-modern`, formal invoice styling | A4 |

`paperWidthFor(template)` (`lib/receipts/receipt-config.ts`) is the single source of truth mapping template → dot width (80 only for `thermal-80`, 58 for everything else — a code smell worth flagging: it silently treats A4 templates as 58mm-wide for any caller that doesn't separately check `isThermal`, though in practice all such callers do check it first).

`toPrintText(config, extras)` (also in `receipt-config.ts`) flattens the saved `ReceiptConfig` (org-wide, includes logo/address/footer/etc. — see [13-settings.md § Receipt](13-settings.md) for the settings UI) into the `ReceiptPrintText` shape the canvas renderer consumes. Used identically by both the register/share-dialog path and the receipt-designer settings preview, so preview and print never drift.

`DEFAULT_RECEIPT_CONFIG` in the same file is the client-safe fallback (`template: 'thermal-58'`) used when no saved config exists yet.

---

## Key Files

| Layer | Path |
|---|---|
| ESC/POS builder | `lib/modules/haraka/printing/escpos-builder.ts` |
| WebUSB transport | `lib/modules/haraka/printing/webusb-transport.ts` |
| Canvas receipt renderer | `lib/modules/haraka/printing/receipt-canvas.ts` |
| DOM → raster (A4 print path) | `lib/modules/haraka/printing/raster-print.ts` |
| ESC/POS envelope builder | `lib/modules/haraka/printing/receipt-template.ts` |
| Printer pairing state (Zustand) | `store/printer.store.ts` |
| Config helpers (paper width, text flattening) | `lib/receipts/receipt-config.ts` |
| Bilingual labels | `lib/receipts/labels.ts` |
| Preview + print/reprint UI | `components/haraka/ReceiptShareDialog.tsx` |
| Thermal bitmap preview + hook | `components/haraka/ReceiptRasterPreview.tsx` |
| A4 template preview component | `components/settings/receipt/ReceiptPreview.tsx` |
| Printer pair/test dialog | `components/haraka/PrinterSettingsDialog.tsx` |
| Cash drawer button (register) | `components/haraka/CashDrawerButton.tsx` |
| Register page (auto-print + drawer wiring) | `app/[locale]/[orgSlug]/[space]/haraka/sessions/[sessionId]/register/page.tsx` |
| Receipt settings page (template picker, test print) | `app/[locale]/[orgSlug]/settings/receipt/page.tsx` |
| Cash drawer settings page | `app/[locale]/[orgSlug]/settings/cash-drawer/page.tsx` |

---

## Settings & Permissions Cross-Reference

Printer/receipt appearance and cash-drawer behavior are configured elsewhere and consumed by this subsystem — see:
- [13-settings.md § Receipt](13-settings.md) (`settingsReceipt.view`) — template picker, paper width, copies, cut feed, logo, header/footer, language, accent color.
- [13-settings.md § Order Documents](13-settings.md) (`settingsInvoice.view`) — shared A4 document fields (title, terms, shown fields).
- [13-settings.md § Cash Drawer](13-settings.md) (`settingsCashDrawer.view`) — drawer port, on/off solenoid timing, `autoOpenOnCash`, `requirePin`.

There is no permission key specific to firing a print job or opening the drawer at the register — access is implicitly controlled by session/register access and, for the drawer, an optional PIN (`config.requirePin`, verified via `useVerifyDrawerPin`) rather than a permission-module check.
