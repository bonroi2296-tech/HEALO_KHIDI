'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/i18n/LangContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { getAllPartnerHospitals } from '@/lib/data/partnerHospitals';
import {
  getAllCancerCosts,
  formatKRW,
  getDisclaimer as getCostDisclaimer,
  getSourceLabel as getCostSource,
} from '@/lib/data/hiraCancerCosts';
import {
  Send, Loader2, Bot, User, Plus, ChevronLeft,
  MessageSquare, Shield, Globe, Database, AlertCircle,
  Building2, Wallet, Clock, FileText, MapPin, ExternalLink,
} from 'lucide-react';

// ─── i18n ───

const L = {
  title: { ko: 'AI 건강 상담', en: 'AI Health Chat', ru: 'AI Консультация', kz: 'AI Кеңес', zh: 'AI 健康咨询', ja: 'AI 健康相談' },
  newChat: { ko: '새 대화', en: 'New Chat', ru: 'Новый чат', kz: 'Жаңа чат', zh: '新对话', ja: '新しい会話' },
  history: { ko: '대화 이력', en: 'Chat History', ru: 'История чатов', kz: 'Чат тарихы', zh: '对话历史', ja: '会話履歴' },
  placeholder: { ko: '증상, 치료, 병원에 대해 물어보세요...', en: 'Ask about symptoms, treatments, hospitals...', ru: 'Спросите о симптомах, лечении, больницах...', kz: 'Симптомдар, емдеу, ауруханалар туралы сұраңыз...', zh: '询问症状、治疗、医院...', ja: '症状・治療・病院について質問...' },
  intro: {
    ko: '안녕하세요! healwith AI 건강 상담 서비스입니다.\n\n저는 한국 의료관광에 관한 정보를 제공합니다:\n- 병원 및 시술 추천\n- 치료 비용 안내\n- 의료 비자 정보\n\n무엇이 궁금하신가요?',
    en: "Hello! I'm healwith's AI health consultant.\n\nI can help you with:\n- Hospital & treatment recommendations\n- Cost estimates\n- Medical visa information\n\nWhat would you like to know?",
    ru: 'Здравствуйте! Я AI-консультант healwith.\n\nЯ могу помочь с:\n- Рекомендациями больниц и лечения\n- Оценкой стоимости\n- Информацией о медицинской визе\n\nЧто вас интересует?',
    kz: 'Сәлеметсіз бе! Мен healwith AI-кеңесшісімін.\n\nМен көмектесе аламын:\n- Ауруханалар мен емдеу ұсыныстары\n- Құн бағалау\n- Медициналық виза ақпараты\n\nНе білгіңіз келеді?',
    zh: '您好！我是healwith的AI健康顾问。\n\n我可以帮助您：\n- 医院和治疗推荐\n- 费用估算\n- 医疗签证信息\n\n您想了解什么？',
    ja: 'こんにちは！healwith AIヘルスコンサルタントです。\n\nお手伝いできること：\n- 病院・治療の推薦\n- 費用の見積もり\n- 医療ビザ情報\n\n何をお知りになりたいですか？',
  },
  disclaimer: {
    ko: 'AI 상담은 참고용이며 의학적 진단이나 처방을 대체하지 않습니다.',
    en: 'AI consultation is for reference only and does not replace medical diagnosis.',
    ru: 'AI-консультация носит информационный характер и не заменяет медицинский диагноз.',
    kz: 'AI кеңесі анықтамалық сипатта және медициналық диагнозды алмастырмайды.',
    zh: 'AI咨询仅供参考，不能替代医学诊断。',
    ja: 'AI相談は参考用であり、医学的診断に代わるものではありません。',
  },
  noHistory: { ko: '아직 대화가 없습니다', en: 'No conversations yet', ru: 'Нет бесед', kz: 'Әңгімелер жоқ', zh: '暂无对话', ja: 'まだ会話がありません' },
  error: { ko: '오류가 발생했습니다. 다시 시도해주세요.', en: 'Something went wrong. Please try again.', ru: 'Произошла ошибка. Попробуйте снова.', kz: 'Қате орын алды. Қайта көріңіз.', zh: '出错了，请重试。', ja: 'エラーが発生しました。もう一度お試しください。' },
  sourceTier1: { ko: 'healwith 검증', en: 'healwith Verified', ru: 'healwith Проверено', kz: 'healwith Тексерілген', zh: 'healwith验证', ja: 'healwith認証' },
  sourceTier2: { ko: '파트너 검증', en: 'Partner Verified', ru: 'Партнер Проверено', kz: 'Серіктес Тексерілген', zh: '合作伙伴验证', ja: 'パートナー認証' },
  sourceTier3: { ko: '공개 소스', en: 'Public Source', ru: 'Открытый источник', kz: 'Ашық дереккөз', zh: '公开来源', ja: '公開ソース' },
  handOff: { ko: '상담원 연결을 요청했습니다. 잠시만 기다려주세요.', en: 'A coordinator has been notified. You can keep chatting.', ru: 'Координатор уведомлен. Можете продолжать общение.', kz: 'Координаторға хабарландырылды. Сөйлесуді жалғастыра аласыз.', zh: '协调员已收到通知，您可以继续聊天。', ja: 'コーディネーターに通知しました。チャットを続けられます。' },
  login: { ko: '로그인이 필요합니다', en: 'Please log in', ru: 'Войдите в систему', kz: 'Жүйеге кіріңіз', zh: '请登录', ja: 'ログインしてください' },

  // Quick action buttons
  qaTitle: { ko: '자주 묻는 질문', en: 'Quick questions', ru: 'Частые вопросы', kz: 'Жиі қойылатын сұрақтар', zh: '常见问题', ja: 'よくある質問' },
  qaFindHospital: { ko: '치료 여정 안내받기', en: 'Get care journey guidance', ru: 'Узнать о маршруте лечения', kz: 'Емдеу жолы туралы білу', zh: '了解治疗流程', ja: '治療の流れを知る' },
  qaCost: { ko: '예상 진료비', en: 'Estimated costs', ru: 'Ориентировочная стоимость', kz: 'Шамамен құны', zh: '费用估算', ja: '費用の目安' },
  qaDuration: { ko: '치료 기간', en: 'Treatment duration', ru: 'Срок лечения', kz: 'Емдеу ұзақтығы', zh: '治疗期限', ja: '治療期間' },
  qaVisa: { ko: '비자 정보', en: 'Visa information', ru: 'Информация о визе', kz: 'Виза туралы', zh: '签证信息', ja: 'ビザ情報' },

  // Quick action prompts (sent to AI)
  qaFindHospitalQ: {
    ko: '제 상황(암)에 맞는 한국에서의 치료 여정을 안내해주세요. 진단부터 수술 연계, 면역·재활까지 어떻게 이어지는지, 협진 병원과 특화 분야도 함께 알려주세요.',
    en: 'Please guide me through the care journey in Korea for my condition (cancer) — from diagnosis to surgery connection and immune/rehabilitation care. Also tell me about the partner hospitals and their specialties.',
    ru: 'Расскажите о маршруте лечения в Корее при раке — от диагностики до операции и иммунно-реабилитационного ухода. Также расскажите о больницах-партнёрах и их специализации.',
    kz: 'Маған Кореядағы емдеу жолын түсіндіріңіз (рак) — диагностикадан хирургияға және иммундық-оңалту еміне дейін. Серіктес ауруханалар мен олардың мамандануы туралы да айтыңыз.',
    zh: '请为我介绍在韩国的治疗流程（癌症）——从诊断到手术衔接以及免疫·康复护理。也请告诉我合作医院及其专长。',
    ja: '私の状況（がん）に合った韓国での治療の流れを案内してください。診断から手術連携、免疫・リハビリまでどうつながるか、協力病院と専門分野も教えてください。',
  },
  qaCostQ: {
    ko: '한국에서 암 치료를 받을 경우 예상 진료비는 얼마나 되나요? 수술·항암·방사선 기준으로 알려주세요.',
    en: 'How much does cancer treatment cost in Korea? Please give me reference ranges for surgery, chemotherapy, and radiation therapy.',
    ru: 'Сколько стоит лечение рака в Корее? Ориентировочные цены на операцию, химиотерапию и лучевую терапию.',
    kz: 'Кореяда рак емдеу қанша тұрады? Ота, химиотерапия, сәулелік терапия бойынша шамамен бағаларды айтыңыз.',
    zh: '在韩国接受癌症治疗的费用大约是多少？请按手术、化疗、放疗分别说明。',
    ja: '韓国でがん治療を受ける場合の費用の目安を教えてください。手術・化学療法・放射線治療別にお願いします。',
  },
  qaDurationQ: {
    ko: '한국에서 암 치료를 받을 때 예상 치료 기간과 입원 기간은 얼마나 되나요?',
    en: 'How long does cancer treatment typically take in Korea, including inpatient stay?',
    ru: 'Как долго обычно длится лечение рака в Корее, включая пребывание в стационаре?',
    kz: 'Кореяда рак емдеу әдетте қанша уақытқа созылады, стационарда жату уақытын қоса?',
    zh: '在韩国接受癌症治疗通常需要多长时间？包括住院期间。',
    ja: '韓国でのがん治療は通常どれくらいかかりますか？入院期間も含めて教えてください。',
  },
  qaVisaQ: {
    ko: '한국 의료 비자(C-3-3, G-1-10)는 어떻게 신청하고, 어떤 서류가 필요한가요?',
    en: 'How do I apply for Korean medical visas (C-3-3, G-1-10) and what documents are required?',
    ru: 'Как подать заявление на корейскую медицинскую визу (C-3-3, G-1-10) и какие документы требуются?',
    kz: 'Корей медициналық визасына (C-3-3, G-1-10) қалай өтініш беремін және қандай құжаттар қажет?',
    zh: '如何申请韩国医疗签证（C-3-3、G-1-10）？需要哪些材料？',
    ja: '韓国の医療ビザ（C-3-3、G-1-10）はどのように申請し、どんな書類が必要ですか？',
  },

  // Card labels
  partnerCardTitle: { ko: '협진 병원 안내 (7곳)', en: 'Partner Hospitals (7)', ru: 'Больницы-партнёры (7)', kz: 'Серіктес ауруханалар (7)', zh: '合作医院（7家）', ja: '協力病院（7施設）' },
  partnerCardNote: { ko: '※ 상세 정보는 상담 후 제공됩니다.', en: '※ Detailed info is shared after consultation.', ru: '※ Подробности — после консультации.', kz: '※ Толық ақпарат кеңестен кейін беріледі.', zh: '※ 详细信息将在咨询后提供。', ja: '※ 詳細は相談後にご案内します。' },
  viewDetail: { ko: '자세히 보기', en: 'View details', ru: 'Подробнее', kz: 'Толығырақ', zh: '查看详情', ja: '詳細を見る' },
  costCardTitle: { ko: '한국인 기준 암종별 진료비 참고 범위', en: 'Reference Cancer Treatment Costs (Korean Baseline)', ru: 'Справочная стоимость лечения рака (базовая для корейцев)', kz: 'Рак емдеудің анықтамалық құны (корей базасы)', zh: '韩国癌症治疗参考费用（韩国患者基准）', ja: 'がん治療参考費用（韓国人基準）' },
  costSurgery: { ko: '수술', en: 'Surgery', ru: 'Операция', kz: 'Ота', zh: '手术', ja: '手術' },
  costChemo: { ko: '항암치료', en: 'Chemotherapy', ru: 'Химиотерапия', kz: 'Химиотерапия', zh: '化疗', ja: '化学療法' },
  costRadiation: { ko: '방사선치료', en: 'Radiation', ru: 'Лучевая терапия', kz: 'Сәулелік терапия', zh: '放疗', ja: '放射線治療' },
  costInpatient: { ko: '입원', en: 'Inpatient', ru: 'Стационар', kz: 'Стационар', zh: '住院', ja: '入院' },
  days: { ko: '일', en: 'days', ru: 'дней', kz: 'күн', zh: '天', ja: '日' },
};

// ─── Source Tier Badge ───

function SourceBadge({ tier, lang }) {
  const config = {
    1: { icon: Shield, color: 'bg-teal-50 text-teal-700 border-teal-200', label: L.sourceTier1 },
    2: { icon: Database, color: 'bg-blue-50 text-blue-700 border-blue-200', label: L.sourceTier2 },
    3: { icon: Globe, color: 'bg-amber-50 text-amber-700 border-amber-200', label: L.sourceTier3 },
  };
  const c = config[tier] || config[3];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${c.color}`}>
      <Icon size={10} />
      {c.label[lang] || c.label.en}
    </span>
  );
}

// ─── Partner Hospitals Card ───

function PartnerHospitalsCard({ lang }) {
  const partners = getAllPartnerHospitals();
  const t = (obj) => obj?.[lang] || obj?.en || obj?.ko || '';
  const tArr = (obj) => obj?.[lang] || obj?.en || obj?.ko || [];

  return (
    <div className="mt-3 bg-white border border-teal-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} className="text-teal-700" />
        <h3 className="text-sm font-bold text-gray-800">{L.partnerCardTitle[lang] || L.partnerCardTitle.en}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {partners.map((p) => (
          <Link
            key={p.slug}
            href={`/hospitals/${p.slug}`}
            className="block border border-gray-100 rounded-xl p-3 hover:border-teal-300 hover:bg-teal-50/30 transition"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-900 leading-tight">{t(p.name)}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                p.badge === 'partner' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {t(p.type)}
              </span>
            </div>
            <div className="flex items-start gap-1 text-[10px] text-gray-500 mb-1.5">
              <MapPin size={10} className="mt-0.5 shrink-0" />
              <span className="line-clamp-1">{t(p.address)}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tArr(p.specialties).slice(0, 3).map((s, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded">
                  {s}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-3 text-center">{L.partnerCardNote[lang] || L.partnerCardNote.en}</p>
    </div>
  );
}

// ─── Cancer Costs Card ───

function CancerCostsCard({ lang }) {
  const costs = getAllCancerCosts();

  return (
    <div className="mt-3 bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={16} className="text-amber-600" />
        <h3 className="text-sm font-bold text-gray-800">{L.costCardTitle[lang] || L.costCardTitle.en}</h3>
      </div>
      <div className="space-y-2">
        {costs.map((c) => (
          <div key={c.id} className="border border-gray-100 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-900 mb-1.5">{c.name[lang] || c.name.en}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">{L.costSurgery[lang] || L.costSurgery.en}</span>
                <span className="font-medium text-gray-700">
                  {formatKRW(c.surgery.min, lang)}~{formatKRW(c.surgery.max, lang)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{L.costChemo[lang] || L.costChemo.en}</span>
                <span className="font-medium text-gray-700">
                  {formatKRW(c.chemo.min, lang)}~{formatKRW(c.chemo.max, lang)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{L.costRadiation[lang] || L.costRadiation.en}</span>
                <span className="font-medium text-gray-700">
                  {formatKRW(c.radiation.min, lang)}~{formatKRW(c.radiation.max, lang)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{L.costInpatient[lang] || L.costInpatient.en}</span>
                <span className="font-medium text-gray-700">
                  {c.inpatientDays.min}~{c.inpatientDays.max} {L.days[lang] || L.days.en}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">{getCostDisclaimer(lang)}</p>
      <p className="text-[9px] text-gray-400 mt-1">{getCostSource(lang)}</p>
    </div>
  );
}

// ─── Message Bubble ───

function ChatBubble({ msg, lang }) {
  const isUser = msg.role === 'user';
  const sources = msg.sources || [];

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-gray-200 text-gray-600' : 'bg-teal-700 text-white'
      }`}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className={`max-w-[85%] sm:max-w-[75%]`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-teal-700 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 shadow-sm rounded-tl-sm text-gray-800'
        }`}>
          {msg.content.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < msg.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>

        {/* Source tier badges */}
        {!isUser && sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 px-1">
            {sources.map((s, i) => (
              <SourceBadge key={i} tier={s.tier} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function PatientChatClient() {
  const router = useRouter();
  const lang = useLang();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [handOff, setHandOff] = useState(false);

  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const l = (obj) => obj?.[lang] || obj?.en || '';

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Init auth
  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadThreads();
      }
      setLoading(false);
    };
    init();
  }, []);

  // Load thread list
  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/patient/chat');
      const json = await res.json();
      if (json.ok) setThreads(json.threads || []);
    } catch (e) {
      console.error('[PatientChat] loadThreads:', e);
    }
  }, []);

  // Load thread messages
  const loadThread = useCallback(async (threadId) => {
    try {
      const res = await fetch(`/api/patient/chat/${threadId}`);
      const json = await res.json();
      if (json.ok) {
        setMessages(json.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources || [],
        })));
        setActiveThread(threadId);
        setShowHistory(false);
        setHandOff(false);
      }
    } catch (e) {
      console.error('[PatientChat] loadThread:', e);
    }
  }, []);

  // Start new chat
  const startNewChat = useCallback(async () => {
    try {
      const res = await fetch('/api/patient/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', language: lang }),
      });
      const json = await res.json();
      if (json.ok) {
        setActiveThread(json.thread_id);
        setMessages([{
          id: 'intro',
          role: 'assistant',
          content: l(L.intro),
          sources: [],
        }]);
        setShowHistory(false);
        setHandOff(false);
        await loadThreads();
        inputRef.current?.focus();
      }
    } catch (e) {
      console.error('[PatientChat] startNewChat:', e);
    }
  }, [lang, l, loadThreads]);

  // Send message (optionally with a preset text and intent from quick actions)
  const handleSend = async (presetText = null, intent = null) => {
    const trimmed = (presetText ?? input).trim();
    if (!trimmed || sending) return;

    // If no active thread, start one first
    let threadId = activeThread;
    if (!threadId) {
      try {
        const res = await fetch('/api/patient/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', language: lang }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        threadId = json.thread_id;
        setActiveThread(threadId);
        setMessages([{
          id: 'intro',
          role: 'assistant',
          content: l(L.intro),
          sources: [],
        }]);
      } catch (e) {
        console.error('[PatientChat] auto-start failed:', e);
        return;
      }
    }

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content: trimmed, sources: [], intent };
    setMessages((prev) => [...prev, userMsg]);
    if (!presetText) setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/patient/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          thread_id: threadId,
          text: trimmed,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessages((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, role: 'assistant', content: l(L.error), sources: [] },
        ]);
        return;
      }

      if (json.ai_error) {
        setMessages((prev) => [
          ...prev,
          { id: `ai_${Date.now()}`, role: 'assistant', content: l(L.error), sources: [] },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: json.message_id || `ai_${Date.now()}`,
          role: 'assistant',
          content: json.reply,
          sources: json.sources || [],
        },
      ]);

      if (json.hand_off?.requested) {
        setHandOff(true);
      }

      // Refresh thread list (subject may have updated)
      loadThreads();
    } catch (e) {
      console.error('[PatientChat] send error:', e);
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, role: 'assistant', content: l(L.error), sources: [] },
      ]);
    } finally {
      setSending(false);
    }
  };

  // ─── Login required ───
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MessageSquare size={48} className="text-gray-300" />
        <p className="text-gray-500 text-center">{l(L.login)}</p>
        <button
          onClick={() => router.push('/login?redirect=/patient/chat')}
          className="px-6 py-2.5 bg-teal-700 text-white rounded-full text-sm font-medium hover:bg-teal-800 transition"
        >
          Log In
        </button>
      </div>
    );
  }

  // ─── History sidebar (mobile: fullscreen overlay) ───
  if (showHistory) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">{l(L.history)}</h2>
          <button
            onClick={() => setShowHistory(false)}
            className="text-sm text-teal-700 font-medium"
          >
            {l(L.title)}
          </button>
        </div>

        <button
          onClick={startNewChat}
          className="w-full flex items-center gap-3 p-4 mb-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-700 font-medium hover:bg-teal-100 transition"
        >
          <Plus size={20} />
          {l(L.newChat)}
        </button>

        {threads.length === 0 ? (
          <p className="text-center text-gray-400 py-12">{l(L.noHistory)}</p>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => loadThread(t.id)}
                className={`w-full text-left p-4 rounded-2xl border transition ${
                  t.id === activeThread
                    ? 'bg-teal-50 border-teal-200'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800 truncate pr-4">
                    {t.subject || (L.title[lang] || L.title.en)}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    t.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(t.updated_at || t.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Main chat view ───
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        <button
          onClick={() => setShowHistory(true)}
          className="p-1.5 rounded-xl hover:bg-gray-100 transition text-gray-500"
          title={l(L.history)}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 truncate">{l(L.title)}</h1>
          <p className="text-[10px] text-gray-400">3-Tier RAG</p>
        </div>
        <button
          onClick={startNewChat}
          className="p-2 rounded-xl hover:bg-teal-50 transition text-teal-700"
          title={l(L.newChat)}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50"
      >
        {messages.length === 0 && !activeThread && (
          <div className="flex flex-col items-center justify-center min-h-full gap-5 text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Bot size={32} className="text-teal-700" />
            </div>
            <p className="text-sm text-gray-500 whitespace-pre-line max-w-xs">{l(L.intro)}</p>

            {/* Quick Action buttons */}
            <div className="w-full max-w-sm">
              <p className="text-[11px] text-gray-400 mb-2 font-medium">{l(L.qaTitle)}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSend(l(L.qaFindHospitalQ), 'find_hospital')}
                  className="flex items-center gap-2 p-3 bg-white border border-teal-100 rounded-xl hover:border-teal-300 hover:bg-teal-50/50 transition text-left"
                >
                  <Building2 size={14} className="text-teal-700 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">{l(L.qaFindHospital)}</span>
                </button>
                <button
                  onClick={() => handleSend(l(L.qaCostQ), 'cost')}
                  className="flex items-center gap-2 p-3 bg-white border border-amber-100 rounded-xl hover:border-amber-300 hover:bg-amber-50/50 transition text-left"
                >
                  <Wallet size={14} className="text-amber-600 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">{l(L.qaCost)}</span>
                </button>
                <button
                  onClick={() => handleSend(l(L.qaDurationQ), 'duration')}
                  className="flex items-center gap-2 p-3 bg-white border border-blue-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition text-left"
                >
                  <Clock size={14} className="text-blue-600 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">{l(L.qaDuration)}</span>
                </button>
                <button
                  onClick={() => handleSend(l(L.qaVisaQ), 'visa')}
                  className="flex items-center gap-2 p-3 bg-white border border-purple-100 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition text-left"
                >
                  <FileText size={14} className="text-purple-600 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">{l(L.qaVisa)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          // If this is an assistant message that follows a user msg with an intent, show the card below
          const prev = idx > 0 ? messages[idx - 1] : null;
          const intentForCard =
            msg.role === 'assistant' && prev?.role === 'user' ? prev.intent : null;
          return (
            <div key={msg.id}>
              <ChatBubble msg={msg} lang={lang} />
              {intentForCard === 'find_hospital' && (
                <div className="pl-10 sm:pl-10">
                  <PartnerHospitalsCard lang={lang} />
                </div>
              )}
              {intentForCard === 'cost' && (
                <div className="pl-10 sm:pl-10">
                  <CancerCostsCard lang={lang} />
                </div>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-teal-700 text-white">
              <Bot size={15} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hand-off banner */}
      {handOff && (
        <div className="mx-4 my-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{l(L.handOff)}</span>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={l(L.placeholder)}
            className="flex-1 border border-gray-200 rounded-full py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="w-10 h-10 flex items-center justify-center bg-teal-700 text-white rounded-full hover:bg-teal-800 transition disabled:opacity-40 shrink-0"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2 px-2">
          {l(L.disclaimer)}
        </p>
      </div>
    </div>
  );
}
