/**
 * HEALO: 관리자 폼 공용 Footer 컴포넌트
 * 
 * 목적:
 * - 추가/수정 폼의 버튼 영역을 통일
 * - 일관된 레이아웃과 스타일 제공
 * 
 * 레이아웃:
 * - 왼쪽: Primary 버튼 (추가/저장)
 * - 오른쪽: Secondary 버튼 (취소)
 * 
 * 원칙:
 * - 버튼은 disabled여도 항상 visible (hidden/invisible/opacity-0 금지)
 * - grid layout으로 확실한 배치 보장
 */

interface AdminFormFooterProps {
  onPrimary: () => void;
  onCancel: () => void;
  primaryLabel?: string; // "추가" | "저장"
  primaryLoadingLabel?: string; // "추가 중..." | "저장 중..."
  isLoading?: boolean;
  isDisabled?: boolean;
}

export default function AdminFormFooter({
  onPrimary,
  onCancel,
  primaryLabel = "추가",
  primaryLoadingLabel = "처리 중...",
  isLoading = false,
  isDisabled = false,
}: AdminFormFooterProps) {
  return (
    <div className="w-full border-t border-gray-200 bg-white px-6 py-4">
      {/* 오른쪽 하단에 버튼 그룹 배치 */}
      <div className="flex justify-end items-center gap-2">
        {/* Primary 버튼 (추가/저장) - 초록색 배경 + 흰색 텍스트 */}
        <button
          type="button"
          onClick={onPrimary}
          disabled={isLoading || isDisabled}
          style={{
            backgroundColor: (isLoading || isDisabled) ? "#d1d5db" : "#059669",
            color: (isLoading || isDisabled) ? "#6b7280" : "#ffffff",
          }}
          className="h-10 px-6 font-semibold rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isLoading ? primaryLoadingLabel : primaryLabel}
        </button>

        {/* Secondary 버튼 (취소) - 흰색 배경 + 검은색 텍스트 */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          style={{
            backgroundColor: "#ffffff",
            color: "#111827",
            borderColor: "#d1d5db",
          }}
          className="h-10 px-6 font-semibold border-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}
