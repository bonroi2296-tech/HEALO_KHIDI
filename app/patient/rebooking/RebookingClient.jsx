'use client';

import { useState, useEffect } from 'react';
import { getLangCodeFromCookie } from '../../../src/lib/i18n';

const LABELS = {
  title: { ko: '재예약 관리', en: 'Rebooking Management', ru: 'Управление повторной записью', zh: '复诊管理', ja: '再予約管理', kz: 'Қайта жазылу басқару' },
  subtitle: { ko: '자동 추천된 재진 예약', en: 'Auto-recommended follow-up appointments', ru: 'Автоматически рекомендованные повторные приёмы', zh: '自动推荐的后续预约', ja: '自動推奨フォローアップ予約', kz: 'Автоматты ұсынылған қайта қабылдаулар' },
  noRebookings: { ko: '현재 추천된 재예약이 없습니다', en: 'No recommended rebookings at this time', ru: 'В данный момент рекомендованных записей нет', zh: '目前没有推荐的复诊', ja: '現在推奨される再予約はありません', kz: 'Қазір ұсынылған жазбалар жоқ' },
  confirm: { ko: '예약 확정', en: 'Confirm Booking', ru: 'Подтвердить запись', zh: '确认预约', ja: '予約確定', kz: 'Жазылуды растау' },
  dismiss: { ko: '무시', en: 'Dismiss', ru: 'Отклонить', zh: '忽略', ja: '無視', kz: 'Елемеу' },
  source: { ko: '트리거', en: 'Trigger', ru: 'Триггер', zh: '触发', ja: 'トリガー', kz: 'Триггер' },
  reason: { ko: '사유', en: 'Reason', ru: 'Причина', zh: '原因', ja: '理由', kz: 'Себеп' },
  scheduledAt: { ko: '예정일', en: 'Scheduled', ru: 'Запланировано', zh: '预定日期', ja: '予定日', kz: 'Жоспарланған' },
  status: { ko: '상태', en: 'Status', ru: 'Статус', zh: '状态', ja: 'ステータス', kz: 'Мәртебе' },
  history: { ko: '예약 이력', en: 'Booking History', ru: 'История записей', zh: '预约历史', ja: '予約履歴', kz: 'Жазылу тарихы' },
  loading: { ko: '로딩 중...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...', ja: '読み込み中...', kz: 'Жүктелуде...' },
  followup: { ko: '팔로업 기반', en: 'Follow-up Based', ru: 'По плану наблюдения', zh: '随访触发', ja: 'フォローアップ', kz: 'Бақылау жоспары бойынша' },
  symptom: { ko: '증상 기반', en: 'Symptom Based', ru: 'По симптомам', zh: '症状触发', ja: '症状ベース', kz: 'Симптом бойынша' },
  doctor: { ko: '의사 권고', en: 'Doctor Recommended', ru: 'По рекомендации врача', zh: '医生推荐', ja: '医師推奨', kz: 'Дәрігер ұсынысы' },
};

const SOURCE_COLORS = {
  followup: { bg: '#dbeafe', color: '#1e40af' },
  symptom: { bg: '#fef3c7', color: '#92400e' },
  doctor: { bg: '#d1fae5', color: '#065f46' },
};

const STATUS_LABELS = {
  scheduled: { ko: '예약됨', en: 'Scheduled', ru: 'Запланировано', zh: '已预约', ja: '予約済', kz: 'Жоспарланды' },
  active: { ko: '진행 중', en: 'Active', ru: 'Активно', zh: '进行中', ja: '進行中', kz: 'Белсенді' },
  completed: { ko: '완료', en: 'Completed', ru: 'Завершено', zh: '已完成', ja: '完了', kz: 'Аяқталды' },
  cancelled: { ko: '취소', en: 'Cancelled', ru: 'Отменено', zh: '已取消', ja: 'キャンセル', kz: 'Бас тартылды' },
};

export default function RebookingClient() {
  const [lang, setLang] = useState('en');
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

  const [rebookings, setRebookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const handleConfirm = async (rb) => {
    setActionLoading(rb.id);
    try {
      await fetch(`/api/khidi/consultation/${rb.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'scheduled', notes: rb.notes + ' [Confirmed by patient]' }),
      });
      setRebookings(prev => prev.filter(r => r.id !== rb.id));
      setHistory(prev => [rb, ...prev]);
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const handleDismiss = async (rb) => {
    setActionLoading(rb.id);
    try {
      await fetch(`/api/khidi/consultation/${rb.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      setRebookings(prev => prev.filter(r => r.id !== rb.id));
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  useEffect(() => {
    // Fetch rebooking consultations
    fetch('/api/khidi/consultation?status=scheduled')
      .then(r => r.json())
      .then(res => {
        if (res.ok) {
          const rebooks = (res.data || []).filter(s => s.rebooking_source);
          const hist = (res.data || []).filter(s => !s.rebooking_source);
          setRebookings(rebooks);
          setHistory(hist);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : lang === 'ru' || lang === 'kz' ? 'ru-RU' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getSourceLabel = (source) => {
    if (source === 'followup') return l(LABELS.followup);
    if (source === 'symptom') return l(LABELS.symptom);
    if (source === 'doctor') return l(LABELS.doctor);
    return source;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>{l(LABELS.loading)}</div>;
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }} aria-label={l(LABELS.title)}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{l(LABELS.title)}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{l(LABELS.subtitle)}</p>

      {/* Pending Rebookings */}
      {rebookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#f9fafb', borderRadius: 12, color: '#888', marginBottom: 32 }}>
          {l(LABELS.noRebookings)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {rebookings.map(rb => {
            const sourceStyle = SOURCE_COLORS[rb.rebooking_source] || SOURCE_COLORS.followup;
            return (
              <div
                key={rb.id}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: 12, padding: 20,
                  background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 12,
                    background: sourceStyle.bg, color: sourceStyle.color,
                  }}>
                    {getSourceLabel(rb.rebooking_source)}
                  </span>
                  <span style={{ fontSize: 13, color: '#666' }}>
                    {l(LABELS.scheduledAt)}: {formatDate(rb.scheduled_at)}
                  </span>
                </div>

                {rb.notes && (
                  <p style={{ fontSize: 14, color: '#444', marginBottom: 12, lineHeight: 1.5 }}>
                    {rb.notes.replace('[Auto-rebooking] ', '')}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleDismiss(rb)}
                    disabled={actionLoading === rb.id}
                    aria-label={l(LABELS.dismiss)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd',
                      background: '#fff', color: '#666', cursor: 'pointer', fontSize: 13,
                      opacity: actionLoading === rb.id ? 0.5 : 1,
                    }}
                  >
                    {l(LABELS.dismiss)}
                  </button>
                  <button
                    onClick={() => handleConfirm(rb)}
                    disabled={actionLoading === rb.id}
                    aria-label={l(LABELS.confirm)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      opacity: actionLoading === rb.id ? 0.5 : 1,
                    }}
                  >
                    {actionLoading === rb.id ? '...' : l(LABELS.confirm)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{l(LABELS.history)}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 10).map(h => (
              <div
                key={h.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: '#f9fafb', borderRadius: 8,
                  border: '1px solid #eee',
                }}
              >
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {h.session_type === 'follow_up' ? 'Follow-up' : h.session_type === 'emergency' ? 'Emergency' : h.session_type === 'diagnostic' ? 'Diagnostic' : 'Pre-consultation'}
                  </span>
                  <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>
                    {formatDate(h.scheduled_at)}
                  </span>
                </div>
                <span style={{
                  fontSize: 12, padding: '3px 8px', borderRadius: 8,
                  background: h.status === 'completed' ? '#d1fae5' : h.status === 'cancelled' ? '#fee2e2' : '#dbeafe',
                  color: h.status === 'completed' ? '#065f46' : h.status === 'cancelled' ? '#991b1b' : '#1e40af',
                }}>
                  {l(STATUS_LABELS[h.status] || STATUS_LABELS.scheduled)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
