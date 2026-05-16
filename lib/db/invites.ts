import { supabaseAdmin } from '@/lib/supabase/admin';
import { Invite, InviteStatus, UserPermissions } from '@/types';
import { randomBytes } from 'crypto';

type Row = Record<string, unknown>;

function toInvite(r: Row): Invite {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    email: r.email as string,
    username: r.username as string,
    displayName: r.display_name as string,
    role: r.role as Invite['role'],
    token: r.token as string,
    status: r.status as InviteStatus,
    invitedBy: r.invited_by as string,
    invitedByEmail: r.invited_by_email as string,
    invitedByName: r.invited_by_name as string,
    expiresAt: r.expires_at ? new Date(r.expires_at as string) : new Date(),
    acceptedAt: r.accepted_at ? new Date(r.accepted_at as string) : undefined,
    acceptedBy: (r.accepted_by as string) ?? undefined,
    revokedAt: r.revoked_at ? new Date(r.revoked_at as string) : undefined,
    revokedBy: (r.revoked_by as string) ?? undefined,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    permissions: (r.permissions ?? null) as UserPermissions | null,
  };
}

export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function getInvites(orgId: string): Promise<Invite[]> {
  const { data, error } = await supabaseAdmin
    .from('invites')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(toInvite);
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const { data } = await supabaseAdmin
    .from('invites')
    .select('*')
    .eq('token', token)
    .limit(1)
    .maybeSingle();
  return data ? toInvite(data) : null;
}

export async function getInviteById(id: string): Promise<Invite | null> {
  const { data } = await supabaseAdmin
    .from('invites')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toInvite(data) : null;
}

export async function getPendingInviteForEmail(
  orgId: string,
  email: string,
): Promise<Invite | null> {
  const { data } = await supabaseAdmin
    .from('invites')
    .select('*')
    .eq('organization_id', orgId)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  return data ? toInvite(data) : null;
}

export async function getPendingInviteForUsername(
  orgId: string,
  username: string,
): Promise<Invite | null> {
  const { data } = await supabaseAdmin
    .from('invites')
    .select('*')
    .eq('organization_id', orgId)
    .eq('username', username.toLowerCase())
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  return data ? toInvite(data) : null;
}

export async function createInvite(
  data: Omit<
    Invite,
    | 'id'
    | 'createdAt'
    | 'status'
    | 'acceptedAt'
    | 'acceptedBy'
    | 'revokedAt'
    | 'revokedBy'
  >,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('invites')
    .insert({
      organization_id: data.organizationId,
      email: data.email ? data.email.toLowerCase() : null,
      username: data.username ? data.username.toLowerCase() : null,
      display_name: data.displayName,
      role: data.role,
      token: data.token,
      status: 'pending' as InviteStatus,
      invited_by: data.invitedBy,
      invited_by_email: data.invitedByEmail,
      invited_by_name: data.invitedByName,
      expires_at: new Date(data.expiresAt).toISOString(),
      permissions: data.permissions ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function markInviteAccepted(
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function revokeInvite(
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invites')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: userId,
    })
    .eq('id', id);
  if (error) throw error;
}
