'use client';

/**
 * Reusable loading skeleton component.
 *
 * Usage:
 *   <LoadingSkeleton lines={4} />
 *   <LoadingSkeleton type="card" count={3} />
 *   <LoadingSkeleton type="table" rows={5} />
 */
export default function LoadingSkeleton({ type = 'lines', lines = 3, count = 1, rows = 5 }) {
  if (type === 'card') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ border: '1px solid #eee', borderRadius: 12, padding: 20, background: '#fff' }}>
            <div style={{ height: 20, background: '#f3f4f6', borderRadius: 6, marginBottom: 12, width: '60%', animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, marginBottom: 8, width: '90%', animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, marginBottom: 8, width: '75%', animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '40%', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 16, padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #eee' }}>
          {[40, 25, 20, 15].map((w, i) => (
            <div key={i} style={{ height: 14, background: '#e5e7eb', borderRadius: 4, width: `${w}%`, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            {[40, 25, 20, 15].map((w, j) => (
              <div key={j} style={{ height: 14, background: '#f3f4f6', borderRadius: 4, width: `${w}%`, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default: lines
  return (
    <div style={{ padding: 20 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 14,
            background: '#f3f4f6',
            borderRadius: 6,
            marginBottom: 10,
            width: `${90 - i * 10}%`,
            animation: 'pulse 1.5s infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
