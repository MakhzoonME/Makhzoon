import { AuthUser } from '@/types/auth.types';
import {
  getSupportTickets,
  getSupportTicketById,
  createTicket as dbCreateTicket,
  updateTicket as dbUpdateTicket,
  addTicketMessage as dbAddTicketMessage,
} from '@/lib/db/support-tickets';
import { writeAuditLog } from '@/lib/audit/logger';
import { requirePermission, getUserContext } from './base.service';

export interface CreateTicketInput {
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface UpdateTicketInput {
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export async function getOrgSupportTickets(
  user: AuthUser,
  filters?: { status?: string; priority?: string }
) {
  await requirePermission(user, 'support', 'view');
  return getSupportTickets(user.organizationId, filters);
}

export async function getOrgSupportTicket(user: AuthUser, ticketId: string) {
  await requirePermission(user, 'support', 'view');
  const ticket = await getSupportTicketById(ticketId);
  if (!ticket || ticket.organizationId !== user.organizationId) {
    throw new Error('Support ticket not found');
  }
  return ticket;
}

export async function createSupportTicketWithAudit(user: AuthUser, data: CreateTicketInput) {
  await requirePermission(user, 'support', 'create');

  const userContext = getUserContext(user);
  const id = await dbCreateTicket({
    organizationId: user.organizationId,
    ...data,
    createdBy: userContext.uid,
    updatedBy: userContext.uid,
  });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'SUPPORT_TICKET_CREATED',
    module: 'support',
    recordId: id,
    newValue: data,
  });

  return { id };
}

export async function updateSupportTicketWithAudit(
  user: AuthUser,
  ticketId: string,
  data: UpdateTicketInput
) {
  await requirePermission(user, 'support', 'update');

  const ticket = await getSupportTicketById(ticketId);
  if (!ticket || ticket.organizationId !== user.organizationId) {
    throw new Error('Support ticket not found');
  }

  const userContext = getUserContext(user);
  await dbUpdateTicket(ticketId, data);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'SUPPORT_TICKET_UPDATED',
    module: 'support',
    recordId: ticketId,
    oldValue: { status: ticket.status, priority: ticket.priority },
    newValue: data,
  });
}

export async function addSupportTicketMessageWithAudit(
  user: AuthUser,
  ticketId: string,
  message: string
) {
  await requirePermission(user, 'support', 'create');

  const ticket = await getSupportTicketById(ticketId);
  if (!ticket || ticket.organizationId !== user.organizationId) {
    throw new Error('Support ticket not found');
  }

  const userContext = getUserContext(user);
  const messageId = await dbAddTicketMessage(ticketId, {
    body: message,
    authorId: userContext.uid,
    authorName: userContext.displayName || 'Unknown',
    authorRole: userContext.role || 'user',
  });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'SUPPORT_TICKET_MESSAGE_ADDED',
    module: 'support',
    recordId: ticketId,
    newValue: { messageId, body: message },
  });

  return { messageId };
}
