'use client';
import { useTransferStore } from '@/store/transfer.store';
import { useTransferMode } from '@/hooks/useTransferMode';
import { useUiStore } from '@/store/ui.store';
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '@/components/layout/AppSidebar';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TransferModeBanner() {
  const { active, orgName } = useTransferStore();
  const { exitTransferMode } = useTransferMode();
  const { sidebarCollapsed } = useUiStore();

  if (!active) return null;

  const leftOffset = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div
      className="fixed top-14 right-0 z-30 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 transition-[left] duration-350 ease-out-expo"
      style={{ left: leftOffset }}
    >
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
