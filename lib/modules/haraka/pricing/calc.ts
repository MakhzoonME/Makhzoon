/**
 * Pure pricing functions used by both the Haraka register (live totals as the
 * cashier types) and the backend transaction service (canonical totals stored
 * on the PosTransaction). Keeping it pure makes the math trivially unit-testable.
 *
 * Conventions:
 *  - All monetary values are in the org's currency unit (JOD by default).
 *  - Per-line discounts are absolute amounts (not percentages) applied AFTER
 *    quantity × unit-price.
 *  - Rounding: 4 decimals internally (avoid floating-point creep), then 2
 *    decimals when displayed. The repository persists 4 to keep audit math exact.
 */

export interface CartLineInput {
  itemId: string;
  itemName: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  /** Absolute discount applied to the line (post-quantity). */
  discount: number;
}

export interface PricedLine extends CartLineInput {
  lineTotal: number;
}

export interface CartTotals {
  subtotal: number;
  discountTotal: number;
  total: number;
}

function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function priceLine(line: CartLineInput): PricedLine {
  const gross = line.quantity * line.unitPrice;
  const discount = Math.max(0, Math.min(line.discount, gross));
  const lineTotal = r4(gross - discount);
  return {
    ...line,
    discount,
    lineTotal,
  };
}

export function priceCart(lines: CartLineInput[]): { lines: PricedLine[]; totals: CartTotals } {
  let subtotal = 0;
  let discountTotal = 0;
  const priced = lines.map((l) => {
    const p = priceLine(l);
    subtotal += p.lineTotal;
    discountTotal += p.discount;
    return p;
  });
  return {
    lines: priced,
    totals: {
      subtotal: r4(subtotal),
      discountTotal: r4(discountTotal),
      total: r4(subtotal),
    },
  };
}

/**
 * Compute change to return given total due and the list of payments. Cash
 * "overpay" is the only source of change — card amounts are always exact.
 */
export function computeChange(total: number, payments: Array<{ method: string; amount: number }>): number {
  const cashPaid = payments
    .filter((p) => p.method === 'cash')
    .reduce((acc, p) => acc + p.amount, 0);
  const cardPaid = payments
    .filter((p) => p.method !== 'cash')
    .reduce((acc, p) => acc + p.amount, 0);
  // Card covers part of the bill exactly; remaining must be covered by cash.
  // Change = (cash paid) − (remaining due after cards).
  const dueAfterCards = Math.max(0, r4(total - cardPaid));
  const change = r4(cashPaid - dueAfterCards);
  return change > 0 ? change : 0;
}

/** Validate that payments at least cover the total, optionally with cash overpay. */
export function paymentsCoverTotal(total: number, payments: Array<{ method: string; amount: number }>): boolean {
  const paid = payments.reduce((acc, p) => acc + p.amount, 0);
  return paid + 0.0001 >= total;
}
