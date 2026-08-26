import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getInvoiceById, refundInvoice } from '@/lib/db/invoices';
import { queueAuditLog } from '@/lib/audit/logger';

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().min(1, 'A refund reason is required').max(500),
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
    if (invoice.status !== 'PAID') {
      return NextResponse.json({ error: 'Only a paid invoice can be refunded' }, { status: 409 });
    }

    const parsed = refundSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    if (parsed.data.amount !== undefined && parsed.data.amount > invoice.total) {
      return NextResponse.json({ error: 'Refund amount cannot exceed the invoice total' }, { status: 422 });
    }

    const updated = await refundInvoice(invoiceId, {
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      refundedBy: user.uid,
    });

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'INVOICE_REFUNDED',
      module: 'subscriptions',
      recordId: invoiceId,
      newValue: { amount: updated.refundAmount, reason: parsed.data.reason, currency: invoice.currency },
    });

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/invoices/[invoiceId]/refund]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
