'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLangCodeFromCookie } from '../../src/lib/i18n';
import { createSupabaseBrowserClient } from '../../src/lib/supabase/browser';
import {
  FileText, Video, BookOpen, Activity, Calendar,
  Upload, ChevronRight, AlertCircle, User, MessageSquare,
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
};

const MENU_ITEMS = [
  { key: 'aiChat', icon: MessageSquare, href: '/patient/chat', color: 'bg-teal-50 text-teal-600' },
  { key: 'consultations', icon: Video, href: '#consultations', color: 'bg-blue-50 text-blue-600' },
  { key: 'documents', icon: Upload, href: '/patient/documents', color: 'bg-purple-50 text-purple-600' },
  { key: 'education', icon: BookOpen, href: '/patient/education', color: 'bg-green-50 text-green-600' },
  { key: 'symptoms', icon: Activity, href: '/patient/symptoms', color: 'bg-orange-50 text-orange-600' },
  { key: 'rebooking', icon: Calendar, href: '/patient/rebooking', color: 'bg-teal-50 text-teal-600' },
  { key: 'visa', icon: FileText, href: '/patient/visa', color: 'bg-indigo-50 text-indigo-600' },
];

export default function PatientDashboardClient() {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState([]);

  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);

        // Fetch patient's consultations
        try {
          const res = await fetch('/api/khidi/consultation', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const result = await res.json();
          if (result.ok) setConsultations(result.data || []);
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
          className="bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition"
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

      {/* Consultations List */}
      <h2 id="consultations" className="text-lg font-semibold mb-4 scroll-mt-20">{l(L.sections.consultations)}</h2>
      {consultations.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <AlertCircle size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600 mb-1">{l(L.noConsultations)}</p>
          <p className="text-gray-400 text-sm mb-4">{l(L.startFirst)}</p>
          <button
            onClick={() => router.push('/inquiry')}
            className="bg-teal-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-700 transition text-sm"
          >
            {l(L.newIntake)}
          </button>
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
