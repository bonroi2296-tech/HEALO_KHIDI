'use client';

export default function Error({ error, reset }) {
  return (
    <main style={{ maxWidth: 600, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>500</h1>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#333' }}>
        Something went wrong
      </h2>
      <p style={{ color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
        An unexpected error occurred. Please try again.
      </p>
      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 13, textAlign: 'left', overflow: 'auto', marginBottom: 24 }}>
          {error.message}
        </pre>
      )}
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
  );
}
