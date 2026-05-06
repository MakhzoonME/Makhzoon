import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import {
  getSupportTicketById,
  getSupportTicketByIdAny,
  updateSupportTicket,
  updateSupportTicketAdmin,
} from '@/lib/db/support-tickets';
import { auditLog } from '@/lib/platform/audit';
import {
  supportTicketAdminUpdateSchema,
  supportTicketOrgUpdateSchema,
} from '@/lib/validations/support-ticket.schema';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

    const { ticketId } = await params;

    if (user.role === 'super_admin') {
      const ticket = await getSupportTicketByIdAny(ticketId);
      if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(ticket);
    }

    if (!tenant.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const ticket = await getSupportTicketById(ticketId, tenant.organizationId);
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(ticket);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/support/[ticketId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

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

      auditLog.queue({
        tenant,
        action,
        module: 'support',
        recordId: ticketId,
        newValue: parsed.data as Record<string, unknown>,
      });

      return NextResponse.json({ success: true });
    }

    if (!tenant.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsed = supportTicketOrgUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await updateSupportTicket(ticketId, tenant.organizationId, parsed.data);

    auditLog.queue({
      tenant,
      action: parsed.data.status === 'CLOSED' ? 'TICKET_CLOSED' : 'TICKET_UPDATED',
      module: 'support',
      recordId: ticketId,
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/support/[ticketId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
