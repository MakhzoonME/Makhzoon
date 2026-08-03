#!/usr/bin/env node
/**
 * One-off cleanup for the pre-0055 "orphaned completed sale" bug.
 *
 * Before migration 0055, TransactionsRepository.completeSale inserted the
 * pos_transactions row as status='completed' (committed immediately) and only
 * THEN decremented stock in separate RPC calls. When a line had insufficient
 * stock the call threw, the cashier saw "charge failed", but the already-
 * committed 'completed' row was left behind — and any lines that ran before the
 * failure had their stock decremented (Promise.allSettled, partial success).
 *
 * This script finds those orphans and cleans them up:
 *   - An orphan is a status='completed', non-refund/void transaction that has at
 *     least one STOCK line item with NO corresponding stock-OUT ledger row
 *     (inventory_transactions type='out', pos_transaction_id = tx.id). A fully-
 *     successful sale has an OUT row for every stock line; a service-only sale
 *     has no stock lines and is never flagged.
 *   - Cleanup restores stock ONLY for the OUT rows that actually exist (the
 *     partial decrement) via inventory_apply_stock_in, then marks the row
 *     status='voided'. It never over-restores the line that failed.
 *
 * SAFE BY DEFAULT: dry run (report only). Pass --apply to mutate. Idempotent —
 * reversals are tagged source='pos-cleanup' and skipped if already present, and
 * voided rows drop out of the candidate scan, so re-runs are safe.
 *
 * Usage:
 *   node --env-file=.env.local scripts/cleanup-orphaned-completed-sales.mjs [options]
 *
 * Options:
 *   --apply            Perform the cleanup (default: dry run / report only)
 *   --org=<uuid>       Limit to a single organization
 *   --limit=<n>        Stop after scanning n candidate transactions
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ORG = (args.find((a) => a.startsWith('--org=')) ?? '').split('=')[1] || null
const LIMIT = Number((args.find((a) => a.startsWith('--limit=')) ?? '').split('=')[1]) || Infinity

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  console.error('  Run with: node --env-file=.env.local scripts/cleanup-orphaned-completed-sales.mjs')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PAGE = 500

/** All stock-item ids among the given ids (i.e. ids that exist in inventory_items). */
async function stockItemIdSet(itemIds) {
  const set = new Set()
  for (let i = 0; i < itemIds.length; i += PAGE) {
    const chunk = itemIds.slice(i, i + PAGE)
    const { data, error } = await db.from('inventory_items').select('id').in('id', chunk)
    if (error) throw error
    for (const r of data ?? []) set.add(r.id)
  }
  return set
}

/** Existing stock-OUT ledger rows grouped by pos_transaction_id. */
async function outRowsByTx(txIds) {
  const byTx = new Map()
  for (let i = 0; i < txIds.length; i += PAGE) {
    const chunk = txIds.slice(i, i + PAGE)
    const { data, error } = await db
      .from('inventory_transactions')
      .select('pos_transaction_id, item_id, item_name, quantity, organization_id, space_id')
      .eq('type', 'out')
      .in('pos_transaction_id', chunk)
    if (error) throw error
    for (const r of data ?? []) {
      const list = byTx.get(r.pos_transaction_id) ?? []
      list.push(r)
      byTx.set(r.pos_transaction_id, list)
    }
  }
  return byTx
}

/** True if a pos-cleanup reversal already exists for this tx (idempotency guard). */
async function alreadyReversed(txId) {
  const { data, error } = await db
    .from('inventory_transactions')
    .select('id')
    .eq('pos_transaction_id', txId)
    .eq('type', 'in')
    .eq('source', 'pos-cleanup')
    .limit(1)
  if (error) throw error
  return (data ?? []).length > 0
}

async function findOrphans() {
  const orphans = []
  let scanned = 0
  let from = 0

  while (scanned < LIMIT) {
    let q = db
      .from('pos_transactions')
      .select('id, organization_id, space_id, receipt_number, created_at, items')
      .eq('status', 'completed')
      .is('parent_transaction_id', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (ORG) q = q.eq('organization_id', ORG)

    const { data: txs, error } = await q
    if (error) throw error
    if (!txs || txs.length === 0) break

    // Which line-item ids in this page are real stock items?
    const allItemIds = [
      ...new Set(txs.flatMap((t) => (Array.isArray(t.items) ? t.items.map((l) => l.inventoryItemId) : []))),
    ].filter(Boolean)
    const stockIds = await stockItemIdSet(allItemIds)
    const outByTx = await outRowsByTx(txs.map((t) => t.id))

    for (const tx of txs) {
      const lines = Array.isArray(tx.items) ? tx.items : []
      const stockLineIds = [...new Set(lines.map((l) => l.inventoryItemId).filter((id) => stockIds.has(id)))]
      if (stockLineIds.length === 0) continue // service-only sale — never an orphan

      const outRows = outByTx.get(tx.id) ?? []
      const ledgeredIds = new Set(outRows.map((r) => r.item_id))
      const missing = stockLineIds.filter((id) => !ledgeredIds.has(id))
      if (missing.length === 0) continue // every stock line was decremented — a good sale

      orphans.push({ tx, outRows, missingCount: missing.length, stockLineCount: stockLineIds.length })
    }

    scanned += txs.length
    from += txs.length
    if (txs.length < PAGE) break
  }
  return orphans
}

async function cleanup(orphan) {
  const { tx, outRows } = orphan

  if (!(await alreadyReversed(tx.id))) {
    for (const r of outRows) {
      const { error } = await db.rpc('inventory_apply_stock_in', {
        p_org: r.organization_id,
        p_space: r.space_id,
        p_item: r.item_id,
        p_qty: r.quantity,
        p_item_name: r.item_name,
        p_reason: 'POS cleanup',
        p_note: `Reversal of orphaned sale ${tx.receipt_number ?? tx.id}`,
        p_source: 'pos-cleanup',
        p_purchase_id: null,
        p_pos_tx: tx.id,
        p_by: null,
        p_by_email: null,
        p_by_name: null,
        p_by_role: null,
      })
      if (error) throw error
    }
  }

  const { error } = await db
    .from('pos_transactions')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      refund_reason: 'Cleanup: charge failed (insufficient stock) — never completed',
    })
    .eq('id', tx.id)
    .eq('status', 'completed') // guard: only flip while still completed
  if (error) throw error
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will mutate)' : 'DRY RUN (report only)'}${ORG ? `  org=${ORG}` : ''}`)
  console.log('Scanning completed transactions for orphans…\n')

  const orphans = await findOrphans()

  if (orphans.length === 0) {
    console.log('✔ No orphaned completed transactions found.')
    return
  }

  console.log(`Found ${orphans.length} orphaned transaction(s):\n`)
  for (const o of orphans) {
    const restoreQty = o.outRows.reduce((s, r) => s + Number(r.quantity ?? 0), 0)
    console.log(
      `  • ${o.tx.receipt_number ?? o.tx.id}  (org ${o.tx.organization_id}, ${new Date(o.tx.created_at).toISOString().slice(0, 10)})` +
        `  — ${o.missingCount}/${o.stockLineCount} stock line(s) never decremented; ` +
        `${o.outRows.length} partial OUT row(s) to reverse (qty ${restoreQty})`,
    )
  }

  if (!APPLY) {
    console.log(`\nDry run — nothing changed. Re-run with --apply to void these and restore the partial stock.`)
    return
  }

  console.log(`\nApplying cleanup…`)
  let ok = 0
  let failed = 0
  for (const o of orphans) {
    try {
      await cleanup(o)
      ok++
      console.log(`  ✔ voided ${o.tx.receipt_number ?? o.tx.id} and restored ${o.outRows.length} line(s)`)
    } catch (err) {
      failed++
      console.error(`  ✖ ${o.tx.receipt_number ?? o.tx.id}: ${err?.message ?? err}`)
    }
  }
  console.log(`\nDone. ${ok} cleaned up, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('✖ Fatal:', err?.message ?? err)
  process.exit(1)
})
