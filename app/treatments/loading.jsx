export default function TreatmentsLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ height: 32, background: '#f3f4f6', borderRadius: 8, width: '30%', marginBottom: 24, animation: 'pulse 1.5s infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid #f3f4f6', borderRadius: 12, padding: 20, background: '#fff' }}>
            <div style={{ height: 18, background: '#f3f4f6', borderRadius: 6, width: '70%', marginBottom: 10, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '90%', marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '60%', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
