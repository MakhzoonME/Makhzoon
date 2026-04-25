import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import {
  getSupportTicketById,
  getSupportTicketByIdAny,
  updateSupportTicket,
  updateSupportTicketAdmin,
} from '@/lib/firestore/support-tickets';
import { writeAuditLog } from '@/lib/audit/logger';
import {
  supportTicketAdminUpdateSchema,
  supportTicketOrgUpdateSchema,
} from '@/lib/validations/support-ticket.schema';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticketId } = await params;

    if (user.role === 'super_admin') {
      const ticket = await getSupportTicketByIdAny(ticketId);
      if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(ticket);
    }

    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const ticket = await getSupportTicketById(ticketId, user.organizationId);
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(ticket);
  } catch (err) {
    console.error('[GET /api/support/[ticketId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticketId } = await params;
    const body = await req.json();

    if (user.role === 'super_admin') {
      const parsed = supportTicketAdminUpdateSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

      const ticket = await getSupportTicketByIdAny(ticketId);
      if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      await updateSupportTicketAdmin(ticketId, user.uid, parsed.data);

      const action =
        parsed.data.status === 'RESOLVED'
          ? 'TICKET_RESOLVED'
          : parsed.data.status === 'CLOSED'
          ? 'TICKET_CLOSED'
          : 'TICKET_UPDATED';

      await writeAuditLog({
        organizationId: ticket.organizationId,
        userId: user.uid,
        role: user.role,
        action,
        module: 'support',
        recordId: ticketId,
        newValue: parsed.data as Record<string, unknown>,
      });

      return NextResponse.json({ success: true });
    }

    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsed = supportTicketOrgUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await updateSupportTicket(ticketId, user.organizationId, parsed.data);

    await writeAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
      action: parsed.data.status === 'CLOSED' ? 'TICKET_CLOSED' : 'TICKET_UPDATED',
      module: 'support',
      recordId: ticketId,
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/support/[ticketId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
