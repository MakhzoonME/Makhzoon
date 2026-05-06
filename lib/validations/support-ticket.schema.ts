import { z } from 'zod';

export const supportTicketStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
export const supportTicketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const supportTicketCreateSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  priority: supportTicketPriorityEnum.optional(),
});

// Org users can only close their own tickets.
export const supportTicketOrgUpdateSchema = z.object({
  status: z.enum(['CLOSED']).optional(),
});

// Super admin can change status freely and adjust priority.
export const supportTicketAdminUpdateSchema = z.object({
  status: supportTicketStatusEnum.optional(),
  priority: supportTicketPriorityEnum.optional(),
});

// Backwards-compat alias for the old import path.
export const supportTicketUpdateSchema = supportTicketOrgUpdateSchema;

export const ticketMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});
