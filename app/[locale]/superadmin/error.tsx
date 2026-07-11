'use client';

export default function SuperAdminError({ error: _error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/50 border border-blue-700 text-blue-300">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 7v5M11 14.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-blue-100">Something went wrong</h2>
      <p className="text-sm text-blue-300 max-w-xs">
        An unexpected error occurred. Try again or refresh the page.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg border border-blue-700 text-sm text-blue-200 hover:bg-blue-900/50 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
