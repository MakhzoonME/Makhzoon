import { NextResponse } from 'next/server';
import {
  getSupportTickets,
  getSupportTicketById,
  createSupportTicket as dbCreateTicket,
  updateSupportTicket as dbUpdateTicket,
  addTicketMessage as dbAddTicketMessage,
} from '@/lib/db/support-tickets';
import { hasPermission } from '@/lib/platform/permissions';
import { auditLog } from '@/lib/platform/audit';
import type { TenantContext } from '@/lib/platform/tenancy/types';

export interface CreateTicketInput {
  subject: string;
  description: string;
  priority?: string;
}

export interface UpdateTicketInput {
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

export async function getAll(
  tenant: TenantContext,
  filters?: { status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' }
) {
  if (!hasPermission(tenant, 'support', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return getSupportTickets(tenant.organizationId, filters);
}

export async function getById(tenant: TenantContext, ticketId: string) {
  if (!hasPermission(tenant, 'support', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const ticket = await getSupportTicketById(ticketId, tenant.organizationId);
  if (!ticket) throw NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
  return ticket;
}

export async function create(tenant: TenantContext, data: CreateTicketInput) {
  if (!hasPermission(tenant, 'support', 'create'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ticket = await dbCreateTicket(tenant.organizationId, tenant.userId, data);

  auditLog.queue({
    tenant,
    action: 'TICKET_CREATED',
    module: 'support',
    recordId: ticket.id,
    newValue: data as unknown as Record<string, unknown>,
  });

  return { id: ticket.id };
}

export async function update(tenant: TenantContext, ticketId: string, data: UpdateTicketInput) {
  // support module has no 'update' op — any authenticated org user can update their tickets

  const ticket = await getSupportTicketById(ticketId, tenant.organizationId);
  if (!ticket) throw NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });

  await dbUpdateTicket(ticketId, tenant.organizationId, data);

  const action =
    data.status === 'RESOLVED' ? 'TICKET_RESOLVED'
    : data.status === 'CLOSED' ? 'TICKET_CLOSED'
    : 'TICKET_UPDATED';

  auditLog.queue({
    tenant,
    action,
    module: 'support',
    recordId: ticketId,
    oldValue: { status: ticket.status },
    newValue: data as unknown as Record<string, unknown>,
  });
}

export async function addMessage(tenant: TenantContext, ticketId: string, message: string) {
  if (!hasPermission(tenant, 'support', 'create'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ticket = await getSupportTicketById(ticketId, tenant.organizationId);
  if (!ticket) throw NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });

  const ticketMessage = await dbAddTicketMessage(
    ticketId,
    tenant.organizationId,
    tenant.userId,
    tenant.user.displayName || 'Unknown',
    tenant.role || 'user',
    message,
  );

  auditLog.queue({
    tenant,
    action: 'TICKET_REPLIED',
    module: 'support',
    recordId: ticketId,
    newValue: { messageId: ticketMessage.id, body: message },
  });

  return { messageId: ticketMessage.id };
}
