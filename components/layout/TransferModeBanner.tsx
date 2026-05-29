'use client';
import { useTransferStore } from '@/store/transfer.store';
import { useTransferMode, useT } from '@/hooks/ui';
import { useUiStore } from '@/store/ui.store';
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '@/components/layout/AppSidebar';
import { Button } from '@/components/ui/button';

function AlertTriangleSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function TransferModeBanner() {
  const { active, orgName } = useTransferStore();
  const { exitTransferMode } = useTransferMode();
  const { sidebarCollapsed } = useUiStore();
  const { t } = useT();

  if (!active) return null;

  const leftOffset = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div
      className="fixed top-14 end-0 z-30 bg-[var(--yellow-100)] border-b border-[var(--yellow-100)] px-4 py-2 flex items-center gap-2 transition-[inset-inline-start] duration-350 ease-out-expo [inset-inline-start:0] md:[inset-inline-start:var(--banner-left)]"
      style={{ '--banner-left': `${leftOffset}px` } as React.CSSProperties}
    >
      <AlertTriangleSVG />
      <p className="text-sm text-[var(--yellow-700)] flex-1">
        {t('transfer.actingAs')} <span className="font-semibold">{orgName}</span>
      </p>
      <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" onClick={exitTransferMode}>
        {t('transfer.exitMode')}
      </Button>
    </div>
  );
}
