'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { kstDate } from '@/lib/datetime/kst';
import { scrollBehavior } from '@/lib/a11y/prefersReducedMotion';
import {
  FileText, Video, BookOpen, Activity, Calendar,
  Upload, ChevronRight, AlertCircle, User, Phone, ArrowRight,
} from 'lucide-react';

const MENU_ITEMS = [
  { key: 'consultations', icon: Video, href: '#consultations', color: 'bg-blue-50 text-blue-600' },
  { key: 'documents', icon: Upload, href: '/patient/documents', color: 'bg-purple-50 text-purple-600' },
  { key: 'education', icon: BookOpen, href: '/education', color: 'bg-green-50 text-green-700' },
  { key: 'symptoms', icon: Activity, href: '/patient/symptoms', color: 'bg-orange-50 text-orange-600' },
  { key: 'rebooking', icon: Calendar, href: '/patient/rebooking', color: 'bg-teal-50 text-teal-700' },
  { key: 'visa', icon: FileText, href: '/visa', color: 'bg-indigo-50 text-indigo-600' },
];

// DB status/enum 코드 목록 — 값 비교용 로직 키(그대로 유지).
// 표시 라벨(6개 활성언어 ko·en·ru·kz·zh·ja)은 중앙 i18n 사전 patientDash.* 키로 이동.
// (이전엔 한국어 하드코딩·원시 status 값('scheduled')이 그대로 노출됐음 — 2026-07-02 전수 감사)
const SESSION_TYPES = ['pre_consultation', 'follow_up', 'emergency', 'consultation'];
const INQUIRY_STATUSES = ['received', 'reviewing', 'matched', 'completed'];
const CONSULT_STATUSES = ['active', 'completed', 'scheduled', 'cancelled'];
const CANCER_TYPES = ['stomach', 'liver', 'lung', 'breast', 'thyroid', 'colorectal', 'pancreatic', 'other'];
const JOURNEY_STEP_KEYS = ['apply', 'matching', 'consult', 'treatment'];

export default function PatientDashboardClient() {
  const router = useRouter();
  const lang = useLang();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  const sessionLabel = (type) => t(`patientDash.session.${SESSION_TYPES.includes(type) ? type : 'consultation'}`, lang);

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // 비환자 계정(에이전시·병원·코디·의사·관리자)은 환자 대시보드 대신
        // 자기 포털로 자동 이동 — 이미 로그인된 채 /patient 로 와도 튕겨냄.
        try {
          const meRes = await fetch('/api/me', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            credentials: 'include',
            cache: 'no-store',
          });
          const me = await meRes.json();
          // 직원·파트너(landing=/admin·/coordinator·/agency·/clinic·/hospital)만 자기 포털로 튕겨냄.
          // 일반 회원은 landing='/'(홈)이지만 /patient(마이페이지)는 메뉴로 들어올 수 있어야 하므로 예외.
          if (me?.ok && me.landing && me.landing !== '/patient' && me.landing !== '/') {
            router.replace(me.landing);
            return;
          }
        } catch (_ignore) { /* 실패 시 환자 대시보드 그대로 */ }

        setUser(session.user);

        // Fetch patient's consultations + 본인 문의(접수 내역)
        try {
          const [res, inqRes] = await Promise.all([
            fetch('/api/khidi/consultation', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }),
            fetch('/api/portal/my-inquiries', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }),
          ]);
          const result = await res.json();
          if (result.ok) setConsultations(result.data || []);
          const inqResult = await inqRes.json();
          if (inqResult.ok) setInquiries(inqResult.items || []);
        } catch (e) { console.error(e); }
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={32} className="text-gray-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('patientDash.title', lang)}</h1>
        <p className="text-gray-500 mb-6">{t('patientDash.login', lang)}</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800 transition"
        >
          {t('patientDash.loginBtn', lang)}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6" aria-label={t('patientDash.title', lang)}>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-500 text-sm">{t('patientDash.welcome', lang)},</p>
        <h1 className="text-2xl font-bold">{user.email?.split('@')[0] || t('patientDash.patientFallback', lang)}</h1>
      </div>

      {/* Active/Scheduled Consultation CTA */}
      {consultations.some(c => c.status === 'active' || c.status === 'scheduled') && (
        <div className="mb-6 bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Video size={24} />
              </div>
              <div>
                <p className="font-semibold">{t('patientDash.consultationCta', lang)}</p>
                <p className="text-teal-100 text-sm">
                  {(() => {
                    const active = consultations.find(c => c.status === 'active');
                    const scheduled = consultations.find(c => c.status === 'scheduled');
                    const c = active || scheduled;
                    return c?.scheduled_at ? kstDate(c.scheduled_at) : '';
                  })()}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const active = consultations.find(c => c.status === 'active');
                const scheduled = consultations.find(c => c.status === 'scheduled');
                const c = active || scheduled;
                if (c) router.push(`/consultation/${c.id}`);
              }}
              className="flex items-center gap-2 bg-white text-teal-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-teal-50 transition text-sm whitespace-nowrap"
            >
              <Phone size={16} />
              {consultations.some(c => c.status === 'active') ? t('patientDash.joinNow', lang) : t('patientDash.enterWaiting', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Quick Menu Grid */}
      <h2 className="text-lg font-semibold mb-4">{t('patientDash.quickActions', lang)}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                if (!item.href) return;
                if (item.href.startsWith('#')) {
                  document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior: scrollBehavior() });
                } else {
                  router.push(item.href);
                }
              }}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm">{t(`patientDash.sections.${item.key}`, lang)}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 ml-auto" />
            </button>
          );
        })}
      </div>

      {/* 내 문의 — 접수한 상담 신청 내역 */}
      {inquiries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">{t('patientDash.myInquiries', lang)}</h2>
          <div className="flex flex-col gap-3">
            {inquiries.map((q) => {
              const stCls = {
                received: 'bg-yellow-100 text-yellow-700',
                reviewing: 'bg-blue-100 text-blue-700',
                matched: 'bg-teal-100 text-teal-700',
                completed: 'bg-gray-100 text-gray-500',
              }[q.status] || 'bg-yellow-100 text-yellow-700';
              const stText = INQUIRY_STATUSES.includes(q.status) ? t(`patientDash.inquiryStatus.${q.status}`, lang) : (q.status || t('patientDash.inquiryStatus.received', lang));
              const cancer = CANCER_TYPES.includes(q.cancer_type) ? t(`patientDash.cancer.${q.cancer_type}`, lang) : (q.cancer_type || t('patientDash.inquiryFallbackTitle', lang));
              return (
                <div key={q.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-50 text-teal-700">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{cancer}</div>
                      <div className="text-xs text-gray-500">
                        {q.created_at ? new Date(q.created_at).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${stCls}`}>{stText}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consultations List */}
      <h2 id="consultations" className="text-lg font-semibold mb-4 scroll-mt-20">{t('patientDash.sections.consultations', lang)}</h2>
      {consultations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Journey step indicator */}
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">{t('patientDash.journeySteps', lang)}</h3>
            <div className="flex items-center gap-2 mb-6">
              {(() => {
                // 문의를 접수했으면 1단계(신청서 작성) 완료 → 현재 단계는 매칭.
                const stepsDone = inquiries.length > 0 ? 1 : 0;
                return JOURNEY_STEP_KEYS.map((stepKey, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i < stepsDone ? 'bg-teal-100 text-teal-700' : i === stepsDone ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-xs text-gray-500 hidden sm:block">{t(`patientDash.journey.${stepKey}`, lang)}</span>
                  {i < 3 && <div className="flex-1 h-px bg-gray-200 hidden sm:block" />}
                </div>
              ));
              })()}
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-6 text-center border-t border-gray-100">
            <AlertCircle size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 mb-1">{t('patientDash.noConsultations', lang)}</p>
            <p className="text-gray-500 text-sm mb-4">{t('patientDash.startFirst', lang)}</p>
            <button
              onClick={() => router.push('/intake')}
              className="inline-flex items-center gap-2 bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800 transition text-sm"
            >
              {t('patientDash.newIntake', lang)} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {consultations.slice(0, 10).map(c => (
            <div
              key={c.id}
              onClick={() => c.status === 'active' ? router.push(`/consultation/${c.id}`) : null}
              className={`flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 ${c.status === 'active' ? 'cursor-pointer hover:shadow-md' : ''} transition`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  c.status === 'active' ? 'bg-green-50 text-green-700' :
                  c.status === 'completed' ? 'bg-gray-50 text-gray-500' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <Video size={20} />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {sessionLabel(c.session_type)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.scheduled_at ? kstDate(c.scheduled_at) : '-'}
                  </div>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                c.status === 'active' ? 'bg-green-100 text-green-700' :
                c.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                c.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {CONSULT_STATUSES.includes(c.status) ? t(`patientDash.consultStatus.${c.status}`, lang) : c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
