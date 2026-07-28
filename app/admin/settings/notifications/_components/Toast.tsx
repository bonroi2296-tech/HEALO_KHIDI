/**
 * 토스트 알림 컴포넌트
 */
import type { ToastMessage } from "../_hooks/useToast";

interface ToastProps {
  toast: ToastMessage;
}

export function Toast({ toast }: ToastProps) {
  return (
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-6 z-50 animate-fade-in">
      <div
        className="px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]"
        style={{
          backgroundColor: toast.type === "success" ? "#16a34a" : "#dc2626",
          color: "#ffffff",
        }}
      >
        <span className="text-xl" style={{ color: "#ffffff" }}>
          {toast.type === "success" ? "✓" : "✕"}
        </span>
        <span className="font-medium" style={{ color: "#ffffff" }}>
          {toast.message}
        </span>
      </div>
    </div>
  );
}
