import { NetworkStatusIndicator } from '@/components/shared/NetworkStatusIndicator';

export function SuperAdminBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 h-8 flex items-center justify-center z-50" style={{ background: '#1E3A5F' }}>
      <span className="text-xs font-semibold tracking-wide" style={{ color: '#BFDBFE' }}>
        SUPER ADMIN MODE
      </span>
      <div className="absolute right-2 flex items-center">
        <NetworkStatusIndicator variant="ghost-dark" className="w-7 h-7" />
      </div>
    </div>
  );
}
