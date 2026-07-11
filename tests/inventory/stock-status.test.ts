import { describe, it, expect } from 'vitest';
import { stockStatus } from '@/lib/modules/inventory/stock-status';

describe('stockStatus', () => {
  it("returns 'out' at zero quantity", () => {
    expect(stockStatus(0, 5)).toBe('out');
    expect(stockStatus(0, 0)).toBe('out');
  });

  it("returns 'low' when 0 < qty < threshold", () => {
    expect(stockStatus(3, 5)).toBe('low');
    expect(stockStatus(1, 2)).toBe('low');
  });

  it("returns 'ok' at or above threshold", () => {
    expect(stockStatus(5, 5)).toBe('ok');
    expect(stockStatus(10, 5)).toBe('ok');
  });

  it("treats a zero threshold as never 'low' (only out-of-stock flags)", () => {
    expect(stockStatus(1, 0)).toBe('ok');
    expect(stockStatus(100, 0)).toBe('ok');
    expect(stockStatus(0, 0)).toBe('out');
  });

  it('is consistent at the exact threshold boundary', () => {
    expect(stockStatus(4, 5)).toBe('low');
    expect(stockStatus(5, 5)).toBe('ok');
  });
});
