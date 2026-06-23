'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLangCodeFromCookie } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  Activity, AlertTriangle, Plus, Send, Trash2,
  CheckCircle, Clock, ChevronDown,
} from 'lucide-react';

const L = {
  title: { ko: '증상 기록', en: 'Symptom Log', ru: 'Журнал симптомов', kz: 'Симптом журналы', zh: '症状记录', ja: '症状記録' },
  subtitle: { ko: '현재 증상을 기록하면 AI가 분석하여 필요시 재진을 추천합니다.', en: 'Log your symptoms and our AI will analyze them for follow-up recommendations.', ru: 'Запишите симптомы, ИИ проанализирует и при необходимости рекомендует повторный приём.', kz: 'Симптомдарды жазыңыз, ЖИ талдап, қажет болса қайта қабылдау ұсынады.', zh: '记录您的症状，AI将分析并在需要时推荐复诊。', ja: '症状を記録すると、AIが分析して必要に応じてフォローアップを推奨します。' },
  addSymptom: { ko: '증상 추가', en: 'Add Symptom', ru: 'Добавить симптом', kz: 'Симптом қосу', zh: '添加症状', ja: '症状を追加' },
  symptomName: { ko: '증상명', en: 'Symptom Name', ru: 'Название симптома', kz: 'Симптом атауы', zh: '症状名称', ja: '症状名' },
  severity: { ko: '심각도 (1-10)', en: 'Severity (1-10)', ru: 'Тяжесть (1-10)', kz: 'Ауырлық (1-10)', zh: '严重程度 (1-10)', ja: '重症度 (1-10)' },
  duration: { ko: '기간', en: 'Duration', ru: 'Продолжительность', kz: 'Ұзақтығы', zh: '持续时间', ja: '期間' },
  submit: { ko: '증상 제출', en: 'Submit Symptoms', ru: 'Отправить', kz: 'Жіберу', zh: '提交症状', ja: '症状を送信' },
  submitting: { ko: '분석 중...', en: 'Analyzing...', ru: 'Анализ...', kz: 'Талдау...', zh: '分析中...', ja: '分析中...' },
  noSymptoms: { ko: '아직 기록된 증상이 없습니다', en: 'No symptoms logged yet', ru: 'Симптомов пока нет', kz: 'Симптомдар әлі жоқ', zh: '暂无症状记录', ja: 'まだ症状がありません' },
  previousReports: { ko: '이전 보고', en: 'Previous Reports', ru: 'Предыдущие отчёты', kz: 'Алдыңғы есептер', zh: '历史报告', ja: '過去のレポート' },
  result: { ko: '분석 결과', en: 'Analysis Result', ru: 'Результат анализа', kz: 'Талдау нәтижесі', zh: '分析结果', ja: '分析結果' },
  urgency: { ko: '긴급도', en: 'Urgency', ru: 'Срочность', kz: 'Жеделдік', zh: '紧急程度', ja: '緊急度' },
  riskScore: { ko: '위험 점수', en: 'Risk Score', ru: 'Оценка риска', kz: 'Тәуекел бағасы', zh: '风险评分', ja: 'リスクスコア' },
  recommendation: { ko: '권장 조치', en: 'Recommended Action', ru: 'Рекомендация', kz: 'Ұсыныс', zh: '建议措施', ja: '推奨アクション' },
  loginRequired: { ko: '로그인이 필요합니다', en: 'Please log in first', ru: 'Войдите в систему', kz: 'Жүйеге кіріңіз', zh: '请先登录', ja: 'ログインしてください' },
  loginBtn: { ko: '로그인', en: 'Log In', ru: 'Войти', kz: 'Кіру', zh: '登录', ja: 'ログイン' },
  placeholders: {
    name: { ko: '예: 두통, 구토, 피로감', en: 'e.g. headache, nausea, fatigue', ru: 'напр. головная боль, тошнота', kz: 'мыс. бас ауруы, жүрек айну', zh: '如：头痛、恶心、疲劳', ja: '例：頭痛、吐き気、疲労' },
    duration: { ko: '예: 3일', en: 'e.g. 3 days', ru: 'напр. 3 дня', kz: 'мыс. 3 күн', zh: '如：3天', ja: '例：3日間' },
  },
};

const URGENCY_STYLE = {
  emergency: { label: '긴급', color: 'bg-red-100 text-red-800' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-800' },
  medium: { label: '보통', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: '낮음', color: 'bg-green-100 text-green-800' },
  minimal: { label: '최소', color: 'bg-gray-100 text-gray-600' },
};

export default function SymptomsClient() {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [symptoms, setSymptoms] = useState([{ name: '', severity: 5, duration: '' }]);
  const [result, setResult] = useState(null);
  const [previousReports, setPreviousReports] = useState([]);
  const [showPrevious, setShowPrevious] = useState(false);

  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

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
      if (data.ok || data.analysis) {
        setResult(data.analysis || data);
        setSymptoms([{ name: '', severity: 5, duration: '' }]);
        if (data.saved && user?.access_token) await loadReports(user.access_token);
      }
    } catch (e) {
      console.error('Submit error:', e);
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
        <p className="text-gray-500 mb-4">{l(L.loginRequired)}</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800 transition"
        >
          {l(L.loginBtn)}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6" aria-label={l(L.title)}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{l(L.title)}</h1>
        <p className="text-gray-500 text-sm mt-1">{l(L.subtitle)}</p>
      </div>

      {/* Symptom Input Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="space-y-4">
          {symptoms.map((symptom, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={symptom.name}
                  onChange={(e) => updateSymptom(index, 'name', e.target.value)}
                  placeholder={l(L.placeholders.name)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">{l(L.severity)}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={symptom.severity}
                        onChange={(e) => updateSymptom(index, 'severity', e.target.value)}
                        className="flex-1 accent-teal-600"
                      />
                      <span className={`text-sm font-bold w-6 text-center ${
                        symptom.severity >= 8 ? 'text-red-600' :
                        symptom.severity >= 5 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {symptom.severity}
                      </span>
                    </div>
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-gray-400 mb-1 block">{l(L.duration)}</label>
                    <input
                      type="text"
                      value={symptom.duration}
                      onChange={(e) => updateSymptom(index, 'duration', e.target.value)}
                      placeholder={l(L.placeholders.duration)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
              {symptoms.length > 1 && (
                <button
                  onClick={() => removeSymptom(index)}
                  className="mt-1 p-2 text-gray-400 hover:text-red-500 transition"
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
            {l(L.addSymptom)}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || symptoms.every(s => !s.name.trim())}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {submitting ? l(L.submitting) : l(L.submit)}
          </button>
        </div>
      </div>

      {/* Analysis Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-teal-700" />
            {l(L.result)}
          </h2>

          <div className="space-y-3">
            {/* Urgency */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">{l(L.urgency)}</span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                (URGENCY_STYLE[result.urgency_level] || URGENCY_STYLE.minimal).color
              }`}>
                {(URGENCY_STYLE[result.urgency_level] || URGENCY_STYLE.minimal).label}
              </span>
            </div>

            {/* Risk Score */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">{l(L.riskScore)}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.risk_score >= 0.7 ? 'bg-red-500' :
                      result.risk_score >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(result.risk_score || 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{((result.risk_score || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Assessment */}
            {result.assessment && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">{l(L.recommendation)}</div>
                <p className="text-sm text-gray-700">{result.assessment}</p>
              </div>
            )}

            {/* Flagged symptoms */}
            {result.flagged_symptoms?.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs font-medium text-red-700">Warning</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.flagged_symptoms.map((s, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rebooking suggestion */}
            {result.recommended_action && (
              <div className={`p-3 rounded-lg border ${
                result.recommended_action === 'schedule_followup' || result.recommended_action === 'escalate_doctor'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-sm font-medium text-blue-800">
                  {result.recommended_action === 'schedule_followup' ? '재진 예약이 권장됩니다' :
                   result.recommended_action === 'escalate_doctor' ? '의사 상담이 필요합니다' :
                   result.recommended_action === 'emergency' ? '즉시 응급 서비스에 연락하세요' :
                   result.recommended_action}
                </p>
                {(result.recommended_action === 'schedule_followup' || result.recommended_action === 'escalate_doctor') && (
                  <button
                    onClick={() => router.push('/patient/rebooking')}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    재진 예약 확인
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Previous Reports toggle */}
      <button
        onClick={() => setShowPrevious(!showPrevious)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
      >
        <Clock size={16} />
        {l(L.previousReports)}
        <ChevronDown size={14} className={`transition ${showPrevious ? 'rotate-180' : ''}`} />
      </button>

      {showPrevious && (
        previousReports.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400 text-sm">
            {l(L.noSymptoms)}
          </div>
        ) : (
          <div className="space-y-2">
            {previousReports.map((r) => {
              const syms = Array.isArray(r.symptoms) ? r.symptoms : (r.symptoms?.items || []);
              const risk = Math.round((r.ai_risk_score || 0) * 100);
              return (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      risk >= 70 ? 'bg-red-100 text-red-700' :
                      risk >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {l(L.riskScore)} {risk}%
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
