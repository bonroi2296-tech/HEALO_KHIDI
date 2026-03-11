/**
 * 수신자 수정 모달 컴포넌트
 */
import { useState } from "react";
import { formatPhoneInput } from "../../../../../src/lib/utils/phoneFormat";
import type { EditModalState } from "../_types";

interface EditRecipientModalProps {
  editModal: EditModalState;
  onCancel: () => void;
  onSave: (modal: EditModalState) => Promise<void>;
}

export function EditRecipientModal({ editModal, onCancel, onSave }: EditRecipientModalProps) {
  const [modal, setModal] = useState<EditModalState>(editModal);

  const updateModal = (field: keyof EditModalState, value: any) => {
    setModal((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.slice(0, 11);
    updateModal("phone", formatPhoneInput(limited));
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const cleaned = pastedText.replace(/\D/g, "").slice(0, 11);
    updateModal("phone", formatPhoneInput(cleaned));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-bold mb-4">수신자 정보 수정</h3>

        <div className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block mb-2 text-sm font-medium">이름</label>
            <input
              type="text"
              value={modal.label}
              onChange={(e) => updateModal("label", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="예: 김주영"
            />
          </div>

          {/* 채널 */}
          <div>
            <label className="block mb-2 text-sm font-medium">채널</label>
            <select
              value={modal.channel}
              onChange={(e) => updateModal("channel", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="sms">SMS</option>
              <option value="alimtalk">알림톡 (Alimtalk)</option>
              <option value="email">Email</option>
            </select>
          </div>

          {/* 전화번호 (SMS/Alimtalk) */}
          {(modal.channel === "sms" || modal.channel === "alimtalk") && (
            <div>
              <label className="block mb-2 text-sm font-medium">전화번호</label>
              <input
                type="text"
                value={modal.phone}
                onChange={handlePhoneChange}
                onPaste={handlePhonePaste}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="010-1234-5678 (새 번호로 변경 시 입력)"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 비워두면 기존 번호 유지
              </p>
            </div>
          )}

          {/* 이메일 (Email) */}
          {modal.channel === "email" && (
            <div>
              <label className="block mb-2 text-sm font-medium">이메일 주소</label>
              <input
                type="email"
                value={modal.email}
                onChange={(e) => updateModal("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="admin@healo.com"
              />
            </div>
          )}

          {/* 활성화 */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={modal.isActive}
                onChange={(e) => updateModal("isActive", e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
              />
              <span className="text-sm">활성화</span>
            </label>
          </div>

          {/* 비고 */}
          <div>
            <label className="block mb-2 text-sm font-medium">비고 (선택)</label>
            <textarea
              value={modal.notes}
              onChange={(e) => updateModal("notes", e.target.value)}
              className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md resize-y"
              placeholder="예: 운영팀 매니저"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => onSave(modal)}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
