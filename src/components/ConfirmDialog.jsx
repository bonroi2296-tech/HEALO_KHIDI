'use client';

import { useEffect, useRef } from 'react';

/**
 * Accessible confirmation dialog to replace browser confirm().
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="삭제 확인"
 *     message="정말 삭제하시겠습니까?"
 *     confirmText="삭제"
 *     cancelText="취소"
 *     isDangerous
 *     onConfirm={() => handleDelete()}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmDialog({
  open,
  title = '확인',
  message,
  confirmText = '확인',
  cancelText = '취소',
  isDangerous = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Dialog */}
      <div style={{
        position: 'relative', background: '#fff', borderRadius: 16,
        padding: '24px 28px', maxWidth: 400, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h3 id="confirm-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {title}
        </h3>
        {message && (
          <p id="confirm-message" style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 20 }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid #ddd',
              background: '#fff', color: '#555', fontSize: 14, cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: isDangerous ? '#ef4444' : '#2563eb',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
