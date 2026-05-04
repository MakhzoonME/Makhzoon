'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

export default function OrgError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 7v5M11 14.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500 max-w-xs">
        An unexpected error occurred. Try again or refresh the page.
      </p>
      <Button onClick={reset} variant="outline" size="sm">Try again</Button>
    </div>
  );
}
