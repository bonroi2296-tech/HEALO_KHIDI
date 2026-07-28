/**
 * 수신자 카드 컴포넌트
 */
import type { Recipient } from "../_types";

interface RecipientCardProps {
  recipient: Recipient;
  onToggle: (id: string, currentActive: boolean) => void;
  onEdit: (recipient: Recipient) => void;
  onTest: (id: string) => void;
  onDelete: (id: string, label: string) => void;
}

export function RecipientCard({
  recipient,
  onToggle,
  onEdit,
  onTest,
  onDelete,
}: RecipientCardProps) {
  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-3">{recipient.label}</td>
      <td className="px-4 py-3 font-mono text-sm">
        {recipient.phone_masked || <span className="text-gray-500">-</span>}
      </td>
      <td className="px-4 py-3 font-mono text-sm">
        {recipient.email ? (
          <span className="text-blue-600">{recipient.email}</span>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggle(recipient.id, recipient.is_active)}
          className={`px-3 py-1 rounded text-sm ${
            recipient.is_active
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {recipient.is_active ? "활성" : "비활성"}
        </button>
      </td>
      <td className="px-4 py-3 text-center">{recipient.sent_count}</td>
      <td className="px-4 py-3 text-center">
        {recipient.failed_count > 0 ? (
          <span className="text-red-600">{recipient.failed_count}</span>
        ) : (
          0
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {recipient.last_sent_at
          ? new Date(recipient.last_sent_at).toLocaleString("ko-KR")
          : "-"}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onEdit(recipient)}
            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
            title="수신자 정보 수정"
          >
            수정
          </button>
          <button
            onClick={() => onTest(recipient.id)}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
            title="이 수신자에게만 테스트 발송"
          >
            테스트
          </button>
          <button
            onClick={() => onDelete(recipient.id, recipient.label)}
            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}
