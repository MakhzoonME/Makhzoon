import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import {
  getSupportTickets,
  getAllSupportTickets,
  createSupportTicket,
} from '@/lib/db/support-tickets';
import { getOrganizationById } from '@/lib/db/organizations';
import { queueAuditLog } from '@/lib/audit/logger';
import { supportTicketCreateSchema } from '@/lib/validations/support-ticket.schema';
import { TicketStatus, TicketPriority } from '@/types';
import { sendEmail } from '@/lib/email/resend';
import { supportTicketNotificationEmail } from '@/lib/email/templates';

const SUPPORT_EMAILS = ['info@makhzoon.me', 'support@makhzoon.me'];

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') ?? undefined) as TicketStatus | undefined;
    const priority = (searchParams.get('priority') ?? undefined) as TicketPriority | undefined;
    const orgIdFilter = searchParams.get('orgId') ?? undefined;

    if (user.role === 'super_admin') {
      if (orgIdFilter) {
        const tickets = await getSupportTickets(orgIdFilter, status ? { status } : undefined);
        return NextResponse.json(tickets);
      }
      const tickets = await getAllSupportTickets({ status, priority });
      return NextResponse.json(tickets);
    }

    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    queueAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'TICKET_CREATED',
      module: 'support',
      recordId: ticket.id,
      newValue: { subject: parsed.data.subject },
    });

    // Send notification email asynchronously — don't block the response
    (async () => {
      try {
        const org = await getOrganizationById(user.organizationId!);
        const { html, text } = supportTicketNotificationEmail({
          orgName: org?.name ?? user.organizationId!,
          subject: parsed.data.subject,
          description: parsed.data.description,
          priority: parsed.data.priority ?? 'MEDIUM',
          createdBy: user.email ?? user.uid,
          ticketId: ticket.id,
        });
        await sendEmail({
          to: SUPPORT_EMAILS,
          subject: `[Support] ${parsed.data.subject} — ${org?.name ?? user.organizationId}`,
          html,
          text,
        });
      } catch (emailErr) {
        console.error('[POST /api/support] email notification failed:', emailErr);
      }
    })();

    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    console.error('[POST /api/support]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
