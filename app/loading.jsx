export default function Loading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, border: '3px solid #e5e7eb',
        borderTop: '3px solid #0d9488', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
