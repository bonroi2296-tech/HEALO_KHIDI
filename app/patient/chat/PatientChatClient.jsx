'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getLangCodeFromCookie } from '../../../src/lib/i18n';
import { createSupabaseBrowserClient } from '../../../src/lib/supabase/browser';
import {
  Send, Loader2, Bot, User, Plus, ChevronLeft,
  MessageSquare, Shield, Globe, Database, AlertCircle,
} from 'lucide-react';

// ─── i18n ───

const L = {
  title: { ko: 'AI 건강 상담', en: 'AI Health Chat', ru: 'AI Консультация', kz: 'AI Кеңес', zh: 'AI 健康咨询', ja: 'AI 健康相談' },
  newChat: { ko: '새 대화', en: 'New Chat', ru: 'Новый чат', kz: 'Жаңа чат', zh: '新对话', ja: '新しい会話' },
  history: { ko: '대화 이력', en: 'Chat History', ru: 'История чатов', kz: 'Чат тарихы', zh: '对话历史', ja: '会話履歴' },
  placeholder: { ko: '증상, 치료, 병원에 대해 물어보세요...', en: 'Ask about symptoms, treatments, hospitals...', ru: 'Спросите о симптомах, лечении, больницах...', kz: 'Симптомдар, емдеу, ауруханалар туралы сұраңыз...', zh: '询问症状、治疗、医院...', ja: '症状・治療・病院について質問...' },
  intro: {
    ko: '안녕하세요! HEALO AI 건강 상담 서비스입니다.\n\n저는 한국 의료관광에 관한 정보를 제공합니다:\n- 병원 및 시술 추천\n- 치료 비용 안내\n- 의료 비자 정보\n\n무엇이 궁금하신가요?',
    en: "Hello! I'm HEALO's AI health consultant.\n\nI can help you with:\n- Hospital & treatment recommendations\n- Cost estimates\n- Medical visa information\n\nWhat would you like to know?",
    ru: 'Здравствуйте! Я AI-консультант HEALO.\n\nЯ могу помочь с:\n- Рекомендациями больниц и лечения\n- Оценкой стоимости\n- Информацией о медицинской визе\n\nЧто вас интересует?',
    kz: 'Сәлеметсіз бе! Мен HEALO AI-кеңесшісімін.\n\nМен көмектесе аламын:\n- Ауруханалар мен емдеу ұсыныстары\n- Құн бағалау\n- Медициналық виза ақпараты\n\nНе білгіңіз келеді?',
    zh: '您好！我是HEALO的AI健康顾问。\n\n我可以帮助您：\n- 医院和治疗推荐\n- 费用估算\n- 医疗签证信息\n\n您想了解什么？',
    ja: 'こんにちは！HEALO AIヘルスコンサルタントです。\n\nお手伝いできること：\n- 病院・治療の推薦\n- 費用の見積もり\n- 医療ビザ情報\n\n何をお知りになりたいですか？',
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
  sourceTier1: { ko: 'HEALO 검증', en: 'HEALO Verified', ru: 'HEALO Проверено', kz: 'HEALO Тексерілген', zh: 'HEALO验证', ja: 'HEALO認証' },
  sourceTier2: { ko: '파트너 검증', en: 'Partner Verified', ru: 'Партнер Проверено', kz: 'Серіктес Тексерілген', zh: '合作伙伴验证', ja: 'パートナー認証' },
  sourceTier3: { ko: '공개 소스', en: 'Public Source', ru: 'Открытый источник', kz: 'Ашық дереккөз', zh: '公开来源', ja: '公開ソース' },
  handOff: { ko: '상담원 연결을 요청했습니다. 잠시만 기다려주세요.', en: 'A coordinator has been notified. You can keep chatting.', ru: 'Координатор уведомлен. Можете продолжать общение.', kz: 'Үйлестірушіге хабарландырылды. Сөйлесуді жалғастыра аласыз.', zh: '协调员已收到通知，您可以继续聊天。', ja: 'コーディネーターに通知しました。チャットを続けられます。' },
  login: { ko: '로그인이 필요합니다', en: 'Please log in', ru: 'Войдите в систему', kz: 'Жүйеге кіріңіз', zh: '请登录', ja: 'ログインしてください' },
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

// ─── Message Bubble ───

function ChatBubble({ msg, lang }) {
  const isUser = msg.role === 'user';
  const sources = msg.sources || [];

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-gray-200 text-gray-600' : 'bg-teal-600 text-white'
      }`}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className={`max-w-[85%] sm:max-w-[75%]`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-teal-600 text-white rounded-tr-sm'
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
  const [lang, setLang] = useState('en');
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
    setLang(getLangCodeFromCookie());
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

  // Send message
  const handleSend = async () => {
    const trimmed = input.trim();
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

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content: trimmed, sources: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
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
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
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
          className="px-6 py-2.5 bg-teal-600 text-white rounded-full text-sm font-medium hover:bg-teal-700 transition"
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
            className="text-sm text-teal-600 font-medium"
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
                    {t.subject || 'AI Chat'}
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
          className="p-2 rounded-xl hover:bg-teal-50 transition text-teal-600"
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
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Bot size={32} className="text-teal-600" />
            </div>
            <p className="text-sm text-gray-500 whitespace-pre-line max-w-xs">{l(L.intro)}</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} lang={lang} />
        ))}

        {sending && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-teal-600 text-white">
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
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="w-10 h-10 flex items-center justify-center bg-teal-600 text-white rounded-full hover:bg-teal-700 transition disabled:opacity-40 shrink-0"
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
