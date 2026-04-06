import Link from 'next/link';

export const metadata = { title: 'Page Not Found' };

export default function NotFound() {
  return (
    <main style={{ maxWidth: 600, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>404</h1>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#333' }}>
        Page Not Found
      </h2>
      <p style={{ color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block', padding: '12px 24px', borderRadius: 8,
          background: '#2563eb', color: '#fff', fontSize: 15, fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Go Home
      </Link>
    </main>
  );
}
