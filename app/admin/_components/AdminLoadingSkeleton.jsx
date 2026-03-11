"use client";

/**
 * 관리자 목록 로딩 시 일관된 스켈레톤 UI
 * @param {number} rows - 표시할 행 수
 * @param {string} className - 추가 클래스
 */
export function AdminLoadingSkeleton({ rows = 5, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
        >
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}
