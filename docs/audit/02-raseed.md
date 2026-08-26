# 02 — Raseed: Inventory

**Status: Fully working**

Stock items, purchase orders, and physical stock counts are all built end-to-end with a real transaction ledger behind every quantity shown on screen.

## What a user can see & do

- An overview with stock-health counts (in stock, low, out, expiring soon).
- A searchable stock list with filters, CSV export, and bulk actions.
- Add/edit an item, including whether it's sellable through the POS and at what price.
- Adjust stock manually from an item's detail page.
- Build purchase orders line-by-line, save as draft or receive immediately (which books the stock-in automatically); receive, cancel, edit, or delete a draft PO later.
- Run a Stock Audit: expected quantities are pre-filled, staff count what's actually there, and any mismatch is reviewed item-by-item before it's applied.

## What's captured

Name, category, SKU/barcode, unit, quantity on hand, reorder threshold, storage location, supplier (free text), unit cost, tax rate, expiry date, and attached documents. Every stock movement is logged as a transaction with before/after quantities, reason, and who did it.

## Business rules & limits

- Stock status is calculated automatically: zero = out, below threshold = low, at-or-above threshold = ok.
- A manual "Adjustment" sets the quantity outright; the other adjustment types add or subtract — easy to mix up if a staff member expects consistent behavior.
- Adjustments are always dated "now" — there's no way to backdate an entry.

## Not built despite looking present

There's a "reorder quantity" field visible in the underlying data structure, but no screen anywhere lets a user set or see it — it's a leftover from planning, not a working feature. Worth knowing so nobody assumes automatic reordering exists.
