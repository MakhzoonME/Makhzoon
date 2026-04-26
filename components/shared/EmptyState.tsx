import { Button } from '@/components/ui/button';

/* Generic empty-box SVG illustration ─────────────────────────────── */
function EmptyBoxSVG() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
      {/* outer box */}
      <rect x="8" y="20" width="48" height="36" rx="4" fill="var(--gray-100)" stroke="var(--gray-200)" strokeWidth="1.5" />
      {/* box flap */}
      <path d="M8 30h20l4-6h0l4 6H56" stroke="var(--gray-300)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* centre crease */}
      <path d="M32 24v32" stroke="var(--gray-200)" strokeWidth="1" strokeDasharray="3 2" />
      {/* magnifying glass */}
      <circle cx="43" cy="17" r="8" fill="#fff" stroke="var(--primary-200)" strokeWidth="2" />
      <path d="M43 13v8M39 17h8" stroke="var(--primary-300)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M49 23l4 4" stroke="var(--primary-300)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="mb-4">
        <EmptyBoxSVG />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs mb-5">{description}</p>}
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
