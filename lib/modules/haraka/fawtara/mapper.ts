import type { PosTransaction, Organization } from '@/types'

/**
 * Translate a PosTransaction into the structured payload expected by Jordan's
 * Fawtara (ISTD e-invoicing) API. The exact field names below are placeholders
 * based on the published contract — when the user provides credentials we'll
 * verify the schema and tweak if needed. The mapper is pure so it's trivial
 * to unit-test against future fixtures.
 *
 * Currency is JOD; tax rates are stored as fractions (0.16) and Fawtara
 * expects percentages (16) — we convert.
 */
export interface FawtaraInvoicePayload {
  invoiceType: 'income' | 'general'
  invoiceNumber: string
  uuid: string
  issueDate: string // YYYY-MM-DD
  issueTime: string // HH:mm:ss
  currency: 'JOD'
  seller: {
    name: string
    taxpayerNumber: string | null
    activityNumber: string | null
    contactEmail: string | null
  }
  buyer: {
    name: string
    taxNumber: string | null
  }
  paymentMethod: 'cash' | 'card' | 'mixed'
  lines: Array<{
    name: string
    sku: string | null
    barcode: string | null
    quantity: number
    unitPrice: number
    discount: number
    taxPercentage: number
    taxAmount: number
    lineTotal: number
  }>
  totals: {
    subtotalExclTax: number
    discountTotal: number
    taxTotal: number
    grandTotal: number
  }
  reference?: {
    /** When this invoice is a credit-note for a previous one. */
    parentUuid: string | null
    parentInvoiceNumber: string | null
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function detectPaymentMethod(transaction: PosTransaction): 'cash' | 'card' | 'mixed' {
  const methods = new Set(transaction.payments.filter((p) => Math.abs(p.amount) > 0).map((p) => p.method))
  if (methods.size === 0) return 'cash'
  if (methods.size > 1) return 'mixed'
  const only = Array.from(methods)[0]
  return only === 'cash' ? 'cash' : 'card'
}

export function toFawtaraPayload(
  transaction: PosTransaction,
  organization: Pick<Organization, 'name' | 'contactEmail' | 'fawtara'>,
  invoiceNumber: string,
  uuid: string,
  parent?: { uuid: string; invoiceNumber: string } | null,
): FawtaraInvoicePayload {
  const fawtara = organization.fawtara
  return {
    invoiceType: fawtara?.invoiceTypeDefault ?? 'general',
    invoiceNumber,
    uuid,
    issueDate: formatDate(transaction.createdAt),
    issueTime: formatTime(transaction.createdAt),
    currency: 'JOD',
    seller: {
      name: organization.name,
      taxpayerNumber: fawtara?.taxpayerNumber ?? null,
      activityNumber: fawtara?.activityNumber ?? null,
      contactEmail: organization.contactEmail ?? null,
    },
    buyer: {
      name: transaction.customerName ?? 'Walk-in',
      taxNumber: null,
    },
    paymentMethod: detectPaymentMethod(transaction),
    lines: transaction.items.map((l) => ({
      name: l.inventoryItemName,
      sku: l.sku ?? null,
      barcode: l.barcode ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discountAmount,
      taxPercentage: +(l.taxRate * 100).toFixed(2),
      taxAmount: l.taxAmount,
      lineTotal: l.lineTotal,
    })),
    totals: {
      subtotalExclTax: transaction.subtotal,
      discountTotal: transaction.discountAmount,
      taxTotal: transaction.taxAmount,
      grandTotal: transaction.total,
    },
    reference: parent
      ? { parentUuid: parent.uuid, parentInvoiceNumber: parent.invoiceNumber }
      : undefined,
  }
}
