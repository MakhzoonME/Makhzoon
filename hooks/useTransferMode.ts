'use client';
import { useTransferStore } from '@/store/transfer.store';
import { buildTenantUrl, buildRootUrl } from '@/lib/utils/tenant-url';

export function useTransferMode() {
  const { active, orgId, orgName, subdomain, setTransfer, clearTransfer } = useTransferStore();

  async function enterTransferMode(targetOrgId: string, targetOrgName: string) {
    const res = await fetch(`/api/organizations/${targetOrgId}/transfer`, { method: 'POST' });
    const data: { subdomain?: string | null } = await res.json().catch(() => ({}));
    const sub = data.subdomain ?? null;
    setTransfer(targetOrgId, targetOrgName, sub);
    // On localhost, cookies are origin-scoped — staying on the same origin avoids
    // redirecting to a subdomain that has no session cookie.
    const hn = window.location.hostname.toLowerCase();
    const isLocalhost = hn === 'localhost' || hn.endsWith('.localhost');
    if (sub && !isLocalhost) {
      window.location.href = buildTenantUrl(sub, '/dashboard');
    } else {
      window.location.href = '/dashboard';
    }
  }

  async function exitTransferMode() {
    await fetch('/api/organizations/transfer/exit', { method: 'POST' });
    clearTransfer();
    window.location.href = buildRootUrl('/super-admin');
  }

  return { active, orgId, orgName, subdomain, enterTransferMode, exitTransferMode };
}
