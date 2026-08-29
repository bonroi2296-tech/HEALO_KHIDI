'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n/LangContext';
import { t, dateLocale } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  Activity, AlertTriangle, Plus, Send, Trash2,
  CheckCircle, Clock, ChevronDown,
} from 'lucide-react';
import EmergencyNumbers from '@/components/EmergencyNumbers';
import ProgressUploadCard from './ProgressUploadCard';

// DB urgency_level 코드 → 표시 라벨 키(중앙 사전) + 색상 클래스
const URGENCY_STYLE = {
  emergency: { label: 'patientSymptoms.urgencyLevel.emergency', color: 'bg-red-100 text-red-800' },
  high: { label: 'patientSymptoms.urgencyLevel.high', color: 'bg-orange-100 text-orange-800' },
  medium: { label: 'patientSymptoms.urgencyLevel.medium', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'patientSymptoms.urgencyLevel.low', color: 'bg-green-100 text-green-800' },
  minimal: { label: 'patientSymptoms.urgencyLevel.minimal', color: 'bg-gray-100 text-gray-600' },
};

export default function SymptomsClient() {
  const router = useRouter();
  const lang = useLang();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [symptoms, setSymptoms] = useState([{ name: '', severity: 5, duration: '' }]);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [previousReports, setPreviousReports] = useState([]);
  const [showPrevious, setShowPrevious] = useState(false);

  // 본인 증상기록 불러오기 (mine=true → patient_user_id 본인 것만)
  const loadReports = async (token) => {
    try {
      const res = await fetch('/api/portal/symptoms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setPreviousReports(data.reports || []);
    } catch (e) { console.error('Load reports error:', e); }
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session);
        await loadReports(session.access_token);
      }
      setLoading(false);
    };
    init();
  }, []);

  const addSymptom = () => {
    setSymptoms(prev => [...prev, { name: '', severity: 5, duration: '' }]);
  };

  const removeSymptom = (index) => {
    setSymptoms(prev => prev.filter((_, i) => i !== index));
  };

  const updateSymptom = (index, field, value) => {
    setSymptoms(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => {
    const validSymptoms = symptoms.filter(s => s.name.trim());
    if (validSymptoms.length === 0) return;

    setSubmitting(true);
    setResult(null);
    setSubmitError(null);

    try {
      const res = await fetch('/api/portal/symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          symptoms: validSymptoms.map(s => ({
            name: s.name.trim(),
            severity: Number(s.severity),
            duration: s.duration.trim() || undefined,
          })),
          language: lang,
        }),
      });

      const data = await res.json();
      // ⚠️ 서버는 분석은 됐지만 DB 저장이 실패하면 { ok:true, analysis, saved:false } 를 준다.
      //    이때도 「완료」로 처리하면 환자는 보고된 줄 알지만 코디·의사에게 안 가고 본인 이력에도
      //    안 남는다(응급 권고가 나온 케이스면 특히 위험). 저장이 실제로 됐을 때만 성공 UI. (2026-08-14 감사)
      if ((data.ok || data.analysis) && data.saved !== false) {
        setResult(data.analysis || data);
        setSymptoms([{ name: '', severity: 5, duration: '' }]);
        if (user?.access_token) await loadReports(user.access_token);
      } else {
        // 실패가 무증상(스피너만 멈춤)으로 끝나던 구멍 — 깨진 문자 거부(#92)는 원인까지 안내.
        // 저장 실패(saved:false)면 폼을 지우지 않고 남겨 재제출할 수 있게 한다.
        setSubmitError(t(data.error === 'broken_encoding' ? 'patientSymptoms.brokenEncoding' : 'patientSymptoms.submitFailed', lang));
      }
    } catch (e) {
      console.error('Submit error:', e);
      setSubmitError(t('patientSymptoms.submitFailed', lang));
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-20 text-center">
        <Activity size={40} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">{t('patientSymptoms.loginRequired', lang)}</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800 transition"
        >
          {t('patientSymptoms.loginBtn', lang)}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6" aria-label={t('patientSymptoms.title', lang)}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('patientSymptoms.title', lang)}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('patientSymptoms.subtitle', lang)}</p>
      </div>

      {/* Symptom Input Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="space-y-4">
          {symptoms.map((symptom, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  // 자동 검사가 «화면의 첫 입력칸» 대신 이걸로 고른다 — 첫 매치는 내가 노린 칸이
                  // 아닐 수 있고, 안내문으로 찾으면 한국어가 아닌 화면에서 못 찾는다(2026-08-25).
                  data-testid="symptom-name"
                  value={symptom.name}
                  onChange={(e) => updateSymptom(index, 'name', e.target.value)}
                  placeholder={t('patientSymptoms.placeholders.name', lang)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">{t('patientSymptoms.severity', lang)}</label>
                    <div className="flex items-center gap-2">
                      {/* 옆의 <label>이 htmlFor 없이 떨어져 있어 화면낭독기가 «무엇을 고르는 칸인지» 못 읽었다.
                          환자가 자기 증상 강도를 입력하는 칸이라 특히 중요 → aria-label 로 이름을 준다(6개 언어 번역 사용). */}
                      <input
                        type="range"
                        min="1"
                        max="10"
                        aria-label={t('patientSymptoms.severity', lang)}
                        value={symptom.severity}
                        onChange={(e) => updateSymptom(index, 'severity', e.target.value)}
                        className="flex-1 accent-teal-600"
                      />
                      <span className={`text-sm font-bold w-6 text-center ${
                        symptom.severity >= 8 ? 'text-red-600' :
                        symptom.severity >= 5 ? 'text-yellow-600' : 'text-green-700'
                      }`}>
                        {symptom.severity}
                      </span>
                    </div>
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-gray-500 mb-1 block">{t('patientSymptoms.duration', lang)}</label>
                    <input
                      type="text"
                      value={symptom.duration}
                      onChange={(e) => updateSymptom(index, 'duration', e.target.value)}
                      placeholder={t('patientSymptoms.placeholders.duration', lang)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
              {symptoms.length > 1 && (
                <button
                  onClick={() => removeSymptom(index)}
                  className="mt-1 p-2 text-gray-500 hover:text-red-600 transition"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={addSymptom}
            className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-700 font-medium"
          >
            <Plus size={16} />
            {t('patientSymptoms.addSymptom', lang)}
          </button>
          <button
            data-testid="symptom-submit"
            onClick={handleSubmit}
            disabled={submitting || symptoms.every(s => !s.name.trim())}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {submitting ? t('patientSymptoms.submitting', lang) : t('patientSymptoms.submit', lang)}
          </button>
        </div>
        {submitError && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            {submitError}
          </p>
        )}
      </div>

      {/* Analysis Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-teal-700" />
            {t('patientSymptoms.result', lang)}
          </h2>

          <div className="space-y-3">
            {/* Urgency */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">{t('patientSymptoms.urgency', lang)}</span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                (URGENCY_STYLE[result.urgencyLevel] || URGENCY_STYLE.minimal).color
              }`}>
                {t((URGENCY_STYLE[result.urgencyLevel] || URGENCY_STYLE.minimal).label, lang)}
              </span>
            </div>

            {/* Risk Score */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">{t('patientSymptoms.riskScore', lang)}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.riskScore >= 0.7 ? 'bg-red-500' :
                      result.riskScore >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(result.riskScore || 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{((result.riskScore || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Assessment */}
            {result.assessment && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">{t('patientSymptoms.recommendation', lang)}</div>
                <p className="text-sm text-gray-700">{result.assessment}</p>
              </div>
            )}

            {/* Flagged symptoms */}
            {result.flaggedSymptoms?.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} className="text-red-600" />
                  <span className="text-xs font-medium text-red-700">Warning</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.flaggedSymptoms.map((s, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency — 별도 분기. 가장 급한 상태가 가장 강하게 보여야 한다
                (기존엔 재진 권유와 같은 파란 카드에 문구만 달랐고, 걸 수 있는 번호가 없었음) */}
            {result.recommendedAction === 'emergency_refer' ? (
              <div className="p-4 rounded-xl border border-red-300 bg-red-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-600 shrink-0" />
                  <p className="text-sm font-bold text-red-800">{t('patientSymptoms.recEmergency', lang)}</p>
                </div>
                <p className="mt-1.5 mb-3 text-xs text-red-700">{t('patientSymptoms.emergencyCallHint', lang)}</p>
                <EmergencyNumbers lang={lang} urgent />
              </div>
            ) : result.recommendedAction ? (
              <div className={`p-3 rounded-lg border ${
                result.recommendedAction === 'schedule_followup' || result.recommendedAction === 'escalate_doctor'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-sm font-medium text-blue-800">
                  {result.recommendedAction === 'schedule_followup' ? t('patientSymptoms.recFollowup', lang) :
                   result.recommendedAction === 'escalate_doctor' ? t('patientSymptoms.recDoctor', lang) :
                   result.recommendedAction}
                </p>
                {(result.recommendedAction === 'schedule_followup' || result.recommendedAction === 'escalate_doctor') && (
                  <button
                    onClick={() => router.push('/patient/rebooking')}
                    className="mt-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition"
                  >
                    {t('patientSymptoms.rebookConfirm', lang)}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 검사결과·경과 올리기 (ICT ④) — 증상 기록과 같은 사후관리 화면에 둔다 */}
      <ProgressUploadCard />

      {/* Previous Reports toggle */}
      <button
        onClick={() => setShowPrevious(!showPrevious)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
      >
        <Clock size={16} />
        {t('patientSymptoms.previousReports', lang)}
        <ChevronDown size={14} className={`transition ${showPrevious ? 'rotate-180' : ''}`} />
      </button>

      {showPrevious && (
        previousReports.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-500 text-sm">
            {t('patientSymptoms.noSymptoms', lang)}
          </div>
        ) : (
          <div className="space-y-2">
            {previousReports.map((r) => {
              const syms = Array.isArray(r.symptoms) ? r.symptoms : (r.symptoms?.items || []);
              const risk = Math.round((r.ai_risk_score || 0) * 100);
              return (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString(dateLocale(lang))}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      risk >= 70 ? 'bg-red-100 text-red-700' :
                      risk >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {t('patientSymptoms.riskScore', lang)} {risk}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {syms.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {s.symptom || s.name}{s.severity ? ` (${s.severity})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </main>
  );
}
