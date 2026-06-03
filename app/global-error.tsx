'use client';

import React from 'react';

export const dynamic = 'force-dynamic';

export default function GlobalError({ error: _error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
