'use client';
import { useTransferStore } from '@/store/transfer.store';

export function useTransferMode() {
  const { active, orgId, orgName, subdomain, setTransfer, clearTransfer } = useTransferStore();

  async function enterTransferMode(targetOrgId: string, targetOrgName: string) {
    const res = await fetch(`/api/organizations/${targetOrgId}/transfer`, { method: 'POST' });
    const data: { subdomain?: string | null } = await res.json().catch(() => ({}));
    const sub = data.subdomain ?? null;
    setTransfer(targetOrgId, targetOrgName, sub);
    window.location.href = sub ? `/${sub}/dashboard` : '/';
  }

  async function exitTransferMode() {
    await fetch('/api/organizations/transfer/exit', { method: 'POST' });
    clearTransfer();
    window.location.href = '/superadmin/dashboard';
  }

  return { active, orgId, orgName, subdomain, enterTransferMode, exitTransferMode };
}
