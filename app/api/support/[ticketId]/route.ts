import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import {
  getSupportTicketById,
  getSupportTicketByIdAny,
  updateSupportTicket,
  updateSupportTicketAdmin,
} from '@/lib/db/support-tickets';
import { queueAuditLog } from '@/lib/audit/logger';
import { auditLog } from '@/lib/platform/audit';
import {
  supportTicketAdminUpdateSchema,
  supportTicketOrgUpdateSchema,
} from '@/lib/validations/support-ticket.schema';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticketId } = await params;

    if (SUPERADMIN_ROLES.has(user.role)) {
      const ticket = await getSupportTicketByIdAny(ticketId);
      if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(ticket);
    }

    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const ticket = await getSupportTicketById(ticketId, user.organizationId);
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
    const { ticketId } = await params;
    const body = await req.json();

    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (SUPERADMIN_ROLES.has(user.role)) {
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

      queueAuditLog({
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

    const tenant = await resolveTenant();
    const parsed = supportTicketOrgUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await updateSupportTicket(ticketId, user.organizationId, parsed.data);

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
