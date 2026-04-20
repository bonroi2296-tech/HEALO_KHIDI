'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import('@sentry/nextjs')
      .then((Sentry) => Sentry.captureException(error))
      .catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <main style={{ maxWidth: 600, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, marginBottom: 8 }}>500</h1>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#333' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
            A critical error occurred. Please reload the page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px', borderRadius: 8, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}
