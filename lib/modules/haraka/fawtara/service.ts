import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { FawtaraSubmission, Organization, PosTransaction } from '@/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'
import { decrypt } from '@/lib/platform/crypto/secret-cipher'
import { toFawtaraPayload } from './mapper'
import { allocateFawtaraInvoiceNumber } from './invoice-numbering'
import { FawtaraClient, type FawtaraSubmitError } from './client'

type Row = Record<string, unknown>

interface OrgFawtaraSecrets {
  clientId: string
  clientSecret: string
}

/** Map a pos_transactions row to the PosTransaction shape (items/payments
 *  jsonb are already camelCase objects). */
function rowToTransaction(r: Row): PosTransaction {
  return {
    ...(r as object),
    id: r.id as string,
    organizationId: r.organization_id as string,
    sessionId: r.session_id as string,
    locationId: (r.location_id as string) ?? 'default',
    cashierId: r.cashier_id as string,
    cashierName: (r.cashier_name as string) ?? '',
    customerId: (r.customer_id as string) ?? null,
    customerName: (r.customer_name as string) ?? null,
    items: Array.isArray(r.items) ? (r.items as PosTransaction['items']) : [],
    subtotal: Number(r.subtotal ?? 0),
    taxAmount: Number(r.tax_amount ?? 0),
    discountAmount: Number(r.discount_amount ?? 0),
    total: Number(r.total ?? 0),
    payments: Array.isArray(r.payments) ? (r.payments as PosTransaction['payments']) : [],
    change: Number(r.change ?? 0),
    status: (r.status as PosTransaction['status']) ?? 'completed',
    receiptNumber: (r.receipt_number as string) ?? '',
    offlineId: (r.offline_id as string) ?? '',
    parentTransactionId: (r.parent_transaction_id as string) ?? null,
    fawtara: (r.fawtara as PosTransaction['fawtara']) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    syncedAt: r.synced_at ? new Date(r.synced_at as string) : null,
  } as PosTransaction
}

async function loadOrgFawtara(
  orgId: string,
): Promise<{ org: Pick<Organization, 'id' | 'name' | 'contactEmail' | 'fawtara'>; secrets: OrgFawtaraSecrets | null }> {
  const [{ data: org }, { data: priv }] = await Promise.all([
    supabaseAdmin
      .from('organizations')
      .select('name, contact_email, fawtara')
      .eq('id', orgId)
      .maybeSingle(),
    supabaseAdmin
      .from('organizations_private')
      .select('fawtara')
      .eq('organization_id', orgId)
      .maybeSingle(),
  ])
  if (!org) throw new Error('Organization not found')
  const pf = (priv?.fawtara as Record<string, unknown>) ?? null
  return {
    org: {
      id: orgId,
      name: org.name as string,
      contactEmail: (org.contact_email as string) ?? null,
      fawtara: (org.fawtara as Organization['fawtara']) ?? null,
    },
    secrets: pf
      ? {
          clientId: decrypt((pf.clientId as string) ?? '') ?? '',
          clientSecret: decrypt((pf.clientSecret as string) ?? '') ?? '',
        }
      : null,
  }
}

function buildClient(
  fawtaraConfig: NonNullable<Organization['fawtara']>,
  secrets: OrgFawtaraSecrets,
): FawtaraClient {
  return new FawtaraClient({
    mode: fawtaraConfig.mode,
    clientId: secrets.clientId,
    clientSecret: secrets.clientSecret,
  })
}

function emptySubmission(status: FawtaraSubmission['status']): FawtaraSubmission {
  return {
    status,
    uuid: null,
    qrPayload: null,
    invoiceNumber: null,
    submittedAt: null,
    errorCode: null,
    errorMessage: null,
    attempts: 0,
  }
}

async function setTxFawtara(id: string, submission: FawtaraSubmission) {
  await supabaseAdmin
    .from('pos_transactions')
    .update({ fawtara: submission })
    .eq('id', id)
}

export class FawtaraService {
  async submitTransaction(
    tenant: TenantContext,
    transactionId: string,
  ): Promise<FawtaraSubmission> {
    const { data: txRow } = await supabaseAdmin
      .from('pos_transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle()
    if (!txRow || txRow.organization_id !== tenant.organizationId) {
      throw new Error('Transaction not found')
    }
    const transaction = rowToTransaction(txRow)

    const { org, secrets } = await loadOrgFawtara(tenant.organizationId)
    if (!org.fawtara?.enabled) {
      const submission = emptySubmission('skipped')
      await setTxFawtara(transactionId, submission)
      return submission
    }
    if (!secrets || !secrets.clientId || !secrets.clientSecret) {
      const submission: FawtaraSubmission = {
        ...emptySubmission('failed'),
        errorCode: 'MISSING_CREDENTIALS',
        errorMessage: 'Fawtara is enabled but client credentials are not configured',
        attempts: 1,
      }
      await setTxFawtara(transactionId, submission)
      return submission
    }

    const existing: FawtaraSubmission | null =
      (txRow.fawtara as FawtaraSubmission) ?? null
    const attempts = (existing?.attempts ?? 0) + 1

    let invoiceNumber = existing?.invoiceNumber ?? null
    if (!invoiceNumber) {
      const alloc = await allocateFawtaraInvoiceNumber(
        tenant.organizationId,
        transaction.createdAt.getFullYear(),
      )
      invoiceNumber = alloc.invoiceNumber
    }
    const uuid = existing?.uuid ?? crypto.randomUUID()

    let parent: { uuid: string; invoiceNumber: string } | null = null
    if (transaction.parentTransactionId) {
      const { data: parentRow } = await supabaseAdmin
        .from('pos_transactions')
        .select('fawtara')
        .eq('id', transaction.parentTransactionId)
        .maybeSingle()
      const pf = parentRow?.fawtara as
        | { uuid?: string; invoiceNumber?: string }
        | undefined
      if (pf?.uuid && pf?.invoiceNumber) {
        parent = { uuid: pf.uuid, invoiceNumber: pf.invoiceNumber }
      }
    }

    const payload = toFawtaraPayload(transaction, org, invoiceNumber, uuid, parent)
    const client = buildClient(org.fawtara, secrets)

    try {
      const result = await client.submitInvoice(payload)
      const submission: FawtaraSubmission = {
        status: 'submitted',
        uuid: result.uuid,
        qrPayload: result.qrPayload,
        invoiceNumber,
        submittedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        attempts,
      }
      await setTxFawtara(transactionId, submission)
      auditLog.queue({
        tenant,
        module: 'pos',
        action: 'FAWTARA_SUBMISSION_SENT',
        recordId: transactionId,
        newValue: { invoiceNumber, uuid: result.uuid, attempts },
      })
      await eventBus.emit('fawtara.submitted', {
        tenant,
        transactionId,
        invoiceNumber,
        uuid: result.uuid,
      })
      return submission
    } catch (err) {
      const e = err as FawtaraSubmitError
      const submission: FawtaraSubmission = {
        status: 'failed',
        uuid,
        qrPayload: null,
        invoiceNumber,
        submittedAt: null,
        errorCode: e.code ?? 'UNKNOWN',
        errorMessage: e.message ?? String(err),
        attempts,
      }
      await setTxFawtara(transactionId, submission)
      auditLog.queue({
        tenant,
        module: 'pos',
        action: 'FAWTARA_SUBMISSION_FAILED',
        recordId: transactionId,
        newValue: {
          invoiceNumber,
          errorCode: submission.errorCode,
          errorMessage: submission.errorMessage,
          attempts,
        },
      })
      await eventBus.emit('fawtara.failed', { tenant, transactionId, submission })
      return submission
    }
  }

  async resubmit(
    tenant: TenantContext,
    transactionId: string,
  ): Promise<FawtaraSubmission> {
    if (!hasPermission(tenant, 'pos', 'fawtara_submit')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return this.submitTransaction(tenant, transactionId)
  }
}
