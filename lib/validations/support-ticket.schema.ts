import { z } from 'zod';

export const supportTicketCreateSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
});

export const supportTicketUpdateSchema = z.object({
  status: z.enum(['CLOSED']).optional(),
});

export const ticketMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});
