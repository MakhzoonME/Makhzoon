import { useQuery } from '@tanstack/react-query';

export interface EarlyAccessLead {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  ip: string | null;
  createdAt: string;
}

export interface ContactSalesLead {
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

interface LeadsResponse {
  earlyAccess: EarlyAccessLead[];
  contactSales: ContactSalesLead[];
}

export function useLeads(type?: 'early-access' | 'contact-sales') {
  return useQuery<LeadsResponse | EarlyAccessLead[] | ContactSalesLead[]>({
    queryKey: ['superadmin-leads', type],
    queryFn: async () => {
      const url = type ? `/api/superadmin/leads?type=${type}` : '/api/superadmin/leads';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch leads');
      return res.json();
    },
    staleTime: 30_000,
  });
}
