import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  SupportTicket,
  TicketMessage,
  TicketStatus,
  TicketPriority,
} from '@/types';

type Row = Record<string, unknown>;

function toTicket(r: Row): SupportTicket {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    subject: r.subject as string,
    description: r.description as string,
    status: r.status as TicketStatus,
    priority: r.priority as TicketPriority,
    createdBy: r.created_by as string,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
  };
}

function toMessage(r: Row): TicketMessage {
  return {
    id: r.id as string,
    ticketId: r.ticket_id as string,
    body: r.body as string,
    authorId: r.author_id as string,
    authorName: r.author_name as string,
    authorRole: r.author_role as string,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
  };
}

function paginate<T>(items: T[], page = 1, pageSize = 10) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

const SORT_FNS: Record<string, (a: SupportTicket, b: SupportTicket) => number> =
  {
    subject: (a, b) => (a.subject ?? '').localeCompare(b.subject ?? ''),
    status: (a, b) => (a.status ?? '').localeCompare(b.status ?? ''),
    priority: (a, b) => (a.priority ?? '').localeCompare(b.priority ?? ''),
    createdAt: (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  };

function sortTickets(
  items: SupportTicket[],
  sortBy = 'createdAt',
  sortDir: 'asc' | 'desc' = 'desc',
): SupportTicket[] {
  const fn = SORT_FNS[sortBy];
  if (fn) items.sort((a, b) => (sortDir === 'asc' ? fn(a, b) : fn(b, a)));
  return items;
}

export async function getSupportTickets(
  orgId: string,
  opts?: {
    status?: TicketStatus;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  },
): Promise<{ items: SupportTicket[]; total: number; page: number; pageSize: number; totalPages: number }> {
  let q = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (opts?.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw error;
  const items = sortTickets(
    (data ?? []).map(toTicket),
    opts?.sortBy,
    opts?.sortDir,
  );
  return paginate(items, opts?.page, opts?.pageSize);
}

export async function getAllSupportTickets(opts?: {
  status?: TicketStatus;
  priority?: TicketPriority;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<{ items: SupportTicket[]; total: number; page: number; pageSize: number; totalPages: number }> {
  let q = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.priority) q = q.eq('priority', opts.priority);
  const { data, error } = await q;
  if (error) throw error;
  const items = sortTickets(
    (data ?? []).map(toTicket),
    opts?.sortBy,
    opts?.sortDir,
  );
  return paginate(items, opts?.page, opts?.pageSize);
}

export async function getSupportTicketByIdAny(
  ticketId: string,
): Promise<SupportTicket | null> {
  const { data } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();
  return data ? toTicket(data) : null;
}

export async function updateSupportTicketAdmin(
  ticketId: string,
  userId: string,
  updates: { status?: TicketStatus; priority?: TicketPriority },
): Promise<void> {
  const patch: Row = { updated_by: userId };
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by = userId;
  }
  const { error } = await supabaseAdmin
    .from('support_tickets')
    .update(patch)
    .eq('id', ticketId);
  if (error) throw error;
}

export async function getTicketMessagesAny(
  ticketId: string,
): Promise<TicketMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toMessage);
}

async function insertMessage(
  ticketId: string,
  orgId: string,
  authorId: string,
  authorName: string,
  authorRole: string,
  body: string,
): Promise<TicketMessage> {
  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      organization_id: orgId,
      body,
      author_id: authorId,
      author_name: authorName,
      author_role: authorRole,
    })
    .select('*')
    .single();
  if (error) throw error;
  await supabaseAdmin
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  return toMessage(data);
}

export async function addTicketMessageAny(
  ticketId: string,
  authorId: string,
  authorName: string,
  authorRole: string,
  body: string,
): Promise<TicketMessage> {
  const ticket = await getSupportTicketByIdAny(ticketId);
  if (!ticket) throw new Error('Not found');
  return insertMessage(
    ticketId,
    ticket.organizationId,
    authorId,
    authorName,
    authorRole,
    body,
  );
}

export async function getSupportTicketById(
  ticketId: string,
  orgId: string,
): Promise<SupportTicket | null> {
  const t = await getSupportTicketByIdAny(ticketId);
  if (!t || t.organizationId !== orgId) return null;
  return t;
}

export async function createSupportTicket(
  orgId: string,
  userId: string,
  payload: { subject: string; description: string },
): Promise<SupportTicket> {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      organization_id: orgId,
      subject: payload.subject,
      description: payload.description,
      status: 'OPEN' satisfies TicketStatus,
      priority: 'MEDIUM' satisfies TicketPriority,
      created_by: userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toTicket(data);
}

export async function updateSupportTicket(
  ticketId: string,
  orgId: string,
  updates: { status?: TicketStatus },
): Promise<void> {
  const t = await getSupportTicketByIdAny(ticketId);
  if (!t || t.organizationId !== orgId) throw new Error('Not found');
  const patch: Row = {};
  if (updates.status !== undefined) patch.status = updates.status;
  const { error } = await supabaseAdmin
    .from('support_tickets')
    .update(patch)
    .eq('id', ticketId);
  if (error) throw error;
}

export async function getTicketMessages(
  ticketId: string,
  orgId: string,
): Promise<TicketMessage[]> {
  const t = await getSupportTicketByIdAny(ticketId);
  if (!t || t.organizationId !== orgId) return [];
  return getTicketMessagesAny(ticketId);
}

export async function addTicketMessage(
  ticketId: string,
  orgId: string,
  authorId: string,
  authorName: string,
  authorRole: string,
  body: string,
): Promise<TicketMessage> {
  const t = await getSupportTicketByIdAny(ticketId);
  if (!t || t.organizationId !== orgId) throw new Error('Not found');
  return insertMessage(ticketId, orgId, authorId, authorName, authorRole, body);
}
