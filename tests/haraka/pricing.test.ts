import { describe, it, expect } from 'vitest';
import {
  priceLine,
  priceCart,
  computeChange,
  paymentsCoverTotal,
  type CartLineInput,
} from '@/lib/modules/haraka/pricing/calc';

function line(overrides: Partial<CartLineInput> = {}): CartLineInput {
  return {
    itemId: 'item-1',
    itemName: 'Item 1',
    sku: null,
    barcode: null,
    quantity: 1,
    unitPrice: 10,
    taxRate: 0,
    taxRateId: null,
    discount: 0,
    ...overrides,
  };
}

describe('priceLine', () => {
  it('handles a plain untaxed line', () => {
    const p = priceLine(line({ quantity: 3, unitPrice: 5 }));
    expect(p.subtotalBeforeTax).toBe(15);
    expect(p.taxAmount).toBe(0);
    expect(p.lineTotal).toBe(15);
  });

  it('applies tax after discount, pre-tax discount semantics', () => {
    const p = priceLine(line({ quantity: 2, unitPrice: 10, discount: 4, taxRate: 0.16 }));
    expect(p.subtotalBeforeTax).toBe(16);
    expect(p.taxAmount).toBeCloseTo(2.56, 4);
    expect(p.lineTotal).toBeCloseTo(18.56, 4);
  });

  it('clamps a discount that exceeds gross to the gross amount (no negative lines)', () => {
    const p = priceLine(line({ quantity: 1, unitPrice: 10, discount: 50, taxRate: 0.1 }));
    expect(p.discount).toBe(10);
    expect(p.subtotalBeforeTax).toBe(0);
    expect(p.taxAmount).toBe(0);
    expect(p.lineTotal).toBe(0);
  });

  it('rejects a negative discount (treats as 0)', () => {
    const p = priceLine(line({ quantity: 1, unitPrice: 10, discount: -5 }));
    expect(p.discount).toBe(0);
    expect(p.lineTotal).toBe(10);
  });

  it('keeps four-decimal precision internally', () => {
    const p = priceLine(line({ quantity: 1, unitPrice: 0.0001, taxRate: 0.16 }));
    expect(p.subtotalBeforeTax).toBe(0.0001);
    expect(p.taxAmount).toBe(0);
    expect(p.lineTotal).toBe(0.0001);
  });
});

describe('priceCart', () => {
  it('sums lines and totals correctly', () => {
    const result = priceCart([
      line({ quantity: 2, unitPrice: 10, taxRate: 0.16 }),
      line({ itemId: 'i2', quantity: 1, unitPrice: 5, taxRate: 0 }),
      line({ itemId: 'i3', quantity: 1, unitPrice: 8, discount: 3, taxRate: 0.16 }),
    ]);
    expect(result.totals.subtotal).toBeCloseTo(20 + 5 + 5, 4);
    expect(result.totals.taxTotal).toBeCloseTo(20 * 0.16 + 5 * 0.16, 4);
    expect(result.totals.discountTotal).toBe(3);
    expect(result.totals.total).toBeCloseTo(
      result.totals.subtotal + result.totals.taxTotal,
      4,
    );
  });

  it('returns empty totals for an empty cart', () => {
    const result = priceCart([]);
    expect(result.lines).toEqual([]);
    expect(result.totals).toEqual({ subtotal: 0, taxTotal: 0, discountTotal: 0, total: 0 });
  });
});

describe('computeChange', () => {
  it('returns zero when cash exactly covers the bill', () => {
    expect(computeChange(20, [{ method: 'cash', amount: 20 }])).toBe(0);
  });

  it('returns positive change when cash overpays', () => {
    expect(computeChange(15.25, [{ method: 'cash', amount: 20 }])).toBe(4.75);
  });

  it('returns no change for card-only payment', () => {
    expect(computeChange(20, [{ method: 'card', amount: 20 }])).toBe(0);
  });

  it('handles split tender — cash overpays only the remainder', () => {
    expect(
      computeChange(20, [
        { method: 'card', amount: 15 },
        { method: 'cash', amount: 10 },
      ]),
    ).toBe(5);
  });

  it('never returns negative change', () => {
    expect(computeChange(30, [{ method: 'cash', amount: 20 }])).toBe(0);
  });
});

describe('paymentsCoverTotal', () => {
  it('accepts exact payment', () => {
    expect(paymentsCoverTotal(20, [{ method: 'cash', amount: 20 }])).toBe(true);
  });

  it('accepts overpayment', () => {
    expect(paymentsCoverTotal(20, [{ method: 'cash', amount: 25 }])).toBe(true);
  });

  it('rejects underpayment', () => {
    expect(paymentsCoverTotal(20, [{ method: 'cash', amount: 19 }])).toBe(false);
  });

  it('tolerates sub-cent rounding noise', () => {
    expect(paymentsCoverTotal(20.0001, [{ method: 'cash', amount: 20 }])).toBe(true);
  });
});
