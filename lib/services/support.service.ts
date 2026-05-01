import { AuthUser } from '@/types/auth.types';
import {
  getSupportTickets,
  getSupportTicketById,
  createSupportTicket as dbCreateTicket,
  updateSupportTicket as dbUpdateTicket,
  addTicketMessage as dbAddTicketMessage,
} from '@/lib/db/support-tickets';
import { queueAuditLog } from '@/lib/audit/logger';
import { requirePermission, getUserContext } from './base.service';

export interface CreateTicketInput {
  subject: string;
  description: string;
}

export interface UpdateTicketInput {
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

export async function getOrgSupportTickets(
  user: AuthUser,
  filters?: { status?: string }
) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'support', 'view');
  return getSupportTickets(user.organizationId, filters as { status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' });
}

export async function getOrgSupportTicket(user: AuthUser, ticketId: string) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'support', 'view');
  const ticket = await getSupportTicketById(ticketId, user.organizationId);
  if (!ticket) throw new Error('Support ticket not found');
  return ticket;
}

export async function createSupportTicketWithAudit(user: AuthUser, data: CreateTicketInput) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'support', 'create');

  const userContext = getUserContext(user);
  const ticket = await dbCreateTicket(user.organizationId, userContext.uid, data);

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'TICKET_CREATED',
    module: 'support',
    recordId: ticket.id,
    newValue: data as unknown as Record<string, unknown>,
  });

  return { id: ticket.id };
}

export async function updateSupportTicketWithAudit(
  user: AuthUser,
  ticketId: string,
  data: UpdateTicketInput
) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'support', 'update');

  const ticket = await getSupportTicketById(ticketId, user.organizationId);
  if (!ticket) throw new Error('Support ticket not found');

  const userContext = getUserContext(user);
  await dbUpdateTicket(ticketId, user.organizationId, data);

  const action = data.status === 'RESOLVED' ? 'TICKET_RESOLVED'
    : data.status === 'CLOSED' ? 'TICKET_CLOSED'
    : 'TICKET_UPDATED';

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action,
    module: 'support',
    recordId: ticketId,
    oldValue: { status: ticket.status },
    newValue: data as unknown as Record<string, unknown>,
  });
}

export async function addSupportTicketMessageWithAudit(
  user: AuthUser,
  ticketId: string,
  message: string
) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'support', 'create');

  const ticket = await getSupportTicketById(ticketId, user.organizationId);
  if (!ticket) throw new Error('Support ticket not found');

  const userContext = getUserContext(user);
  const ticketMessage = await dbAddTicketMessage(
    ticketId,
    user.organizationId,
    userContext.uid,
    userContext.displayName || 'Unknown',
    userContext.role || 'user',
    message,
  );

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'TICKET_REPLIED',
    module: 'support',
    recordId: ticketId,
    newValue: { messageId: ticketMessage.id, body: message },
  });

  return { messageId: ticketMessage.id };
}
