import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getSupportTickets, createSupportTicket } from '@/lib/firestore/support-tickets';
import { writeAuditLog } from '@/lib/audit/logger';
import { supportTicketCreateSchema } from '@/lib/validations/support-ticket.schema';
import { TicketStatus } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') ?? undefined) as TicketStatus | undefined;

    const tickets = await getSupportTickets(user.organizationId, status ? { status } : undefined);
    return NextResponse.json(tickets);
  } catch (err) {
    console.error('[GET /api/support]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = supportTicketCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const ticket = await createSupportTicket(user.organizationId, user.uid, parsed.data);

    await writeAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'TICKET_CREATED',
      module: 'support',
      recordId: ticket.id,
      newValue: { subject: parsed.data.subject },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    console.error('[POST /api/support]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
