'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';
import { cancerTypeLabelL } from '@/lib/khidi/medicalLabels';
import { getVisaChecklist } from '@/lib/visa/visaGuide';

// 화면 문구는 중앙 i18n 사전 patientRebooking.* 키(6개 활성언어 ko·en·ru·kz·zh·ja)

const SOURCE_COLORS = {
  followup: { bg: '#dbeafe', color: '#1e40af' },
  symptom: { bg: '#fef3c7', color: '#92400e' },
  doctor: { bg: '#d1fae5', color: '#065f46' },
};

// 사후관리 케이던스 제안(dispatch-surveys cron, schedule.kind='cadence')의 action 코드.
// 라벨은 patientRebooking.cadence.* — 없으면 followup 라벨로 폴백.
const CADENCE_ACTIONS = ['survey', 'medication_check', 'video_call', 'lab_review'];

// 재예약 제안 source 코드 — 라벨은 patientRebooking.followup/symptom/doctor
const SOURCE_KEYS = ['followup', 'symptom', 'doctor'];

// 배지 라벨: 케이던스 제안 → action 라벨 / 재예약 제안 → source 라벨 / 그 외 → followup 폴백
const scheduleLabel = (row, lang) => {
  if (row.schedule?.kind === 'cadence') {
    return t(
      CADENCE_ACTIONS.includes(row.schedule.action)
        ? `patientRebooking.cadence.${row.schedule.action}`
        : 'patientRebooking.followup',
      lang
    );
  }
  const src = row.schedule?.source;
  // ⚠️ 폴백으로 current_phase 를 그대로 쓰면 환자 화면에 «month_3» 같은 DB 코드가 그대로 뜬다
  // (2026-08-25 실측). 모르는 값이면 일반 라벨로 내린다 — 환자에게 코드를 보여주지 않는다.
  return SOURCE_KEYS.includes(src)
    ? t(`patientRebooking.${src}`, lang)
    : t('patientRebooking.followup', lang);
};

// 상태 코드(DB값) — 라벨은 patientRebooking.status.* , 미지의 코드는 scheduled 로 폴백
const STATUS_KEYS = ['scheduled', 'active', 'completed', 'cancelled', 'confirmed', 'dismissed'];

export default function RebookingClient() {
  const lang = useLang();

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
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>{t('patientRebooking.loading', lang)}</div>;
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }} aria-label={t('patientRebooking.title', lang)}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{t('patientRebooking.title', lang)}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{t('patientRebooking.subtitle', lang)}</p>

      {/* Pending Rebookings */}
      {rebookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#f9fafb', borderRadius: 12, color: '#888', marginBottom: 32 }}>
          {t('patientRebooking.noRebookings', lang)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {rebookings.map(rb => {
            const src = rb.schedule?.source;
            const sourceStyle = SOURCE_COLORS[src] || SOURCE_COLORS.followup;
            const sourceLabel = scheduleLabel(rb, lang);
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
                    {t('patientRebooking.scheduledAt', lang)}: {formatDate(rb.next_action_at)}
                  </span>
                </div>

                {rb.cancer_type && (
                  <p style={{ fontSize: 14, color: '#444', marginBottom: 12, lineHeight: 1.5 }}>
                    {cancerTypeLabelL(rb.cancer_type, lang)}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleDismiss(rb)}
                    disabled={actionLoading === rb.id}
                    aria-label={t('patientRebooking.dismiss', lang)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd',
                      background: '#fff', color: '#666', cursor: 'pointer', fontSize: 13,
                      opacity: actionLoading === rb.id ? 0.5 : 1,
                    }}
                  >
                    {t('patientRebooking.dismiss', lang)}
                  </button>
                  <button
                    onClick={() => handleConfirm(rb)}
                    disabled={actionLoading === rb.id}
                    aria-label={t('patientRebooking.confirm', lang)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      opacity: actionLoading === rb.id ? 0.5 : 1,
                    }}
                  >
                    {actionLoading === rb.id ? '...' : t('patientRebooking.confirm', lang)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Medical Visa Information */}
      <section style={{ marginBottom: 32, padding: 20, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#0c4a6e' }}>{t('patientRebooking.visaTitle', lang)}</h2>
        <p style={{ fontSize: 13, color: '#075985', marginBottom: 16, lineHeight: 1.5 }}>{t('patientRebooking.visaIntro', lang)}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {[
            { label: t('patientRebooking.visaShort', lang), visa: visaShort },
            { label: t('patientRebooking.visaLong', lang), visa: visaLong },
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
                  {t('patientRebooking.visaFee', lang)}: {visa.fee}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#475569', marginBottom: 10, lineHeight: 1.5 }}>{visa.description}</p>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                <strong>{t('patientRebooking.visaProcessing', lang)}:</strong> {visa.processingTime}
              </div>
              <details style={{ fontSize: 12 }}>
                <summary style={{ cursor: 'pointer', color: '#0284c7', fontWeight: 600, marginBottom: 6 }}>
                  {t('patientRebooking.visaDocs', lang)} ({visa.documents.length})
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
                  <strong>{t('patientRebooking.visaNotes', lang)}:</strong> {visa.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      {history.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{t('patientRebooking.history', lang)}</h2>
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
                    {scheduleLabel(h, lang)}
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
                  {t(`patientRebooking.status.${STATUS_KEYS.includes(h.status) ? h.status : 'scheduled'}`, lang)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
