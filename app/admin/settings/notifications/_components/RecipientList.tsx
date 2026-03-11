/**
 * 수신자 목록 테이블 컴포넌트
 */
import { RecipientCard } from "./RecipientCard";
import type { Recipient } from "../_types";

interface RecipientListProps {
  recipients: Recipient[];
  tableMissing: boolean;
  onToggle: (id: string, currentActive: boolean) => void;
  onEdit: (recipient: Recipient) => void;
  onTest: (id: string) => void;
  onDelete: (id: string, label: string) => void;
}

export function RecipientList({
  recipients,
  tableMissing,
  onToggle,
  onEdit,
  onTest,
  onDelete,
}: RecipientListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">이름</th>
            <th className="px-4 py-3 text-left">전화번호</th>
            <th className="px-4 py-3 text-left">이메일</th>
            <th className="px-4 py-3 text-center">활성</th>
            <th className="px-4 py-3 text-center">발송</th>
            <th className="px-4 py-3 text-center">실패</th>
            <th className="px-4 py-3 text-left">마지막 발송</th>
            <th className="px-4 py-3 text-center">작업</th>
          </tr>
        </thead>
        <tbody>
          {recipients.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                {tableMissing
                  ? "테이블이 존재하지 않습니다. 위 안내를 따라 마이그레이션을 실행하세요."
                  : "등록된 수신자가 없습니다."}
              </td>
            </tr>
          ) : (
            recipients.map((recipient) => (
              <RecipientCard
                key={recipient.id}
                recipient={recipient}
                onToggle={onToggle}
                onEdit={onEdit}
                onTest={onTest}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
