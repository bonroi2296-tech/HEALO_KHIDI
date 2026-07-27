/**
 * 수신자 추가 폼 컴포넌트
 */
import { formatPhoneInput } from "@/lib/utils/phoneFormat";
import { useRecipientForm } from "../_hooks/useRecipientForm";

interface AddRecipientFormProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>;
  showToast: (type: "success" | "error", message: string) => void;
}

export function AddRecipientForm({ onClose, onSubmit, showToast }: AddRecipientFormProps) {
  const {
    formData,
    submitting,
    setSubmitting,
    updateField,
    toggleChannel,
    validateForm,
    resetForm,
    prepareSubmitData,
  } = useRecipientForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.valid) {
      showToast("error", validation.error!);
      return;
    }

    try {
      setSubmitting(true);
      const body = prepareSubmitData();
      const result = await onSubmit(body);

      if (result.success) {
        showToast("success", "✅ 수신자가 추가되었습니다");
        resetForm();
        onClose();
      } else {
        showToast("error", `❌ 추가 실패: ${result.error}`);
      }
    } catch (_err: any) {
      showToast("error", "❌ 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.slice(0, 11);
    updateField("phone", formatPhoneInput(limited));
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const cleaned = pastedText.replace(/\D/g, "").slice(0, 11);
    updateField("phone", formatPhoneInput(cleaned));
  };

  return (
    <div className="mb-6 border border-gray-200 rounded-lg bg-white shadow-sm flex flex-col max-h-[80vh]">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="font-bold text-lg text-gray-900">새 수신자 추가</h3>
        <button
          type="button"
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="text-gray-500 hover:text-gray-600 transition-colors"
          title="닫기"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 본문 (스크롤 가능) */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
        {/* 이름 */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => updateField("label", e.target.value)}
            className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="예: 김주영"
            required
          />
        </div>

        {/* 채널 선택 */}
        <div>
          <label className="block mb-3 text-sm font-medium text-gray-700">
            알림 채널 선택 <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 ml-2">(다채널 선택 가능)</span>
          </label>
          <div className="space-y-3">
            {/* SMS */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.channels.includes("sms")}
                onChange={() => toggleChannel("sms")}
                className="mt-0.5 w-4 h-4 text-emerald-700 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">SMS</div>
                <div className="text-xs text-gray-500 mt-0.5">문자 메시지 (전 세계 지원)</div>
              </div>
            </label>

            {/* Alimtalk */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.channels.includes("alimtalk")}
                onChange={() => toggleChannel("alimtalk")}
                className="mt-0.5 w-4 h-4 text-emerald-700 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">알림톡 (Alimtalk)</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  💡 카카오 비즈 계정 + 템플릿 승인 필요 | 한국 전용
                </div>
              </div>
            </label>

            {/* Email */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.channels.includes("email")}
                onChange={() => toggleChannel("email")}
                className="mt-0.5 w-4 h-4 text-emerald-700 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Email</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  이메일 알림 (SMTP 설정 필요)
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* 전화번호 입력 (SMS/Alimtalk 선택 시) */}
        {(formData.channels.includes("sms") || formData.channels.includes("alimtalk")) && (
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={handlePhoneChange}
              onPaste={handlePhonePaste}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="010-1234-5678"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              💡 010으로 시작하는 11자리 숫자 (자동으로 하이픈이 추가됩니다)
            </p>
          </div>
        )}

        {/* 이메일 입력 (Email 선택 시) */}
        {formData.channels.includes("email") && (
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              이메일 주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="admin@healwith.co.kr"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              💡 유효한 이메일 형식을 입력하세요
            </p>
          </div>
        )}

        {/* 비고 */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            비고 (선택)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
            placeholder="예: 운영팀 매니저 / 평일만 수신"
          />
        </div>

        {/* 활성화 상태 */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
              className="w-4 h-4 text-emerald-700 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">생성 즉시 활성화</span>
          </label>
          <p className="text-xs text-gray-500 mt-1.5">
            비활성 상태로 생성하면 알림이 발송되지 않습니다
          </p>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "추가 중..." : "추가"}
          </button>
        </div>
      </form>
    </div>
  );
}
