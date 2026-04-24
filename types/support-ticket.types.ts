export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  organizationId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
}
