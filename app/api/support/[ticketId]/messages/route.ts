import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import {
  getTicketMessages,
  getTicketMessagesAny,
  addTicketMessage,
  addTicketMessageAny,
  getSupportTicketByIdAny,
} from '@/lib/db/support-tickets';
import { getOrganizationById } from '@/lib/db/organizations';
import { auditLog } from '@/lib/platform/audit';
import { ticketMessageSchema } from '@/lib/validations/support-ticket.schema';
import { sendEmail } from '@/lib/email/resend';
import { supportTicketReplyEmail } from '@/lib/email/templates';

const SUPPORT_EMAILS = ['info@makhzoon.me', 'support@makhzoon.me'];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

    const { ticketId } = await params;

    if (user.role === 'super_admin') {
      const messages = await getTicketMessagesAny(ticketId);
      return NextResponse.json(messages);
    }

    if (!tenant.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const messages = await getTicketMessages(ticketId, tenant.organizationId);
    return NextResponse.json(messages);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/support/[ticketId]/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

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

      auditLog.queue({
        tenant,
        action: 'TICKET_REPLIED',
        module: 'support',
        recordId: ticketId,
      });

      (async () => {
        try {
          const org = await getOrganizationById(ticket.organizationId);
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
          const { html, text } = supportTicketReplyEmail({
            orgName: org?.name ?? ticket.organizationId,
            subject: ticket.subject,
            ticketId,
            authorName: user.displayName || user.email || 'Makhzoon Team',
            message: parsed.data.body,
            ticketUrl: `${baseUrl}/superadmin/support/${ticketId}`,
          });
          await sendEmail({
            to: SUPPORT_EMAILS,
            subject: `[Support Reply] ${ticket.subject} — ${org?.name ?? ticket.organizationId}`,
            html,
            text,
          });
        } catch (emailErr) {
          console.error('[POST /api/support/[ticketId]/messages] email notification failed:', emailErr);
        }
      })();

      return NextResponse.json(message, { status: 201 });
    }

    if (!tenant.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const message = await addTicketMessage(
      ticketId,
      tenant.organizationId,
      user.uid,
      user.displayName || user.email,
      authorRole,
      parsed.data.body,
    );

    auditLog.queue({
      tenant,
      action: 'TICKET_REPLIED',
      module: 'support',
      recordId: ticketId,
    });

    (async () => {
      try {
        const org = await getOrganizationById(tenant.organizationId!);
        const ticket = await getSupportTicketByIdAny(ticketId);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
        const { html, text } = supportTicketReplyEmail({
          orgName: org?.name ?? tenant.organizationId!,
          subject: ticket?.subject ?? ticketId,
          ticketId,
          authorName: user.displayName || user.email || 'Unknown',
          message: parsed.data.body,
          ticketUrl: `${baseUrl}/superadmin/support/${ticketId}`,
        });
        await sendEmail({
          to: SUPPORT_EMAILS,
          subject: `[Support Reply] ${ticket?.subject ?? ticketId} — ${org?.name ?? tenant.organizationId}`,
          html,
          text,
        });
      } catch (emailErr) {
        console.error('[POST /api/support/[ticketId]/messages] email notification failed:', emailErr);
      }
    })();

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/support/[ticketId]/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
