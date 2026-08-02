import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getInvoiceById, markInvoicePaid } from '@/lib/db/invoices';
import { queueAuditLog } from '@/lib/audit/logger';

const paySchema = z.object({
  method: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
  paidAt: z.union([z.string().datetime(), z.string().date(), z.date()]).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; invoiceId: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId, invoiceId } = await params;
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice || invoice.organizationId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 });
    }

    const parsed = paySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();
    await markInvoicePaid(invoiceId, { method: parsed.data.method, paidAt, markedPaidBy: user.uid });

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'INVOICE_PAID',
      module: 'subscriptions',
      recordId: invoiceId,
      newValue: { method: parsed.data.method, paidAt, total: invoice.total, currency: invoice.currency },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/invoices/[invoiceId]/pay]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
