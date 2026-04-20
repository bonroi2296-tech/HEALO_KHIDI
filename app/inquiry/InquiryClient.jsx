"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, Bot, MessageCircle, ClipboardList, ArrowRight, AlertCircle, Headset, UploadCloud, File, X, Check } from 'lucide-react';
import { getPrivacyPolicyText, getTermsPolicyText } from '../../src/lib/policies';
import { PolicyModal } from '../../src/components/Modals';
import { useToast } from '../../src/components/Toast';
import { getLangCodeFromCookie, t } from '../../src/lib/i18n';
import { SITE_INFO } from '../../src/lib/siteSettings';
import { useLang } from '../../src/lib/i18n/LangContext';
import { event } from '../../src/lib/ga';
import { useChat } from '@ai-sdk/react';
import { InquiryFormB } from './InquiryFormB';
import { ThreadChat } from './ThreadChat';

function MessengerCard({ name, url, iconColor, iconHref, regionKey, langCode, t, toast }) {
  const handleClick = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.info(t('inquiry.messengerComingSoon', langCode));
    }
  };
  const baseClass = "group bg-white border border-gray-200 rounded-2xl p-4 md:p-8 hover:shadow-xl transition-all cursor-pointer flex flex-row md:flex-col items-center gap-4 md:gap-0 text-left md:text-center w-full";
  const borderStyle = url ? { '--hover-color': iconColor } : {};
  return (
    <button type="button" onClick={handleClick} className={baseClass} style={borderStyle}>
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-110 transition-transform duration-300 bg-gray-50">
        <img src={iconHref} alt={name} className="w-7 h-7 md:w-9 md:h-9 object-contain" />
      </div>
      <div className="flex-1">
        <h3 className="text-base md:text-xl font-bold text-gray-900 md:mb-1">{name}</h3>
        <p className="text-xs md:text-sm text-gray-400 md:mb-6">{t(regionKey, langCode)}</p>
      </div>
      <div className="font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: iconColor }}>
        <span className="hidden md:inline">{t('inquiry.chatNow', langCode)}</span> <ArrowRight size={20}/>
      </div>
    </button>
  );
}

// ✅ [수정 1] props에 treatments 추가 (App.jsx에서 받아옴)
export const InquiryPage = ({ setView, mode, setMode, onClose, treatments }) => {
  const toast = useToast();
  const langCode = useLang();
  const allTreatments = Array.isArray(treatments) ? treatments : [];

  const {
    messages,
    input,
    setInput,
    // handleInputChange 는 ai@6 에서 deprecated — 현재 사용 안함. 이 컴포넌트를
    // sendMessage 기반 v6 API 로 전환 시 제거.
    handleInputChange: _handleInputChange,
    append,
    error: chatError,
  } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'intro',
        role: 'assistant',
        content: t('chat.intro', langCode),
      },
    ],
  });
  const chatContainerRef = useRef(null);
  const [activeModal, setActiveModal] = useState(null);
  const lastChatErrorRef = useRef(null);
  const sessionId = useMemo(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const getUtmParams = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const utm = {};
    keys.forEach((key) => {
      const value = params.get(key);
      if (value) utm[key] = value;
    });
    return Object.keys(utm).length ? utm : null;
  };

  // 폼 상태 관리 (Step1: 5필수 + message 선택)
  const [formData, setFormData] = useState({
      firstName: '', lastName: '', email: '', nationality: '', spokenLanguage: '',
      contactMethod: '', contactId: '', treatmentType: '', preferredDate: '',
      preferredDateFlex: false,
      message: '', file: null, privacyAgreed: false
  });
  
  // ✅ 실시간 검증 에러 상태 (인라인 통일)
  const [emailError, setEmailError] = useState('');
  const [formErrors, setFormErrors] = useState({ treatmentType: '', nationality: '', spokenLanguage: '', contact: '', preferred: '', privacy: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clearFieldError = (field) => setFormErrors((prev) => ({ ...prev, [field]: '' }));

  const _handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const lang = getLangCodeFromCookie();
    const page = typeof window !== 'undefined' ? window.location.pathname : null;
    const utm = getUtmParams();
    append(
      { role: 'user', content: trimmed },
      { body: { lang, session_id: sessionId, page, utm } }
    ).catch(() => {
      toast.error(t('chat.error', langCode));
    });
    setInput('');
  };
  
  useEffect(() => {
    if (!chatError) {
      lastChatErrorRef.current = null;
      return;
    }
    if (lastChatErrorRef.current === chatError) return;
    lastChatErrorRef.current = chatError;
    toast.error(t('chat.error', langCode));
  }, [chatError, toast, langCode]);

  useEffect(() => {
    if (chatContainerRef.current)
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages]);

  // ✅ Funnel 이벤트: /inquiry 진입 시 step1_viewed
  useEffect(() => {
    if (mode === 'form') {
      fetch('/api/inquiries/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'step1_viewed' }),
      }).catch(() => {});
    }
  }, [mode]);

  const handleBack = () => {
      if (mode === 'select') { if (onClose) onClose(); else setView('home'); } else { setMode('select'); }
  };

  const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          setFormData({ ...formData, file: file });
      }
  };

  const handleFormSubmit = async () => {
    if (isSubmitting) return;
    // Step1 필수 5개: treatment_type, nationality, spoken_language, contact(이메일 OR method+id), preferred(날짜 OR flex)
    const hasContact = (formData.email?.trim()) || (formData.contactMethod && formData.contactId?.trim());
    const hasPreferred = !!(formData.preferredDate?.trim()) || !!formData.preferredDateFlex;
    const err = { treatmentType: '', nationality: '', spokenLanguage: '', contact: '', preferred: '', privacy: '' };
    if (!formData.treatmentType?.trim()) { err.treatmentType = "Please select Main Concern."; }
    if (!formData.nationality?.trim()) { err.nationality = "Please enter Nationality."; }
    if (!formData.spokenLanguage?.trim()) { err.spokenLanguage = "Please enter Spoken Language."; }
    if (!hasContact) { err.contact = "Please provide Email or Messenger (method + ID)."; }
    if (!hasPreferred) { err.preferred = "Please set Preferred Date or check Flexible."; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setEmailError("Please enter a valid email address (e.g., example@email.com)");
      err.contact = "Please enter a valid email or provide Messenger.";
      setFormErrors(err);
      return;
    }
    if (!formData.privacyAgreed) { err.privacy = "Please agree to the Privacy Policy."; }
    const hasErr = Object.values(err).some(Boolean);
    if (hasErr) {
      setFormErrors(err);
      toast.error("Please fix the fields below.");
      return;
    }
    setFormErrors({ treatmentType: '', nationality: '', spokenLanguage: '', contact: '', preferred: '', privacy: '' });

    setIsSubmitting(true);
    try {
        let attachmentPath = null;
        let attachmentsList = [];
        if (formData.file) {
            const uploadForm = new FormData();
            uploadForm.append('file', formData.file);
            const uploadRes = await fetch('/api/attachments/upload', {
              method: 'POST',
              body: uploadForm,
            });
            const uploadResult = await uploadRes.json();
            if (!uploadResult.ok) throw new Error(uploadResult.error || 'Upload failed');
            attachmentPath = uploadResult.path;
            attachmentsList = [
              { path: uploadResult.path, name: uploadResult.name, type: uploadResult.type || null },
            ];
        }

        const preferredDateVal = formData.preferredDateFlex ? null : (formData.preferredDate
          ? new Date(formData.preferredDate).toISOString().split('T')[0]
          : null);

        // 🔒 RLS 보안: 서버 API 경유로 변경 (클라이언트 직접 insert 차단)
        // Before: supabase.from('inquiries').insert() (RLS에 의해 차단됨)
        // After: /api/inquiries/create (service_role로 RLS 우회)
        const createResponse = await fetch('/api/inquiries/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName || null,
            lastName: formData.lastName || null,
            email: formData.email || null,
            nationality: formData.nationality,
            spokenLanguage: formData.spokenLanguage,
            contactMethod: formData.contactMethod || null,
            contactId: formData.contactId || null,
            treatmentType: formData.treatmentType,
            preferredDate: preferredDateVal,
            preferredDateFlex: !!formData.preferredDateFlex,
            message: formData.message || null,
            attachment: attachmentPath,
            attachments: attachmentsList,
          }),
        });

        const createResult = await createResponse.json();

        if (!createResult.ok) {
          // 🔧 에러 타입에 따라 구체적인 메시지 표시
          let errorMessage = 'Failed to submit inquiry. Please try again.';
          
          switch (createResult.error) {
            case 'invalid_email':
              errorMessage = 'Please enter a valid email address (e.g., example@email.com)';
              break;
            case 'missing_contact':
              errorMessage = 'Please provide either Email or Messenger contact information';
              break;
            case 'missing_required_fields':
              errorMessage = 'Please fill in all required fields';
              break;
            case 'rate_limit_exceeded':
              errorMessage = `Too many requests. Please try again in ${createResult.retryAfter || 60} seconds`;
              break;
            case 'encryption_failed':
              errorMessage = 'Security error occurred. Please contact support';
              break;
            default:
              errorMessage = createResult.detail || createResult.error || 'Failed to submit inquiry';
          }
          
          throw new Error(errorMessage);
        }

        const inquiryId = createResult.inquiryId;
        const publicToken = createResult.publicToken;

        // ✅ RAG 시스템을 위한 normalize API 호출
        if (inquiryId) {
          try {
            const res = await fetch('/api/inquiry/normalize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                inquiry_id: inquiryId,
                source_type: 'inquiry_form',
                source_inquiry_id: inquiryId,
              }),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              console.error('[InquiryForm] normalize API error:', res.status, j);
            } else {
              console.log('[InquiryForm] ✅ normalize API success');
            }
          } catch (e) {
            console.error('[InquiryForm] normalize call failed:', e);
          }
        }

        if (typeof window !== 'undefined' && inquiryId != null && publicToken != null) {
          try {
            sessionStorage.setItem('inquiry_success', JSON.stringify({ inquiryId, publicToken: String(publicToken) }));
          } catch (err) {
            console.warn("Failed to parse session data:", err);
        }
        }

        // ✅ Funnel 이벤트: Step1 제출 성공
        if (inquiryId != null) {
          fetch('/api/inquiries/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType: 'step1_submitted', inquiryId }),
          }).catch(() => {});
        }

        const submitLang = getLangCodeFromCookie();
        if (submitLang) {
          const isLikelySlug =
            typeof formData.treatmentType === "string" &&
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.treatmentType);
          const treatmentSlug = isLikelySlug ? formData.treatmentType : null;
          event("submit_inquiry", { source_type: "inquiry_form", treatment_slug: treatmentSlug, lang: submitLang });
        }
        setView('success');
    } catch (error) {
        console.error('Error:', error);
        // ✅ API에서 받은 구체적인 에러 메시지 표시
        toast.error(error.message || "Failed to submit inquiry. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-16 text-center animate-in fade-in slide-in-from-bottom-4">
      <button onClick={handleBack} className="flex items-center text-sm font-bold text-gray-500 mb-6 md:mb-8 hover:text-teal-600">
          <ChevronLeft size={16}/> {mode === 'select' ? t('inquiry.back', langCode) : t('inquiry.backToOptions', langCode)}
      </button>
      
      {mode === 'select' && (
        <>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-12">{t('inquiry.howToProceed', langCode)}</h1>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5">
            <div
                onClick={() => {
                  const startLang = getLangCodeFromCookie();
                  if (startLang) {
                    event("start_inquiry", {
                      source_type: "ai_agent",
                      lang: startLang,
                    });
                  }
                  setMode('ai');
                }}
                className="bg-white border border-teal-100 rounded-3xl p-6 md:p-8 hover:border-teal-500 hover:shadow-xl transition-all cursor-pointer group flex flex-row md:flex-col items-center text-left md:text-center gap-4 md:gap-0"
            >
                <div className="w-14 h-14 md:w-20 md:h-20 bg-teal-50 rounded-full flex items-center justify-center md:mb-6 shrink-0 group-hover:bg-teal-100 transition-colors"><Bot size={28} className="text-teal-600 md:w-10 md:h-10" /></div>
                <div>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">{t('inquiry.aiAgent', langCode)}</h3>
                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{t('inquiry.aiAgentDesc', langCode)}</p>
                </div>
            </div>

            <div onClick={() => setMode('human')} className="bg-white border border-teal-100 rounded-3xl p-6 md:p-8 hover:border-green-500 hover:shadow-xl transition-all cursor-pointer group flex flex-row md:flex-col items-center text-left md:text-center gap-4 md:gap-0">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-green-50 rounded-full flex items-center justify-center md:mb-6 shrink-0 group-hover:bg-green-100 transition-colors"><MessageCircle size={28} className="text-green-600 md:w-10 md:h-10" /></div>
                <div>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">{t('inquiry.humanAgent', langCode)}</h3>
                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{t('inquiry.humanAgentDesc', langCode)}</p>
                </div>
            </div>

            <div
                onClick={() => {
                  const startLang = getLangCodeFromCookie();
                  if (startLang) {
                    event("start_inquiry", {
                      source_type: "inquiry_form",
                      lang: startLang,
                    });
                  }
                  setMode('form');
                }}
                className="bg-white border border-teal-100 rounded-3xl p-6 md:p-8 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group flex flex-row md:flex-col items-center text-left md:text-center gap-4 md:gap-0"
            >
                <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-50 rounded-full flex items-center justify-center md:mb-6 shrink-0 group-hover:bg-blue-100 transition-colors"><ClipboardList size={28} className="text-blue-600 md:w-10 md:h-10" /></div>
                <div>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">{t('inquiry.inquiryForm', langCode)}</h3>
                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{t('inquiry.inquiryFormDesc', langCode)}</p>
                </div>
            </div>

            {/* A/B Test: Form B (Guided Wizard) */}
            <div
                onClick={() => {
                  const startLang = getLangCodeFromCookie();
                  if (startLang) {
                    event("start_inquiry", {
                      source_type: "inquiry_form_B",
                      lang: startLang,
                    });
                  }
                  setMode('formB');
                }}
                className="bg-white border border-purple-100 rounded-3xl p-6 md:p-8 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer group flex flex-row md:flex-col items-center text-left md:text-center gap-4 md:gap-0"
            >
                <div className="w-14 h-14 md:w-20 md:h-20 bg-purple-50 rounded-full flex items-center justify-center md:mb-6 shrink-0 group-hover:bg-purple-100 transition-colors"><ClipboardList size={28} className="text-purple-600 md:w-10 md:h-10" /></div>
                <div>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">{t('inquiry.guidedForm', langCode)} <span className="text-xs font-normal text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">B</span></h3>
                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{t('inquiry.guidedFormDesc', langCode)}</p>
                </div>
            </div>
          </div>

          {/* 실험용 CTA 섹션 - 기존 3개 카드와 완전히 별도 */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-4">{t('inquiry.notSure', langCode)}</p>
              <button
                onClick={() => {
                  const startLang = getLangCodeFromCookie();
                  if (startLang) {
                    event("start_inquiry", {
                      source_type: "consult_beta",
                      lang: startLang,
                    });
                  }
                  // 새로운 실험용 퍼널로 이동
                  if (typeof window !== 'undefined') {
                    window.location.href = '/consult/start';
                  }
                }}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors border border-gray-300"
              >
                {t('inquiry.startConsultBeta', langCode)}
              </button>
              <p className="text-xs text-gray-500 mt-3 max-w-md mx-auto">
                {t('inquiry.startConsultDesc', langCode)}
              </p>
            </div>
          </div>
        </>
      )}

      {mode === 'ai' && (
        <ThreadChat />
      )}

      {mode === 'human' && (
        <div className="animate-in fade-in slide-in-from-right-4">
            <div className="text-center mb-8 md:mb-12">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600">
                    <Headset size={28} className="md:w-8 md:h-8" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t('inquiry.humanAgent', langCode)}</h2>
                <p className="text-gray-500 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                    {t('inquiry.humanAgentConnect', langCode)}<br className="hidden md:block"/>
                    {t('inquiry.humanAgentReply', langCode)}
                </p>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-3 gap-3 md:gap-6 max-w-md md:max-w-none mx-auto">
                <MessengerCard
                    name="WhatsApp"
                    url={SITE_INFO.messenger?.whatsapp}
                    iconColor="#25D366"
                    iconHref="https://cdn.simpleicons.org/whatsapp/25D366"
                    regionKey="inquiry.globalSupport"
                    langCode={langCode}
                    t={t}
                    toast={toast}
                />
                <MessengerCard
                    name="LINE"
                    url={SITE_INFO.messenger?.line}
                    iconColor="#06C755"
                    iconHref="https://cdn.simpleicons.org/line/00B900"
                    regionKey="inquiry.japanThai"
                    langCode={langCode}
                    t={t}
                    toast={toast}
                />
                <MessengerCard
                    name="WeChat"
                    url={SITE_INFO.messenger?.wechat}
                    iconColor="#07C160"
                    iconHref="https://cdn.simpleicons.org/wechat/07C160"
                    regionKey="inquiry.chinaSupport"
                    langCode={langCode}
                    t={t}
                    toast={toast}
                />
            </div>
        </div>
      )}

      {mode === 'form' && (
        <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-5 md:p-8 text-left max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 mb-20">
            <div className="mb-6 md:mb-8 border-b border-gray-100 pb-4 md:pb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{t('inquiry.inquiryForm', langCode)}</h2>
                <p className="text-gray-500 text-xs md:text-sm">{t('inquiry.fillDetails', langCode)}</p>
            </div>
            
            <div className="space-y-4 md:space-y-6">
                {/* 이름 (선택) */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t('inquiry.firstName', langCode)}</label>
                        <input type="text" value={formData.firstName} onChange={(e)=>setFormData({...formData, firstName: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none transition text-sm bg-gray-50/50" placeholder="John"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t('inquiry.lastName', langCode)}</label>
                        <input type="text" value={formData.lastName} onChange={(e)=>setFormData({...formData, lastName: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none transition text-sm bg-gray-50/50" placeholder="Doe"/>
                    </div>
                </div>

                {/* 연락: 이메일 OR 메신저 (둘 중 하나 필수) */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t('inquiry.email', langCode)} <span className="text-gray-400 font-normal">({t('inquiry.orMessenger', langCode)})</span></label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({...formData, email: value});
                        clearFieldError('contact');
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (value && !emailRegex.test(value)) {
                          setEmailError('Please enter a valid email address (e.g., example@email.com)');
                        } else {
                          setEmailError('');
                        }
                      }}
                      className={`w-full p-3 rounded-xl border ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-teal-500'} outline-none transition text-sm bg-gray-50/50`}
                      placeholder="your@email.com"
                    />
                    {emailError && (
                      <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {emailError}
                      </p>
                    )}
                </div>

                {/* 메신저: 선택 시에만 ID 입력칸 노출 */}
                <div>
                    <label className="block text-xs font-bold text-teal-700 mb-1 ml-1 flex gap-1 items-center">
                        <MessageCircle size={12}/> {t('inquiry.messenger', langCode)}
                    </label>
                    <select value={formData.contactMethod} onChange={(e)=>setFormData({...formData, contactMethod: e.target.value})} className="w-full md:w-[35%] p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none transition text-sm bg-gray-50 text-gray-700 font-medium">
                        <option value="">Select...</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="LINE">LINE</option>
                        <option value="WeChat">WeChat</option>
                        <option value="KakaoTalk">KakaoTalk</option>
                    </select>
                    {formData.contactMethod && (
                        <input type="text" value={formData.contactId} onChange={(e)=>{ setFormData({...formData, contactId: e.target.value}); clearFieldError('contact'); }} className="mt-2 w-full md:w-[65%] p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none transition text-sm bg-white" placeholder="ID / Phone"/>
                    )}
                    {formErrors.contact && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.contact}</p>}
                </div>

                {/* 국적 & 언어 */}
                <div className="grid grid-cols-2 gap-3">
<div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t('inquiry.nationality', langCode)} <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.nationality} onChange={(e)=>{ setFormData({...formData, nationality: e.target.value}); clearFieldError('nationality'); }} className={`w-full p-3 rounded-xl border ${formErrors.nationality ? 'border-red-400' : 'border-gray-200'} focus:border-teal-500 outline-none transition text-sm bg-gray-50/50`} placeholder="USA"/>
                    {formErrors.nationality && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.nationality}</p>}
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t('inquiry.spokenLanguage', langCode)} <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.spokenLanguage} onChange={(e)=>{ setFormData({...formData, spokenLanguage: e.target.value}); clearFieldError('spokenLanguage'); }} className={`w-full p-3 rounded-xl border ${formErrors.spokenLanguage ? 'border-red-400' : 'border-gray-200'} focus:border-teal-500 outline-none transition text-sm bg-gray-50/50`} placeholder="English"/>
                    {formErrors.spokenLanguage && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.spokenLanguage}</p>}
                    </div>
                </div>

                {/* 날짜 & Main Concern */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t('inquiry.preferredDate', langCode)} <span className="text-red-500">*</span></label>
                        <input type="date" value={formData.preferredDate || ''} onChange={(e) => { setFormData({ ...formData, preferredDate: e.target.value }); clearFieldError('preferred'); }} disabled={!!formData.preferredDateFlex} className={`w-full p-3 rounded-xl border ${formErrors.preferred ? 'border-red-400' : 'border-gray-200'} focus:border-teal-500 outline-none transition text-xs md:text-sm bg-white text-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}/>
                        <label className="mt-2 flex items-center gap-2 cursor-pointer" onClick={() => clearFieldError('preferred')}>
                            <input type="checkbox" checked={!!formData.preferredDateFlex} onChange={(e) => setFormData({ ...formData, preferredDateFlex: e.target.checked, preferredDate: e.target.checked ? '' : formData.preferredDate })} className="rounded accent-teal-600"/>
                            <span className="text-[11px] text-gray-500">{t('inquiry.flexible', langCode)}</span>
                        </label>
                        {formErrors.preferred && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.preferred}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t('inquiry.mainConcern', langCode)} <span className="text-red-500">*</span></label>
                        <select value={formData.treatmentType} onChange={(e)=>{ setFormData({...formData, treatmentType: e.target.value}); clearFieldError('treatmentType'); }} className={`w-full p-3 rounded-xl border ${formErrors.treatmentType ? 'border-red-400' : 'border-gray-200'} focus:border-teal-500 outline-none transition text-xs md:text-sm bg-white text-gray-700`}>
                            <option value="">Select...</option>
                            <option value="chronic-fatigue-low-immunity">Chronic fatigue / low immunity</option>
                            <option value="digestive-problems">Digestive problems</option>
                            <option value="sleep-disorder-insomnia">Sleep disorder / insomnia</option>
                            <option value="stress-related-symptoms">Stress-related symptoms</option>
                            <option value="hormonal-imbalance">Hormonal imbalance</option>
                            <option value="post-illness-recovery">Post-illness recovery</option>
                            <option value="unexplained-chronic-symptoms">Unexplained chronic symptoms</option>
                            <option value="skin-problem">Skin problem (acne, rash, pigmentation)</option>
                            <option value="pain-management">Pain management (neck, back, joints)</option>
                            <option value="digestive-weight-management">Digestive & weight management</option>
                            <option value="general-health-checkup">General health check-up</option>
                            <option value="dental-problem">Dental problem</option>
                            <option value="vision-eye-problem">Vision or eye problem</option>
                            <option value="cosmetic-aesthetic">Cosmetic / aesthetic concern</option>
                            <option value="abnormal-test-suspected-cancer">Abnormal test result / suspected cancer</option>
                            <option value="other-medical-concern">Other medical concern</option>
                        </select>
                        {formErrors.treatmentType && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.treatmentType}</p>}
                    </div>
                </div>

                {/* 메시지 (선택, 권장) */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t('inquiry.message', langCode)} <span className="text-gray-400 font-normal">({t('inquiry.optionalRecommended', langCode)})</span></label>
                    {/* TODO: Main Concern별 placeholder 확장 (e.g. pain-management, vision-eye-problem 등) */}
                    <textarea
                      value={formData.message}
                      onChange={(e)=>setFormData({...formData, message: e.target.value})}
                      className="w-full border border-gray-200 p-3 rounded-xl focus:border-teal-500 outline-none transition text-sm bg-gray-50/50"
                      rows="4"
                      placeholder={
                        formData.treatmentType === 'skin-problem'
                          ? "When did the skin issue start? Which area is affected?"
                          : formData.treatmentType === 'dental-problem'
                          ? "Which tooth or area is painful?"
                          : "e.g. Back pain for 2 weeks; no prior diagnosis."
                      }
                    />
                    <p className="mt-1 ml-1 text-[11px] text-gray-500 leading-relaxed">
                      {formData.treatmentType === 'skin-problem' ? (
                        <>
                          • When did it start?
                          <br />
                          • Which area is affected?
                        </>
                      ) : formData.treatmentType === 'dental-problem' ? (
                        <>
                          • Which tooth or area?
                          <br />
                          • Any pain or sensitivity?
                        </>
                      ) : (
                        <>
                          • What symptom or concern you have
                          <br />
                          • Which body part is affected
                          <br />
                          • Since when (days / weeks / months)
                          <br />
                          • Any previous diagnosis or test results (if any)
                        </>
                      )}
                    </p>

                </div>

                {/* 파일 업로드 */}
                <div>
                    <input type="file" id="fileInput" className="hidden" onChange={handleFileChange} />
                    {formData.file ? (
                        <div className="flex items-center justify-between border border-teal-200 bg-teal-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="bg-teal-100 p-1.5 rounded-lg text-teal-600 shrink-0"><File size={16}/></div>
                                <span className="text-xs font-bold text-teal-800 truncate">{formData.file.name}</span>
                            </div>
                            <button onClick={() => setFormData({...formData, file: null})} className="p-1 hover:bg-teal-100 rounded-full text-teal-500"><X size={16}/></button>
                        </div>
                    ) : (
                        <div onClick={() => document.getElementById('fileInput').click()} className="border border-dashed border-gray-300 rounded-xl p-3 text-center hover:bg-gray-50 transition cursor-pointer flex items-center justify-center gap-2">
                            <UploadCloud className="text-gray-400" size={18}/>
                            <span className="text-xs text-gray-500">Upload photo or medical record (X-ray, test result, diagnosis note if available)</span>
                        </div>
                    )}
                </div>

                {/* 약관 동의 */}
<div className={`p-3 rounded-xl border ${formErrors.privacy ? 'bg-red-50/50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="privacyForm" checked={formData.privacyAgreed} onChange={(e) => { setFormData({...formData, privacyAgreed: e.target.checked}); clearFieldError('privacy'); }} className="mt-0.5 h-4 w-4 cursor-pointer accent-teal-600"/>
                      <label htmlFor="privacyForm" className="text-[11px] text-gray-500 cursor-pointer select-none leading-snug">
                        {t('inquiry.agreePrivacyAndTerms', langCode)}{' '}
                        <span onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }} className="text-teal-600 font-bold hover:underline">{t('policy.privacyTitle', langCode)}</span> {t('inquiry.and', langCode)}{' '}
                        <span onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }} className="text-teal-600 font-bold hover:underline">{t('policy.termsTitle', langCode)}</span>. <span className="text-red-500">*</span>
                      </label>
                    </div>
                    {formErrors.privacy && <p className="text-xs text-red-500 mt-1 ml-7 flex items-center gap-1"><AlertCircle size={12} />{formErrors.privacy}</p>}
                </div>

                <button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition transform active:scale-95 shadow-lg shadow-teal-100 mt-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-teal-600"
                >
                    {isSubmitting ? t('inquiry.submitting', langCode) : t('inquiry.submitInquiry', langCode)}
                </button>
            </div>
        </div>
      )}

      {mode === 'formB' && (
        <InquiryFormB
          setView={(v) => v === 'select' ? setMode('select') : setView(v)}
          treatments={allTreatments}
        />
      )}

      {/* 약관 팝업 */}
      <PolicyModal isOpen={activeModal === 'privacy'} onClose={() => setActiveModal(null)} title={t('policy.privacyTitle', langCode)} content={getPrivacyPolicyText(langCode)} closeLabel={t('policy.close', langCode)} />
      <PolicyModal isOpen={activeModal === 'terms'} onClose={() => setActiveModal(null)} title={t('policy.termsTitle', langCode)} content={getTermsPolicyText(langCode)} closeLabel={t('policy.close', langCode)} />
    </div>
  );
};