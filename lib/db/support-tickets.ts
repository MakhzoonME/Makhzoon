import { adminDb } from '@/lib/firebase/admin';
import { SupportTicket, TicketMessage, TicketStatus, TicketPriority } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toTicket(id: string, data: FirebaseFirestore.DocumentData): SupportTicket {
  return {
    id,
    organizationId: data.organizationId,
    subject: data.subject,
    description: data.description,
    status: data.status as TicketStatus,
    priority: data.priority as TicketPriority,
    createdBy: data.createdBy,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
  };
}

function toMessage(id: string, ticketId: string, data: FirebaseFirestore.DocumentData): TicketMessage {
  return {
    id,
    ticketId,
    body: data.body,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRole: data.authorRole,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  };
}

export async function getSupportTickets(
  orgId: string,
  opts?: { status?: TicketStatus; page?: number; pageSize?: number; sortBy?: string; sortDir?: 'asc' | 'desc' },
): Promise<{ items: SupportTicket[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortBy = opts?.sortBy ?? 'createdAt';
  const sortDir = opts?.sortDir ?? 'desc';

  let q = adminDb
    .collection('supportTickets')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc') as FirebaseFirestore.Query;
  if (opts?.status) q = q.where('status', '==', opts.status);
  const snap = await q.get();
  const items = snap.docs.map((d) => toTicket(d.id, d.data()));

  const sortFns: Record<string, (a: SupportTicket, b: SupportTicket) => number> = {
    subject: (a, b) => (a.subject ?? '').localeCompare(b.subject ?? ''),
    status: (a, b) => (a.status ?? '').localeCompare(b.status ?? ''),
    priority: (a, b) => (a.priority ?? '').localeCompare(b.priority ?? ''),
    createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  };

  const sortFn = sortFns[sortBy];
  if (sortFn) {
    items.sort((a, b) => sortDir === 'asc' ? sortFn(a, b) : sortFn(b, a));
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return { items: paged, total, page: safePage, pageSize, totalPages };
}

export async function getAllSupportTickets(opts?: {
  status?: TicketStatus;
  priority?: TicketPriority;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<{ items: SupportTicket[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortBy = opts?.sortBy ?? 'createdAt';
  const sortDir = opts?.sortDir ?? 'desc';

  let q = adminDb.collection('supportTickets').orderBy('createdAt', 'desc') as FirebaseFirestore.Query;
  if (opts?.status) q = q.where('status', '==', opts.status);
  if (opts?.priority) q = q.where('priority', '==', opts.priority);
  const snap = await q.get();
  const items = snap.docs.map((d) => toTicket(d.id, d.data()));

  const sortFns: Record<string, (a: SupportTicket, b: SupportTicket) => number> = {
    subject: (a, b) => (a.subject ?? '').localeCompare(b.subject ?? ''),
    status: (a, b) => (a.status ?? '').localeCompare(b.status ?? ''),
    priority: (a, b) => (a.priority ?? '').localeCompare(b.priority ?? ''),
    createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  };

  const sortFn = sortFns[sortBy];
  if (sortFn) {
    items.sort((a, b) => sortDir === 'asc' ? sortFn(a, b) : sortFn(b, a));
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return { items: paged, total, page: safePage, pageSize, totalPages };
}

export async function getSupportTicketByIdAny(ticketId: string): Promise<SupportTicket | null> {
  const doc = await adminDb.collection('supportTickets').doc(ticketId).get();
  if (!doc.exists) return null;
  return toTicket(doc.id, doc.data()!);
}

export async function updateSupportTicketAdmin(
  ticketId: string,
  userId: string,
  updates: { status?: TicketStatus; priority?: TicketPriority },
): Promise<void> {
  const patch: Record<string, unknown> = {
    ...updates,
    updatedBy: userId,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
    patch.resolvedAt = FieldValue.serverTimestamp();
    patch.resolvedBy = userId;
  }
  await adminDb.collection('supportTickets').doc(ticketId).update(patch);
}

export async function getTicketMessagesAny(ticketId: string): Promise<TicketMessage[]> {
  const snap = await adminDb
    .collection('supportTickets')
    .doc(ticketId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs.map((d) => toMessage(d.id, ticketId, d.data()));
}

export async function addTicketMessageAny(
  ticketId: string,
  authorId: string,
  authorName: string,
  authorRole: string,
  body: string,
): Promise<TicketMessage> {
  const ticket = await adminDb.collection('supportTickets').doc(ticketId).get();
  if (!ticket.exists) throw new Error('Not found');
  const ref = adminDb.collection('supportTickets').doc(ticketId).collection('messages').doc();
  await ref.set({ body, authorId, authorName, authorRole, createdAt: FieldValue.serverTimestamp() });
  await adminDb.collection('supportTickets').doc(ticketId).update({ updatedAt: FieldValue.serverTimestamp() });
  const doc = await ref.get();
  return toMessage(doc.id, ticketId, doc.data()!);
}

export async function getSupportTicketById(ticketId: string, orgId: string): Promise<SupportTicket | null> {
  const doc = await adminDb.collection('supportTickets').doc(ticketId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (data.organizationId !== orgId) return null;
  return toTicket(doc.id, data);
}

export async function createSupportTicket(
  orgId: string,
  userId: string,
  payload: { subject: string; description: string },
): Promise<SupportTicket> {
  const ref = adminDb.collection('supportTickets').doc();
  await ref.set({
    organizationId: orgId,
    subject: payload.subject,
    description: payload.description,
    status: 'OPEN' satisfies TicketStatus,
    priority: 'MEDIUM' satisfies TicketPriority,
    createdBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return toTicket(doc.id, doc.data()!);
}

export async function updateSupportTicket(
  ticketId: string,
  orgId: string,
  updates: { status?: TicketStatus },
): Promise<void> {
  const doc = await adminDb.collection('supportTickets').doc(ticketId).get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) throw new Error('Not found');
  await adminDb.collection('supportTickets').doc(ticketId).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getTicketMessages(ticketId: string, orgId: string): Promise<TicketMessage[]> {
  const ticket = await adminDb.collection('supportTickets').doc(ticketId).get();
  if (!ticket.exists || ticket.data()!.organizationId !== orgId) return [];
  const snap = await adminDb
    .collection('supportTickets')
    .doc(ticketId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs.map((d) => toMessage(d.id, ticketId, d.data()));
}

export async function addTicketMessage(
  ticketId: string,
  orgId: string,
  authorId: string,
  authorName: string,
  authorRole: string,
  body: string,
): Promise<TicketMessage> {
  const ticket = await adminDb.collection('supportTickets').doc(ticketId).get();
  if (!ticket.exists || ticket.data()!.organizationId !== orgId) throw new Error('Not found');
  const ref = adminDb.collection('supportTickets').doc(ticketId).collection('messages').doc();
  await ref.set({ body, authorId, authorName, authorRole, createdAt: FieldValue.serverTimestamp() });
  await adminDb
    .collection('supportTickets')
    .doc(ticketId)
    .update({ updatedAt: FieldValue.serverTimestamp() });
  const doc = await ref.get();
  return toMessage(doc.id, ticketId, doc.data()!);
}
