import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ContactSalesEntry {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  phone: string;
  email: string;
  notes: string | null;
  ip: string | null;
  createdAt: string;
}

type Row = Record<string, unknown>;

function toEntry(r: Row): ContactSalesEntry {
  return {
    id: r.id as string,
    name: r.name as string,
    firstName: (r.first_name as string) ?? '',
    lastName: (r.last_name as string) ?? '',
    organizationName: r.organization_name as string,
    phone: r.phone as string,
    email: r.email as string,
    notes: (r.notes as string) ?? null,
    ip: (r.ip as string) ?? null,
    createdAt: new Date((r.created_at as string) ?? Date.now()).toISOString(),
  };
}

export async function createContactSalesEntry(data: {
  name: string;
  firstName?: string;
  lastName?: string;
  organizationName: string;
  phone: string;
  email: string;
  notes?: string;
  ip: string | null;
}): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('contact_sales')
    .insert({
      name: data.name,
      first_name: data.firstName ?? '',
      last_name: data.lastName ?? '',
      organization_name: data.organizationName,
      phone: data.phone,
      email: data.email.toLowerCase(),
      notes: data.notes ?? null,
      ip: data.ip,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function getContactSalesEntries(): Promise<ContactSalesEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('contact_sales')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEntry);
}
