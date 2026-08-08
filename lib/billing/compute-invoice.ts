import 'server-only';
import {
  USOOL_BLOCK_SIZE,
  RASEED_BLOCK_SIZE,
  HARAKA_MODULE_LABELS,
  type Package,
  type Subscription,
  type HarakaModule,
  type InvoiceLineItem,
} from '@/types';

export interface ComputedInvoice {
  lineItems: InvoiceLineItem[];
  subtotal: number;
  foundingCohortDiscount: number;
  total: number;
  currency: string;
}

function line(description: string, quantity: number, unitPrice: number): InvoiceLineItem {
  return { description, quantity, unitPrice, total: round2(quantity * unitPrice) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Deterministic monthly charge for a subscription: base plan + purchased
 * add-ons + extra users/spaces + extra Usool/Raseed capacity blocks + Haraka
 * modules beyond the included slots. Block model — no metered overage.
 *
 * Haraka slot allocation: the plan's free slots are applied to the org's
 * MOST EXPENSIVE active modules (cheapest for the customer); the remainder are
 * billed at their per-module price.
 */
export function computeInvoice(
  sub: Subscription,
  pkg: Package,
  at: Date = new Date(),
): ComputedInvoice {
  const items: InvoiceLineItem[] = [];
  const p = pkg.addOnPrices;
  const a = pkg.allowances;
  const currency = pkg.pricing.currency;

  // Base plan.
  items.push(line(`${pkg.name} plan`, 1, pkg.pricing.monthlyPrice ?? 0));

  // Extra Usool capacity (blocks of USOOL_BLOCK_SIZE).
  if (sub.limitOverrides.usool != null && a.usoolIncluded != null) {
    const extra = Math.max(0, sub.limitOverrides.usool - a.usoolIncluded);
    const blocks = Math.ceil(extra / USOOL_BLOCK_SIZE);
    if (blocks > 0 && p.usoolBlock) {
      items.push(line(`Extra Usool assets (+${blocks * USOOL_BLOCK_SIZE})`, blocks, p.usoolBlock));
    }
  }

  // Extra Raseed capacity (blocks of RASEED_BLOCK_SIZE).
  if (sub.limitOverrides.raseed != null && a.raseedIncluded != null) {
    const extra = Math.max(0, sub.limitOverrides.raseed - a.raseedIncluded);
    const blocks = Math.ceil(extra / RASEED_BLOCK_SIZE);
    if (blocks > 0 && p.raseedBlock) {
      items.push(line(`Extra Raseed items (+${blocks * RASEED_BLOCK_SIZE})`, blocks, p.raseedBlock));
    }
  }

  // Haraka modules beyond the included slots — free slots cover the priciest.
  const modulePrice = (m: HarakaModule): number => p.harakaModules?.[m] ?? 0;
  const activeModules = [...sub.activeHarakaModules].sort((x, y) => modulePrice(y) - modulePrice(x));
  const paidModules = activeModules.slice(a.harakaIncludedModuleSlots);
  for (const m of paidModules) {
    if (modulePrice(m) > 0) items.push(line(`${HARAKA_MODULE_LABELS[m]} module`, 1, modulePrice(m)));
  }

  // Independent add-ons (only when not already included in the plan).
  if (sub.activeAddOns.purchasesRequests && !a.purchasesRequestsIncluded && p.purchasesRequests) {
    items.push(line('Purchases & Requests', 1, p.purchasesRequests));
  }
  if (sub.activeAddOns.deliveryAgents && !a.deliveryAgentsIncluded && p.deliveryAgents) {
    items.push(line('Delivery agents', 1, p.deliveryAgents));
  }
  if (sub.activeAddOns.warrantyCerts && !a.warrantyCertsIncluded && p.warrantyCerts) {
    items.push(line('Warranty certificates', 1, p.warrantyCerts));
  }
  if (sub.activeAddOns.customization && !a.customizationIncluded && p.customization) {
    items.push(line('Customization', 1, p.customization));
  }
  if (sub.activeAddOns.vehicleIntake && !a.vehicleIntakeIncluded && p.vehicleIntake) {
    items.push(line('Vehicle intake', 1, p.vehicleIntake));
  }
  if (sub.activeAddOns.loyalty && !a.loyaltyIncluded && p.loyalty) {
    items.push(line('Loyalty program', 1, p.loyalty));
  }

  // Extra users / spaces.
  if (sub.activeAddOns.extraUsers > 0 && p.extraUser) {
    items.push(line('Extra users', sub.activeAddOns.extraUsers, p.extraUser));
  }
  if (sub.activeAddOns.extraSpaces > 0 && p.extraSpace) {
    items.push(line('Extra spaces', sub.activeAddOns.extraSpaces, p.extraSpace));
  }

  const subtotal = round2(items.reduce((s, i) => s + i.total, 0));

  // Founding-cohort discount while still within the locked window.
  let foundingCohortDiscount = 0;
  const fc = sub.foundingCohort;
  if (fc?.isFoundingCohort && fc.discountPercent > 0) {
    const active = !fc.discountExpiresAt || at < new Date(fc.discountExpiresAt);
    if (active) foundingCohortDiscount = round2((subtotal * fc.discountPercent) / 100);
  }

  return {
    lineItems: items,
    subtotal,
    foundingCohortDiscount,
    total: round2(subtotal - foundingCohortDiscount),
    currency,
  };
}
