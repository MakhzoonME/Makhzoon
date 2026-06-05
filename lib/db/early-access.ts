import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface EarlyAccessEntry {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  ip: string | null;
  createdAt: string;
}

type Row = Record<string, unknown>;

function toEntry(r: Row): EarlyAccessEntry {
  return {
    id: r.id as string,
    email: r.email as string,
    firstName: (r.first_name as string) ?? '',
    lastName: (r.last_name as string) ?? '',
    ip: (r.ip as string) ?? null,
    createdAt: new Date((r.created_at as string) ?? Date.now()).toISOString(),
  };
}

export async function createEarlyAccessEntry(
  email: string,
  ip: string | null,
  firstName?: string,
  lastName?: string,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('early_access')
    .insert({
      email: email.toLowerCase(),
      first_name: firstName ?? '',
      last_name: lastName ?? '',
      ip,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function getEarlyAccessEntries(): Promise<EarlyAccessEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('early_access')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEntry);
}
