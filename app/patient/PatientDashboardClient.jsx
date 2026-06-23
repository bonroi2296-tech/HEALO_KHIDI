'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n/LangContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  FileText, Video, BookOpen, Activity, Calendar,
  Upload, ChevronRight, AlertCircle, User, MessageSquare, Phone, ArrowRight,
} from 'lucide-react';

const L = {
  title: { ko: '내 진료 관리', en: 'My Care Dashboard', ru: 'Мой кабинет', kz: 'Менің кабинетім', zh: '我的诊疗管理', ja: 'マイケア' },
  welcome: { ko: '안녕하세요', en: 'Welcome back', ru: 'Добро пожаловать', kz: 'Қош келдіңіз', zh: '欢迎回来', ja: 'おかえりなさい' },
  login: { ko: '로그인이 필요합니다', en: 'Please log in to view your dashboard', ru: 'Пожалуйста, войдите в систему', kz: 'Жүйеге кіріңіз', zh: '请登录', ja: 'ログインしてください' },
  loginBtn: { ko: '로그인', en: 'Log In', ru: 'Войти', kz: 'Кіру', zh: '登录', ja: 'ログイン' },
  sections: {
    aiChat: { ko: 'AI 건강 상담', en: 'AI Health Chat', ru: 'AI Консультация', kz: 'AI Кеңес', zh: 'AI 健康咨询', ja: 'AI 健康相談' },
    consultations: { ko: '내 상담', en: 'My Consultations', ru: 'Мои консультации', kz: 'Менің кеңестерім', zh: '我的咨询', ja: '相談一覧' },
    documents: { ko: '의료 문서', en: 'Medical Documents', ru: 'Медицинские документы', kz: 'Медициналық құжаттар', zh: '医疗文档', ja: '医療書類' },
    education: { ko: '건강 교육', en: 'Health Education', ru: 'Обучение здоровью', kz: 'Денсаулық білімі', zh: '健康教育', ja: '健康教育' },
    symptoms: { ko: '증상 기록', en: 'Symptom Log', ru: 'Журнал симптомов', kz: 'Симптом журналы', zh: '症状记录', ja: '症状記録' },
    rebooking: { ko: '재진 예약', en: 'Follow-up Booking', ru: 'Повторная запись', kz: 'Қайта жазылу', zh: '复诊预约', ja: '再診予約' },
    visa: { ko: '비자 가이드', en: 'Visa Guide', ru: 'Визовый гид', kz: 'Виза нұсқаулығы', zh: '签证指南', ja: 'ビザガイド' },
  },
  quickActions: { ko: '빠른 메뉴', en: 'Quick Actions', ru: 'Быстрые действия', kz: 'Жылдам әрекеттер', zh: '快捷操作', ja: 'クイックアクション' },
  newIntake: { ko: '새 상담 요청', en: 'New Consultation Request', ru: 'Новая заявка', kz: 'Жаңа өтінім', zh: '新咨询申请', ja: '新規相談' },
  noConsultations: { ko: '아직 상담이 없습니다', en: 'No consultations yet', ru: 'Консультаций пока нет', kz: 'Кеңестер әлі жоқ', zh: '暂无咨询', ja: 'まだ相談がありません' },
  startFirst: { ko: '첫 사전상담을 시작해보세요', en: 'Start your first pre-consultation', ru: 'Начните первую консультацию', kz: 'Алғашқы кеңесті бастаңыз', zh: '开始您的第一次预咨询', ja: '最初の事前相談を始めましょう' },
  loading: { ko: '로딩 중...', en: 'Loading...', ru: 'Загрузка...', kz: 'Жүктелуде...', zh: '加载中...', ja: '読み込み中...' },
  consultationCta: { ko: '화상 상담 예약이 있습니다', en: 'You have a consultation', ru: 'У вас есть консультация', kz: 'Сізде кеңес бар', zh: '您有一个会诊', ja: '相談があります' },
  joinNow: { ko: '지금 참여', en: 'Join Now', ru: 'Присоединиться', kz: 'Қосылу', zh: '立即加入', ja: '参加する' },
  enterWaiting: { ko: '대기실 입장', en: 'Enter Waiting Room', ru: 'Войти в зал ожидания', kz: 'Күту залына кіру', zh: '进入候诊室', ja: '待合室に入る' },
  journeySteps: { ko: '진료 과정', en: 'Your Journey', ru: 'Ваш путь', kz: 'Сіздің жолыңыз', zh: '就诊流程', ja: '診療の流れ' },
};

const MENU_ITEMS = [
  { key: 'aiChat', icon: MessageSquare, href: '/patient/chat', color: 'bg-teal-50 text-teal-700' },
  { key: 'consultations', icon: Video, href: '#consultations', color: 'bg-blue-50 text-blue-600' },
  { key: 'documents', icon: Upload, href: '/patient/documents', color: 'bg-purple-50 text-purple-600' },
  { key: 'education', icon: BookOpen, href: '/education', color: 'bg-green-50 text-green-600' },
  { key: 'symptoms', icon: Activity, href: '/patient/symptoms', color: 'bg-orange-50 text-orange-600' },
  { key: 'rebooking', icon: Calendar, href: '/patient/rebooking', color: 'bg-teal-50 text-teal-700' },
  { key: 'visa', icon: FileText, href: '/visa', color: 'bg-indigo-50 text-indigo-600' },
];

export default function PatientDashboardClient() {
  const router = useRouter();
  const lang = useLang();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

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
          if (me?.ok && me.landing && me.landing !== '/patient') {
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
          <User size={32} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{l(L.title)}</h1>
        <p className="text-gray-500 mb-6">{l(L.login)}</p>
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
    <main className="max-w-4xl mx-auto px-4 py-6" aria-label={l(L.title)}>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-500 text-sm">{l(L.welcome)},</p>
        <h1 className="text-2xl font-bold">{user.email?.split('@')[0] || 'Patient'}</h1>
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
                <p className="font-semibold">{l(L.consultationCta)}</p>
                <p className="text-teal-100 text-sm">
                  {(() => {
                    const active = consultations.find(c => c.status === 'active');
                    const scheduled = consultations.find(c => c.status === 'scheduled');
                    const c = active || scheduled;
                    return c?.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '';
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
              {consultations.some(c => c.status === 'active') ? l(L.joinNow) : l(L.enterWaiting)}
            </button>
          </div>
        </div>
      )}

      {/* Quick Menu Grid */}
      <h2 className="text-lg font-semibold mb-4">{l(L.quickActions)}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                if (!item.href) return;
                if (item.href.startsWith('#')) {
                  document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
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
                <div className="font-semibold text-sm">{l(L.sections[item.key])}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 ml-auto" />
            </button>
          );
        })}
      </div>

      {/* 내 문의 — 접수한 상담 신청 내역 */}
      {inquiries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">{l({ ko: '내 문의', en: 'My Inquiries', ru: 'Мои заявки', kz: 'Менің өтінімдерім', zh: '我的咨询', ja: 'お問い合わせ' })}</h2>
          <div className="flex flex-col gap-3">
            {inquiries.map((q) => {
              const stLabel = {
                received: { ko: '접수됨', cls: 'bg-yellow-100 text-yellow-700' },
                reviewing: { ko: '검토 중', cls: 'bg-blue-100 text-blue-700' },
                matched: { ko: '매칭 완료', cls: 'bg-teal-100 text-teal-700' },
                completed: { ko: '완료', cls: 'bg-gray-100 text-gray-500' },
              }[q.status] || { ko: q.status || '접수됨', cls: 'bg-yellow-100 text-yellow-700' };
              const cancer = { stomach: '위암', liver: '간암', lung: '폐암', breast: '유방암', thyroid: '갑상선암', colorectal: '대장암', pancreatic: '췌장암', other: '기타' }[q.cancer_type] || q.cancer_type || '상담 신청';
              return (
                <div key={q.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-50 text-teal-700">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{cancer}</div>
                      <div className="text-xs text-gray-400">
                        {q.created_at ? new Date(q.created_at).toLocaleDateString('ko-KR') : '-'}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${stLabel.cls}`}>{stLabel.ko}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consultations List */}
      <h2 id="consultations" className="text-lg font-semibold mb-4 scroll-mt-20">{l(L.sections.consultations)}</h2>
      {consultations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Journey step indicator */}
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">{l(L.journeySteps)}</h3>
            <div className="flex items-center gap-2 mb-6">
              {(() => {
                // 문의를 접수했으면 1단계(신청서 작성) 완료 → 현재 단계는 매칭.
                const stepsDone = inquiries.length > 0 ? 1 : 0;
                return [
                { label: { ko: '신청서 작성', en: 'Apply', ru: 'Заявка', kz: 'Өтінім', zh: '申请', ja: '申請' } },
                { label: { ko: '매칭', en: 'Matching', ru: 'Подбор', kz: 'Сәйкестендіру', zh: '匹配', ja: 'マッチング' } },
                { label: { ko: '사전상담', en: 'Consult', ru: 'Консультация', kz: 'Кеңес', zh: '咨询', ja: '相談' } },
                { label: { ko: '치료', en: 'Treatment', ru: 'Лечение', kz: 'Емдеу', zh: '治疗', ja: '治療' } },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i < stepsDone ? 'bg-teal-100 text-teal-700' : i === stepsDone ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-xs text-gray-500 hidden sm:block">{l(s.label)}</span>
                  {i < 3 && <div className="flex-1 h-px bg-gray-200 hidden sm:block" />}
                </div>
              ));
              })()}
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-6 text-center border-t border-gray-100">
            <AlertCircle size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 mb-1">{l(L.noConsultations)}</p>
            <p className="text-gray-400 text-sm mb-4">{l(L.startFirst)}</p>
            <button
              onClick={() => router.push('/intake')}
              className="inline-flex items-center gap-2 bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800 transition text-sm"
            >
              {l(L.newIntake)} <ArrowRight size={16} />
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
                  c.status === 'active' ? 'bg-green-50 text-green-600' :
                  c.status === 'completed' ? 'bg-gray-50 text-gray-400' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <Video size={20} />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {c.session_type === 'follow_up' ? 'Follow-up' :
                     c.session_type === 'emergency' ? 'Emergency' :
                     c.session_type === 'pre_consultation' ? 'Pre-consultation' :
                     c.session_type || 'Consultation'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '-'}
                  </div>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                c.status === 'active' ? 'bg-green-100 text-green-700' :
                c.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                c.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
