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
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-3 rounded-full bg-red-100">
        <AlertCircleSVG />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Error</h3>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
