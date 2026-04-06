'use client';

/**
 * Reusable empty state component.
 *
 * Usage:
 *   <EmptyState icon="📋" title="데이터가 없습니다" description="새로 추가하거나 필터를 조정해보세요" />
 *   <EmptyState icon="🔍" title="검색 결과 없음" />
 */
export default function EmptyState({ icon = '📋', title, description, action }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 20px',
      background: '#f9fafb',
      borderRadius: 12,
      border: '1px solid #f3f4f6',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#555', marginBottom: 4 }}>
        {title || 'No data'}
      </p>
      {description && (
        <p style={{ fontSize: 14, color: '#888', marginBottom: action ? 16 : 0 }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
