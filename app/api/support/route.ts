import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import {
  getSupportTickets,
  getAllSupportTickets,
  createSupportTicket,
} from '@/lib/db/support-tickets';
import { getOrganizationById } from '@/lib/db/organizations';
import { auditLog } from '@/lib/platform/audit';
import { supportTicketCreateSchema } from '@/lib/validations/support-ticket.schema';
import { TicketStatus, TicketPriority } from '@/types';
import { sendEmail } from '@/lib/email/resend';
import { supportTicketNotificationEmail } from '@/lib/email/templates';

const SUPPORT_EMAILS = ['info@makhzoon.me', 'support@makhzoon.me'];
const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') ?? undefined) as TicketStatus | undefined;
    const priority = (searchParams.get('priority') ?? undefined) as TicketPriority | undefined;
    const orgIdFilter = searchParams.get('orgId') ?? undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;
    const sortBy = searchParams.get('sortBy') ?? undefined;
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' as const : 'desc' as const;

    if (SUPERADMIN_ROLES.has(user.role)) {
      if (orgIdFilter) {
        const result = await getSupportTickets(orgIdFilter, { status, page, pageSize, sortBy, sortDir });
        return NextResponse.json(result);
      }
      const result = await getAllSupportTickets({ status, priority, page, pageSize, sortBy, sortDir });
      return NextResponse.json(result);
    }

    if (!user.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const result = await getSupportTickets(user.organizationId, { status, page, pageSize, sortBy, sortDir });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/support]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;
    if (!tenant.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = supportTicketCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const ticket = await createSupportTicket(tenant.organizationId, user.uid, parsed.data);

    auditLog.queue({
      tenant,
      action: 'TICKET_CREATED',
      module: 'support',
      recordId: ticket.id,
      newValue: { subject: parsed.data.subject },
    });

    // Send notification email asynchronously — don't block the response
    (async () => {
      try {
        const org = await getOrganizationById(tenant.organizationId!);
        const { html, text } = supportTicketNotificationEmail({
          orgName: org?.name ?? tenant.organizationId!,
          subject: parsed.data.subject,
          description: parsed.data.description,
          priority: parsed.data.priority ?? 'MEDIUM',
          createdBy: user.email ?? user.uid,
          ticketId: ticket.id,
        });
        await sendEmail({
          to: SUPPORT_EMAILS,
          subject: `[Support] ${parsed.data.subject} — ${org?.name ?? tenant.organizationId}`,
          html,
          text,
        });
      } catch (emailErr) {
        console.error('[POST /api/support] email notification failed:', emailErr);
      }
    })();

    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/support]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
