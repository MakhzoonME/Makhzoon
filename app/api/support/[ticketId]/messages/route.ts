import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import {
  getTicketMessages,
  getTicketMessagesAny,
  addTicketMessage,
  addTicketMessageAny,
  getSupportTicketByIdAny,
} from '@/lib/db/support-tickets';
import { queueAuditLog } from '@/lib/audit/logger';
import { ticketMessageSchema } from '@/lib/validations/support-ticket.schema';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticketId } = await params;

    if (user.role === 'super_admin') {
      const messages = await getTicketMessagesAny(ticketId);
      return NextResponse.json(messages);
    }

    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const messages = await getTicketMessages(ticketId, user.organizationId);
    return NextResponse.json(messages);
  } catch (err) {
    console.error('[GET /api/support/[ticketId]/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticketId } = await params;
    const body = await req.json();
    const parsed = ticketMessageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const authorRole = user.role === 'super_admin' ? 'SUPER_ADMIN' : 'ORG_USER';

    if (user.role === 'super_admin') {
      const ticket = await getSupportTicketByIdAny(ticketId);
      if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const message = await addTicketMessageAny(
        ticketId,
        user.uid,
        user.displayName || user.email,
        authorRole,
        parsed.data.body,
      );

      queueAuditLog({
        organizationId: ticket.organizationId,
        userId: user.uid,
        role: user.role,
        action: 'TICKET_REPLIED',
        module: 'support',
        recordId: ticketId,
      });

      return NextResponse.json(message, { status: 201 });
    }

    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const message = await addTicketMessage(
      ticketId,
      user.organizationId,
      user.uid,
      user.displayName || user.email,
      authorRole,
      parsed.data.body,
    );

    queueAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'TICKET_REPLIED',
      module: 'support',
      recordId: ticketId,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('[POST /api/support/[ticketId]/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
