"use client";

/**
 * 관리자 페이지용 사용 가이드 모달.
 * 제목 + 본문(children) + 닫기. 배경 클릭 시 닫힘.
 */
export function AdminGuideModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-600 transition"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-6 text-sm text-gray-700 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
