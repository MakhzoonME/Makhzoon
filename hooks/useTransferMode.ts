'use client';
import { useTransferStore } from '@/store/transfer.store';
import { useRouter } from 'next/navigation';

export function useTransferMode() {
  const { active, orgId, orgName, setTransfer, clearTransfer } = useTransferStore();
  const router = useRouter();

  async function enterTransferMode(orgId: string, orgName: string) {
    await fetch(`/api/organizations/${orgId}/transfer`, { method: 'POST' });
    setTransfer(orgId, orgName);
    router.push('/dashboard');
  }

  async function exitTransferMode() {
    await fetch('/api/organizations/transfer/exit', { method: 'POST' });
    clearTransfer();
    router.push('/super-admin');
  }

  return { active, orgId, orgName, enterTransferMode, exitTransferMode };
}
