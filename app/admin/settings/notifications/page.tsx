/**
 * HEALO: 관리자 알림 설정 페이지 (리팩토링 버전)
 * 
 * 경로: /admin/settings/notifications
 * 
 * 개선 사항:
 * - 909 라인 → ~200 라인으로 축소
 * - 커스텀 훅으로 로직 분리 (useNotificationRecipients, useToast, useRecipientForm)
 * - UI 컴포넌트 분리 (RecipientList, AddRecipientForm, EditRecipientModal, Toast)
 * - 가독성 및 유지보수성 대폭 향상
 */
"use client";

import { useState } from "react";
import AdminFormFooter from "../../_components/AdminFormFooter";
import { AdminGuideModal } from "../../_components/AdminGuideModal";
import { useNotificationRecipients } from "./_hooks/useNotificationRecipients";
import { useToast } from "./_hooks/useToast";
import { RecipientList } from "./_components/RecipientList";
import { AddRecipientForm } from "./_components/AddRecipientForm";
import { EditRecipientModal } from "./_components/EditRecipientModal";
import { Toast } from "./_components/Toast";
import { cleanPhone } from "../../../../src/lib/utils/phoneFormat";
import type { Recipient, EditModalState } from "./_types";

export default function NotificationsSettingsPage() {
  const {
    recipients,
    loading,
    error,
    errorCode,
    toggleRecipient,
    deleteRecipient,
    updateRecipient,
    addRecipient,
  } = useNotificationRecipients();

  const { toast, showToast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const tableMissing = errorCode === "TABLE_NOT_FOUND";

  // 토글 핸들러
  const handleToggle = async (id: string, currentActive: boolean) => {
    const result = await toggleRecipient(id, currentActive);
    if (result.success) {
      showToast("success", "✅ 상태가 변경되었습니다");
    } else {
      showToast("error", `❌ 토글 실패: ${result.error}`);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`${label} 수신자를 삭제하시겠습니까?`)) {
      return;
    }

    const result = await deleteRecipient(id);
    if (result.success) {
      showToast("success", "✅ 삭제되었습니다");
    } else {
      showToast("error", `❌ 삭제 실패: ${result.error}`);
    }
  };

  // 수정 모달 열기
  const handleEditStart = (recipient: Recipient) => {
    setEditModal({
      id: recipient.id,
      label: recipient.label,
      channel: recipient.channel as "sms" | "alimtalk" | "email",
      phone: "",
      email: recipient.email || "",
      isActive: recipient.is_active,
      notes: "",
    });
  };

  // 수정 저장
  const handleEditSave = async (modal: EditModalState) => {
    const body: any = {
      label: modal.label,
      channel: modal.channel,
      is_active: modal.isActive,
    };

    if (modal.phone.trim()) {
      body.phone_e164 = cleanPhone(modal.phone);
    }

    if (modal.email.trim()) {
      body.email = modal.email.trim();
    }

    if (modal.notes.trim()) {
      body.notes = modal.notes.trim();
    }

    const result = await updateRecipient(modal.id, body);
    if (result.success) {
      showToast("success", "✅ 수정되었습니다");
      setEditModal(null);
    } else {
      showToast("error", `❌ 수정 실패: ${result.error}`);
    }
  };

  // 테스트 알림
  const handleTestNotification = async (recipientId?: string) => {
    try {
      const endpoint = recipientId
        ? `/api/admin/notification-recipients/test?recipientId=${recipientId}`
        : `/api/admin/notification-recipients/test`;

      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        showToast("success", `✅ 테스트 알림 전송 완료 (성공: ${data.successCount}, 실패: ${data.failCount})`);
      } else {
        showToast("error", `❌ 테스트 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (err: any) {
      showToast("error", `❌ 오류: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {showGuide && (
        <AdminGuideModal title="알림 관리 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>문의 접수·리드 등 이벤트 발생 시 <strong>알림을 받을 수신자</strong>를 등록·수정·삭제합니다. SMS, 알림톡, 이메일 등 채널별로 수신자를 두고 테스트 발송으로 동작을 확인할 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <p className="text-gray-600 text-sm">수신자 추가로 연락처·채널을 등록하고, 활성/비활성 토글로 수신 여부를 제어합니다. 「테스트 알림」으로 실제 발송을 시험해 보세요.</p>
          </section>
        </AdminGuideModal>
      )}
      {/* Note: AdminFormFooter 는 onPrimary/onCancel 콜백이 필수 — 현재 페이지에서는
          별도 푸터 버튼이 필요 없으므로 제거. 구 API 호출 흔적으로 남아있던 것. */}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">알림 수신자 관리</h1>
            <p className="text-sm text-gray-600 mt-1">
              문의 접수 시 알림을 받을 수신자를 관리합니다
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              사용 가이드
            </button>
            <button
              onClick={() => setShowAddForm(true)}
            disabled={tableMissing || showAddForm}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              tableMissing || showAddForm
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            + 수신자 추가
          </button>
          </div>
        </div>

        {/* 테이블 누락 경고 */}
        {tableMissing && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
            <h3 className="font-bold mb-2">⚠️ 테이블이 존재하지 않습니다</h3>
            <p className="text-sm">
              다음 SQL을 실행하세요:{" "}
              <code className="bg-yellow-100 px-2 py-1 rounded">
                migrations/20260204_add_admin_notification_logs.sql
              </code>
            </p>
          </div>
        )}

        {/* 일반 오류 */}
        {error && errorCode !== "TABLE_NOT_FOUND" && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            오류: {error}
          </div>
        )}

        {/* 추가 폼 */}
        {showAddForm && (
          <AddRecipientForm
            onClose={() => setShowAddForm(false)}
            onSubmit={addRecipient}
            showToast={showToast}
          />
        )}

        {/* 로딩 */}
        {loading && !recipients.length && (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        )}

        {/* 수신자 목록 */}
        {!loading && (
          <RecipientList
            recipients={recipients}
            tableMissing={tableMissing}
            onToggle={handleToggle}
            onEdit={handleEditStart}
            onTest={handleTestNotification}
            onDelete={handleDelete}
          />
        )}

        {/* 활성 수신자 0명 경고 */}
        {recipients.filter((r) => r.is_active).length === 0 && !tableMissing && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-bold mb-2 text-red-800">⚠️ 경고: 활성 수신자가 없습니다</h3>
            <p className="text-sm text-red-700 mb-2">
              현재 활성화된 수신자가 없어 <strong>알림이 발송되지 않습니다</strong>.
            </p>
            <p className="text-sm text-red-600">
              비상 시 ADMIN_PHONE_NUMBERS 환경변수로 대체 가능합니다.
            </p>
          </div>
        )}

        {/* 테스트 알림 */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => handleTestNotification()}
            disabled={tableMissing || recipients.length === 0}
            className={`px-4 py-2 rounded ${
              tableMissing || recipients.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            📱 전체 수신자 테스트 발송
          </button>

          <p className="text-sm text-gray-600 self-center">
            {tableMissing
              ? "(마이그레이션 실행 후 사용 가능)"
              : recipients.length === 0
              ? "(수신자를 먼저 추가하세요)"
              : "활성화된 모든 수신자에게 테스트 알림을 발송합니다."}
          </p>
        </div>
      </div>

      {/* 수정 모달 */}
      {editModal && (
        <EditRecipientModal
          editModal={editModal}
          onCancel={() => setEditModal(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} />}
    </div>
  );
}
