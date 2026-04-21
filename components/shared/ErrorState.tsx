import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-3 rounded-full bg-red-100">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Error</h3>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
