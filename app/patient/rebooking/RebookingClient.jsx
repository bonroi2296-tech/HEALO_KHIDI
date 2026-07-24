'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n/LangContext';
import { getVisaChecklist } from '@/lib/visa/visaGuide';

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

  // Visa section
  visaTitle: { ko: '의료비자 안내', en: 'Medical Visa Information', ru: 'Информация о медицинской визе', zh: '医疗签证信息', ja: '医療ビザ案内', kz: 'Медициналық виза туралы' },
  visaIntro: {
    ko: '재진을 위해 한국에 재입국할 때 필요한 비자 정보입니다. 체류 기간에 따라 적합한 비자 유형이 다릅니다.',
    en: 'Visa information for re-entry to Korea for follow-up visits. The right visa type depends on your length of stay.',
    ru: 'Информация о визе для повторного въезда в Корею на контрольные осмотры. Тип визы зависит от срока пребывания.',
    zh: '复诊时再次入境韩国所需的签证信息。签证类型取决于停留时间。',
    ja: '再診のため韓国に再入国する際に必要なビザ情報です。滞在期間により適切なビザが異なります。',
    kz: 'Қайта қабылдау үшін Кореяға қайта кіру кезінде қажет виза туралы ақпарат. Виза түрі сіздің болу мерзіміңізге байланысты.',
  },
  visaShort: { ko: '90일 이내 체류', en: 'Stay ≤ 90 days', ru: 'До 90 дней', zh: '90天以内', ja: '90日以内', kz: '90 күнге дейін' },
  visaLong: { ko: '91일 이상 장기 치료', en: 'Stay > 90 days', ru: 'Более 90 дней', zh: '91天以上', ja: '91日以上', kz: '91 күннен астам' },
  visaDocs: { ko: '필요 서류', en: 'Required Documents', ru: 'Необходимые документы', zh: '所需材料', ja: '必要書類', kz: 'Қажетті құжаттар' },
  visaProcessing: { ko: '처리 기간', en: 'Processing Time', ru: 'Срок обработки', zh: '处理时间', ja: '処理期間', kz: 'Өңдеу уақыты' },
  visaFee: { ko: '수수료', en: 'Fee', ru: 'Сбор', zh: '费用', ja: '手数料', kz: 'Алым' },
  visaNotes: { ko: '참고사항', en: 'Notes', ru: 'Примечания', zh: '注意事项', ja: '備考', kz: 'Ескертпелер' },
};

const SOURCE_COLORS = {
  followup: { bg: '#dbeafe', color: '#1e40af' },
  symptom: { bg: '#fef3c7', color: '#92400e' },
  doctor: { bg: '#d1fae5', color: '#065f46' },
};

// 사후관리 케이던스 제안(dispatch-surveys cron, schedule.kind='cadence')의 action별 라벨.
// 없으면 배지에 phase 원문(month_1 등 영어 키)이 노출된다.
const CADENCE_LABELS = {
  survey: { ko: '경과 설문', en: 'Progress survey', ru: 'Опрос о самочувствии', zh: '康复问卷', ja: '経過アンケート', kz: 'Денсаулық сауалнамасы' },
  medication_check: { ko: '복약 확인', en: 'Medication check', ru: 'Проверка приёма лекарств', zh: '用药确认', ja: '服薬確認', kz: 'Дәрі қабылдауын тексеру' },
  video_call: { ko: '화상 상담', en: 'Video consultation', ru: 'Видеоконсультация', zh: '视频咨询', ja: 'ビデオ相談', kz: 'Бейне кеңес' },
  lab_review: { ko: '검사 결과 리뷰', en: 'Lab results review', ru: 'Обзор результатов анализов', zh: '检查结果回顾', ja: '検査結果レビュー', kz: 'Талдау нәтижелерін қарау' },
};

// 배지 라벨: 케이던스 제안 → action 라벨 / 재예약 제안 → source 라벨 / 그 외 → followup 폴백
const scheduleLabel = (row, l) => {
  if (row.schedule?.kind === 'cadence') {
    return l(CADENCE_LABELS[row.schedule.action] || LABELS.followup);
  }
  const src = row.schedule?.source;
  return LABELS[src] ? l(LABELS[src]) : (row.current_phase || l(LABELS.followup));
};

const STATUS_LABELS = {
  scheduled: { ko: '예약됨', en: 'Scheduled', ru: 'Запланировано', zh: '已预约', ja: '予約済', kz: 'Жоспарланды' },
  active: { ko: '진행 중', en: 'Active', ru: 'Активно', zh: '进行中', ja: '進行中', kz: 'Белсенді' },
  completed: { ko: '완료', en: 'Completed', ru: 'Завершено', zh: '已完成', ja: '完了', kz: 'Аяқталды' },
  cancelled: { ko: '취소', en: 'Cancelled', ru: 'Отменено', zh: '已取消', ja: 'キャンセル', kz: 'Бас тартылды' },
  confirmed: { ko: '확정', en: 'Confirmed', ru: 'Подтверждено', zh: '已确认', ja: '確定', kz: 'Расталды' },
  dismissed: { ko: '무시함', en: 'Dismissed', ru: 'Отклонено', zh: '已忽略', ja: '無視', kz: 'Еленбеді' },
};

export default function RebookingClient() {
  const lang = useLang();
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

  const [rebookings, setRebookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // 정식 테이블 = followup_schedules (/api/portal/followup). 본인 patient_user_id 행만.
  const patchStatus = async (rb, status) => {
    setActionLoading(rb.id);
    try {
      const res = await fetch('/api/portal/followup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rb.id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setRebookings(prev => prev.filter(r => r.id !== rb.id));
        if (status === 'confirmed') setHistory(prev => [{ ...rb, status }, ...prev]);
      } else {
        console.error('[rebooking] patch failed', data);
      }
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };
  const handleConfirm = (rb) => patchStatus(rb, 'confirmed');
  const handleDismiss = (rb) => patchStatus(rb, 'dismissed');

  useEffect(() => {
    // followup_schedules: 대기 = pending/proposed, 이력 = confirmed/completed/dismissed
    fetch('/api/portal/followup')
      .then(r => r.json())
      .then(res => {
        if (res.ok) {
          const all = res.schedules || [];
          setRebookings(all.filter(s => ['pending', 'proposed'].includes(s.status)));
          setHistory(all.filter(s => !['pending', 'proposed'].includes(s.status)));
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

  const visaShort = getVisaChecklist('C-3-3', lang);
  const visaLong = getVisaChecklist('G-1-10', lang);

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
            const src = rb.schedule?.source;
            const sourceStyle = SOURCE_COLORS[src] || SOURCE_COLORS.followup;
            const sourceLabel = scheduleLabel(rb, l);
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
                    {sourceLabel}
                  </span>
                  <span style={{ fontSize: 13, color: '#666' }}>
                    {l(LABELS.scheduledAt)}: {formatDate(rb.next_action_at)}
                  </span>
                </div>

                {rb.cancer_type && (
                  <p style={{ fontSize: 14, color: '#444', marginBottom: 12, lineHeight: 1.5 }}>
                    {rb.cancer_type}
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

      {/* Medical Visa Information */}
      <section style={{ marginBottom: 32, padding: 20, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#0c4a6e' }}>{l(LABELS.visaTitle)}</h2>
        <p style={{ fontSize: 13, color: '#075985', marginBottom: 16, lineHeight: 1.5 }}>{l(LABELS.visaIntro)}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {[
            { label: l(LABELS.visaShort), visa: visaShort },
            { label: l(LABELS.visaLong), visa: visaLong },
          ].map(({ label, visa }) => (
            <div key={visa.visaType} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e0f2fe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af', marginRight: 8 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{visa.visaName}</span>
                </div>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {l(LABELS.visaFee)}: {visa.fee}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#475569', marginBottom: 10, lineHeight: 1.5 }}>{visa.description}</p>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                <strong>{l(LABELS.visaProcessing)}:</strong> {visa.processingTime}
              </div>
              <details style={{ fontSize: 12 }}>
                <summary style={{ cursor: 'pointer', color: '#0284c7', fontWeight: 600, marginBottom: 6 }}>
                  {l(LABELS.visaDocs)} ({visa.documents.length})
                </summary>
                <ul style={{ margin: '8px 0 0 16px', padding: 0, color: '#475569' }}>
                  {visa.documents.map((doc) => (
                    <li key={doc.id} style={{ marginBottom: 4 }}>
                      <strong>{doc.name}</strong> — {doc.description}
                    </li>
                  ))}
                </ul>
              </details>
              {visa.notes && (
                <div style={{ marginTop: 10, padding: 8, background: '#fffbeb', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
                  <strong>{l(LABELS.visaNotes)}:</strong> {visa.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

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
                    {scheduleLabel(h, l)}
                  </span>
                  <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>
                    {formatDate(h.next_action_at)}
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
