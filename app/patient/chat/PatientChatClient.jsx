'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';
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

// ─── Source Tier Badge ───

function SourceBadge({ tier, lang }) {
  const config = {
    1: { icon: Shield, color: 'bg-teal-50 text-teal-700 border-teal-200', label: 'patientChatUI.sourceTier1' },
    2: { icon: Database, color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'patientChatUI.sourceTier2' },
    3: { icon: Globe, color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'patientChatUI.sourceTier3' },
  };
  const c = config[tier] || config[3];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${c.color}`}>
      <Icon size={10} />
      {t(c.label, lang)}
    </span>
  );
}

// ─── Partner Hospitals Card ───

function PartnerHospitalsCard({ lang }) {
  const partners = getAllPartnerHospitals();
  const pick = (obj) => obj?.[lang] || obj?.en || obj?.ko || '';
  const pickArr = (obj) => obj?.[lang] || obj?.en || obj?.ko || [];

  return (
    <div className="mt-3 bg-white border border-teal-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} className="text-teal-700" />
        <h3 className="text-sm font-bold text-gray-800">{t('patientChatUI.partnerCardTitle', lang)}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {partners.map((p) => (
          <Link
            key={p.slug}
            href={`/hospitals/${p.slug}`}
            className="block border border-gray-100 rounded-xl p-3 hover:border-teal-300 hover:bg-teal-50/30 transition"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-900 leading-tight">{pick(p.name)}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                p.badge === 'partner' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {pick(p.type)}
              </span>
            </div>
            <div className="flex items-start gap-1 text-[10px] text-gray-500 mb-1.5">
              <MapPin size={10} className="mt-0.5 shrink-0" />
              <span className="line-clamp-1">{pick(p.address)}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {pickArr(p.specialties).slice(0, 3).map((s, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded">
                  {s}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      <p className="text-[10px] text-gray-500 mt-3 text-center">{t('patientChatUI.partnerCardNote', lang)}</p>
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
        <h3 className="text-sm font-bold text-gray-800">{t('patientChatUI.costCardTitle', lang)}</h3>
      </div>
      <div className="space-y-2">
        {costs.map((c) => (
          <div key={c.id} className="border border-gray-100 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-900 mb-1.5">{c.name[lang] || c.name.en}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('patientChatUI.costSurgery', lang)}</span>
                <span className="font-medium text-gray-700">
                  {formatKRW(c.surgery.min, lang)}~{formatKRW(c.surgery.max, lang)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('patientChatUI.costChemo', lang)}</span>
                <span className="font-medium text-gray-700">
                  {formatKRW(c.chemo.min, lang)}~{formatKRW(c.chemo.max, lang)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('patientChatUI.costRadiation', lang)}</span>
                <span className="font-medium text-gray-700">
                  {formatKRW(c.radiation.min, lang)}~{formatKRW(c.radiation.max, lang)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('patientChatUI.costInpatient', lang)}</span>
                <span className="font-medium text-gray-700">
                  {c.inpatientDays.min}~{c.inpatientDays.max} {t('patientChatUI.days', lang)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">{getCostDisclaimer(lang)}</p>
      <p className="text-[9px] text-gray-500 mt-1">{getCostSource(lang)}</p>
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
          content: t('patientChatUI.intro', lang),
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
  }, [lang, loadThreads]);

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
          content: t('patientChatUI.intro', lang),
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
          { id: `err_${Date.now()}`, role: 'assistant', content: t('patientChatUI.error', lang), sources: [] },
        ]);
        return;
      }

      if (json.ai_error) {
        setMessages((prev) => [
          ...prev,
          { id: `ai_${Date.now()}`, role: 'assistant', content: t('patientChatUI.error', lang), sources: [] },
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
        { id: `err_${Date.now()}`, role: 'assistant', content: t('patientChatUI.error', lang), sources: [] },
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
        <p className="text-gray-500 text-center">{t('patientChatUI.login', lang)}</p>
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
          <h2 className="text-lg font-bold text-gray-900">{t('patientChatUI.history', lang)}</h2>
          <button
            onClick={() => setShowHistory(false)}
            className="text-sm text-teal-700 font-medium"
          >
            {t('patientChatUI.title', lang)}
          </button>
        </div>

        <button
          onClick={startNewChat}
          className="w-full flex items-center gap-3 p-4 mb-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-700 font-medium hover:bg-teal-100 transition"
        >
          <Plus size={20} />
          {t('patientChatUI.newChat', lang)}
        </button>

        {threads.length === 0 ? (
          <p className="text-center text-gray-500 py-12">{t('patientChatUI.noHistory', lang)}</p>
        ) : (
          <div className="space-y-2">
            {threads.map((th) => (
              <button
                key={th.id}
                onClick={() => loadThread(th.id)}
                className={`w-full text-left p-4 rounded-2xl border transition ${
                  th.id === activeThread
                    ? 'bg-teal-50 border-teal-200'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800 truncate pr-4">
                    {th.subject || t('patientChatUI.title', lang)}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    th.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {th.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(th.updated_at || th.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
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
          title={t('patientChatUI.history', lang)}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 truncate">{t('patientChatUI.title', lang)}</h1>
          <p className="text-[10px] text-gray-500">3-Tier RAG</p>
        </div>
        <button
          onClick={startNewChat}
          className="p-2 rounded-xl hover:bg-teal-50 transition text-teal-700"
          title={t('patientChatUI.newChat', lang)}
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
            <p className="text-sm text-gray-500 whitespace-pre-line max-w-xs">{t('patientChatUI.intro', lang)}</p>

            {/* Quick Action buttons */}
            <div className="w-full max-w-sm">
              <p className="text-[11px] text-gray-500 mb-2 font-medium">{t('patientChatUI.qaTitle', lang)}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSend(t('patientChatUI.qaFindHospitalQ', lang), 'find_hospital')}
                  className="flex items-center gap-2 p-3 bg-white border border-teal-100 rounded-xl hover:border-teal-300 hover:bg-teal-50/50 transition text-left"
                >
                  <Building2 size={14} className="text-teal-700 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">{t('patientChatUI.qaFindHospital', lang)}</span>
                </button>
                <button
                  onClick={() => handleSend(t('patientChatUI.qaCostQ', lang), 'cost')}
                  className="flex items-center gap-2 p-3 bg-white border border-amber-100 rounded-xl hover:border-amber-300 hover:bg-amber-50/50 transition text-left"
                >
                  <Wallet size={14} className="text-amber-600 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">{t('patientChatUI.qaCost', lang)}</span>
                </button>
                <button
                  onClick={() => handleSend(t('patientChatUI.qaDurationQ', lang), 'duration')}
                  className="flex items-center gap-2 p-3 bg-white border border-blue-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition text-left"
                >
                  <Clock size={14} className="text-blue-600 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">{t('patientChatUI.qaDuration', lang)}</span>
                </button>
                <button
                  onClick={() => handleSend(t('patientChatUI.qaVisaQ', lang), 'visa')}
                  className="flex items-center gap-2 p-3 bg-white border border-purple-100 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition text-left"
                >
                  <FileText size={14} className="text-purple-600 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">{t('patientChatUI.qaVisa', lang)}</span>
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
          <span>{t('patientChatUI.handOff', lang)}</span>
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
            placeholder={t('patientChatUI.placeholder', lang)}
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
        <p className="text-[10px] text-gray-500 text-center mt-2 px-2">
          {t('patientChatUI.disclaimer', lang)}
        </p>
      </div>
    </div>
  );
}
