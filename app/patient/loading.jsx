export default function PatientLoading() {
  return (
    <div style={{
      maxWidth: 700, margin: '0 auto', padding: '24px 16px',
    }}>
      {/* Title skeleton */}
      <div style={{ height: 28, background: '#f3f4f6', borderRadius: 8, width: '40%', marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
      <div style={{ height: 16, background: '#f3f4f6', borderRadius: 6, width: '60%', marginBottom: 24, animation: 'pulse 1.5s infinite' }} />
      {/* Content skeleton */}
      {[90, 80, 70, 85, 60].map((w, i) => (
        <div key={i} style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: `${w}%`, marginBottom: 10, animation: 'pulse 1.5s infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
