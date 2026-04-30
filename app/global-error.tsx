'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Something went wrong</h2>
          <button onClick={reset} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
