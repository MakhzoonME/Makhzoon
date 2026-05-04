import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gray-100 mb-5">
        <span className="text-gray-300 [&>svg]:h-8 [&>svg]:w-8">
          {icon ?? (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
              <rect x="4" y="10" width="24" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 15h10l2-3 2 3h10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="22" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M25 11l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </div>
      <h3 className="t-h3 text-gray-900 mb-1.5">{title}</h3>
      {description && <p className="t-body muted max-w-xs mb-5">{description}</p>}
      {action && (
        <Button onClick={action.onClick}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          {action.label}
        </Button>
      )}
    </div>
  );
}
