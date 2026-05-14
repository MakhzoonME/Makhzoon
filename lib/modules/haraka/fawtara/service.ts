import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { FawtaraSubmission, Organization, PosTransaction } from '@/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'
import { decrypt } from '@/lib/platform/crypto/secret-cipher'
import { toFawtaraPayload } from './mapper'
import { allocateFawtaraInvoiceNumber } from './invoice-numbering'
import { FawtaraClient, type FawtaraSubmitError } from './client'

interface OrgFawtaraSecrets {
  clientId: string
  clientSecret: string
}

/**
 * Read the org's Fawtara config + decrypt the secret half (stored on a
 * sibling doc `organizationsPrivate/{orgId}`).
 *
 * Secrets are stored AES-GCM encrypted by config.service.ts via the
 * `secret-cipher` module. `decrypt()` is a no-op for legacy plaintext rows,
 * so the read path is backwards-compatible until a rotation pass re-encrypts
 * everything.
 */
async function loadOrgFawtara(
  orgId: string,
): Promise<{ org: Pick<Organization, 'id' | 'name' | 'contactEmail' | 'fawtara'>; secrets: OrgFawtaraSecrets | null }> {
  const [orgDoc, privDoc] = await Promise.all([
    adminDb.collection('organizations').doc(orgId).get(),
    adminDb.collection('organizationsPrivate').doc(orgId).get(),
  ])
  if (!orgDoc.exists) throw new Error('Organization not found')
  const od = orgDoc.data()!
  const pd = privDoc.exists ? privDoc.data()! : null
  return {
    org: {
      id: orgId,
      name: od.name,
      contactEmail: od.contactEmail ?? null,
      fawtara: od.fawtara ?? null,
    },
    secrets: pd?.fawtara
      ? {
          clientId: decrypt(pd.fawtara.clientId ?? '') ?? '',
          clientSecret: decrypt(pd.fawtara.clientSecret ?? '') ?? '',
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

export class FawtaraService {
  /**
   * Submit a completed POS transaction to Fawtara. Returns the updated
   * submission record. The sale itself is never blocked by failure —
   * we record `failed` and let the retry queue handle it.
   *
   * Skips silently (status='skipped') when the org has Fawtara disabled
   * or hasn't supplied credentials.
   */
  async submitTransaction(tenant: TenantContext, transactionId: string): Promise<FawtaraSubmission> {
    const txRef = adminDb.collection('posTransactions').doc(transactionId)
    const txDoc = await txRef.get()
    if (!txDoc.exists || txDoc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Transaction not found')
    }
    const txData = txDoc.data()!
    const transaction: PosTransaction = {
      ...txData,
      id: transactionId,
      createdAt: txData.createdAt instanceof Timestamp ? txData.createdAt.toDate() : new Date(),
      updatedAt: txData.updatedAt instanceof Timestamp ? txData.updatedAt.toDate() : new Date(),
      syncedAt: txData.syncedAt instanceof Timestamp ? txData.syncedAt.toDate() : null,
    } as PosTransaction

    const { org, secrets } = await loadOrgFawtara(tenant.organizationId)
    if (!org.fawtara?.enabled) {
      const submission = emptySubmission('skipped')
      await txRef.update({ fawtara: submission, updatedAt: FieldValue.serverTimestamp() })
      return submission
    }
    if (!secrets || !secrets.clientId || !secrets.clientSecret) {
      const submission: FawtaraSubmission = {
        ...emptySubmission('failed'),
        errorCode: 'MISSING_CREDENTIALS',
        errorMessage: 'Fawtara is enabled but client credentials are not configured',
        attempts: 1,
      }
      await txRef.update({ fawtara: submission, updatedAt: FieldValue.serverTimestamp() })
      return submission
    }

    const existing: FawtaraSubmission | null = (txData.fawtara as FawtaraSubmission) ?? null
    const attempts = (existing?.attempts ?? 0) + 1

    // Allocate an invoice number only on the FIRST attempt. Retries reuse it.
    let invoiceNumber = existing?.invoiceNumber ?? null
    if (!invoiceNumber) {
      const alloc = await allocateFawtaraInvoiceNumber(tenant.organizationId, transaction.createdAt.getFullYear())
      invoiceNumber = alloc.invoiceNumber
    }
    // We pre-mint a UUID client-side so retries are idempotent on Fawtara's end.
    const uuid = existing?.uuid ?? crypto.randomUUID()

    // For refunds (transactions with parentTransactionId), include the parent ref.
    let parent: { uuid: string; invoiceNumber: string } | null = null
    if (transaction.parentTransactionId) {
      const parentDoc = await adminDb.collection('posTransactions').doc(transaction.parentTransactionId).get()
      if (parentDoc.exists) {
        const pdata = parentDoc.data()!
        if (pdata.fawtara?.uuid && pdata.fawtara?.invoiceNumber) {
          parent = { uuid: pdata.fawtara.uuid, invoiceNumber: pdata.fawtara.invoiceNumber }
        }
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
      await txRef.update({ fawtara: submission, updatedAt: FieldValue.serverTimestamp() })
      auditLog.queue({
        tenant,
        module: 'pos',
        action: 'FAWTARA_SUBMISSION_SENT',
        recordId: transactionId,
        newValue: { invoiceNumber, uuid: result.uuid, attempts },
      })
      await eventBus.emit('fawtara.submitted', { tenant, transactionId, invoiceNumber, uuid: result.uuid })
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
      await txRef.update({ fawtara: submission, updatedAt: FieldValue.serverTimestamp() })
      auditLog.queue({
        tenant,
        module: 'pos',
        action: 'FAWTARA_SUBMISSION_FAILED',
        recordId: transactionId,
        newValue: { invoiceNumber, errorCode: submission.errorCode, errorMessage: submission.errorMessage, attempts },
      })
      await eventBus.emit('fawtara.failed', { tenant, transactionId, submission })
      return submission
    }
  }

  /**
   * Manual resubmit triggered by a manager on the transaction detail page.
   * Permission: pos.fawtara_submit.
   */
  async resubmit(tenant: TenantContext, transactionId: string): Promise<FawtaraSubmission> {
    if (!hasPermission(tenant, 'pos', 'fawtara_submit')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return this.submitTransaction(tenant, transactionId)
  }
}
