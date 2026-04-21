'use client';
import { useTransferStore } from '@/store/transfer.store';
import { useTransferMode } from '@/hooks/useTransferMode';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TransferModeBanner() {
  const { active, orgName } = useTransferStore();
  const { exitTransferMode } = useTransferMode();

  if (!active) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-30 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        You are acting as Admin of: <span className="font-semibold">{orgName}</span>
      </p>
      <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" onClick={exitTransferMode}>
        Exit Transfer Mode
      </Button>
    </div>
  );
}
