import { Button } from '@/components/ui/button';

function AlertCircleSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M12 8v5M12 15v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

interface ErrorStateProps {
  message?: string;
  title?: string;
  hint?: string;
  onRetry?: () => void;
  action?: { label: string; onClick: () => void };
}

export function ErrorState({ message = 'Something went wrong.', title = 'Error', hint, onRetry, action }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="alert">
      <div className="mb-4 p-3 rounded-full bg-red-100 text-red-600">
        <AlertCircleSVG />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-1 max-w-md">{message}</p>
      {hint && <p className="text-xs text-gray-500 mb-4 max-w-md">{hint}</p>}
      <div className="flex gap-2 mt-2">
        {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>}
        {action && <Button size="sm" onClick={action.onClick}>{action.label}</Button>}
      </div>
    </div>
  );
}
