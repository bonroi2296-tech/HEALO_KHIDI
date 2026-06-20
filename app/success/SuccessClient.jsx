"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, FileText, Sparkles, Check, MessageCircle } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';

export const SuccessPage = ({ setView }) => {
    const router = useRouter();
    const langCode = useLang();
    const [ticketId] = useState(() => "REQ-" + Math.floor(100000 + Math.random() * 900000));
    const [inquirySuccess, setInquirySuccess] = useState(null);

    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined' ? sessionStorage.getItem('inquiry_success') : null;
            const data = raw ? JSON.parse(raw) : null;
            if (data?.inquiryId != null && data?.publicToken) {
                setInquirySuccess({ inquiryId: data.inquiryId, publicToken: data.publicToken });
            }
        } catch {
            // Ignore sessionStorage errors
        }
    }, []);

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 py-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative">
                
                {/* 상단 컬러 라인 (포인트) */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 to-teal-600"></div>

                <div className="p-8 pb-10">
                    {/* 1. 애니메이션 아이콘 */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        {/* 뒤에서 퍼지는 파동 효과 */}
                        <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-20"></div>
                        {/* 메인 아이콘 */}
                        <div className="relative bg-gradient-to-tr from-teal-500 to-teal-400 w-full h-full rounded-full flex items-center justify-center shadow-lg shadow-teal-200 border-4 border-white">
                            <CheckCircle2 size={40} className="text-white" strokeWidth={3} />
                        </div>
                        {/* 깨알 데코 (반짝이) */}
                        <div className="absolute -right-2 -top-1 bg-yellow-400 p-1.5 rounded-full border-2 border-white shadow-sm animate-bounce">
                            <Sparkles size={14} className="text-white" fill="currentColor"/>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">{t('success.receivedTitle', langCode)}</h2>
                        <p className="text-gray-500 text-sm">
                            {t('success.thankYou', langCode)}
                        </p>
                    </div>

                    {/* 2. 접수증 (Ticket Info) */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-8 flex flex-col gap-3 relative overflow-hidden">
                        {/* 배경 데코 패턴 */}
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <FileText size={64} className="text-gray-900" />
                        </div>

                        <div className="flex justify-between items-center text-sm relative z-10">
                            <span className="text-gray-500 font-medium">{t('success.referenceId', langCode)}</span>
                            <span className="font-mono font-bold text-teal-800 bg-teal-100/50 px-2 py-0.5 rounded border border-teal-100">
                                {ticketId || "—"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm relative z-10">
                            <span className="text-gray-500 font-medium">{t('success.estResponse', langCode)}</span>
                            <span className="font-bold text-gray-900 flex items-center gap-1.5">
                                <Clock size={14} className="text-teal-700"/> {t('success.within24h', langCode)}
                            </span>
                        </div>
                    </div>

                    {/* 3. 진행 상황 타임라인 (What's Next) */}
                    <div className="text-left mb-8 px-2">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4 ml-1">{t('success.whatNext', langCode)}</p>
                        <div className="space-y-0 relative pl-2">
                            <div className="absolute left-[11px] top-2 bottom-6 w-0.5 bg-gray-100"></div>

                            <div className="relative flex gap-4 pb-6">
                                <div className="w-6 h-6 rounded-full bg-teal-700 flex items-center justify-center shrink-0 z-10 ring-4 ring-white shadow-sm">
                                    <Check size={12} className="text-white" strokeWidth={3}/>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 leading-none mb-1">{t('success.step1Title', langCode)}</p>
                                    <p className="text-xs text-gray-500">{t('success.step1Desc', langCode)}</p>
                                </div>
                            </div>
                            
                            <div className="relative flex gap-4 pb-6">
                                <div className="w-6 h-6 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center shrink-0 z-10 ring-4 ring-white">
                                    <div className="w-2 h-2 bg-teal-700 rounded-full animate-pulse"></div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-teal-700 leading-none mb-1">{t('success.step2Title', langCode)}</p>
                                    <p className="text-xs text-gray-500">{t('success.step2Desc', langCode)}</p>
                                </div>
                            </div>

                            <div className="relative flex gap-4 pb-6">
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 z-10 ring-4 ring-white">
                                    <MessageCircle size={12} className="text-gray-400"/>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-400 leading-none mb-1">{t('success.step3Title', langCode)}</p>
                                    <p className="text-xs text-gray-400">{t('success.step3Desc', langCode)}</p>
                                </div>
                            </div>

                            <div className="relative flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 z-10 ring-4 ring-white">
                                    <Sparkles size={12} className="text-gray-400"/>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-400 leading-none mb-1">{t('success.step4Title', langCode)}</p>
                                    <p className="text-xs text-gray-400">{t('success.step4Desc', langCode)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. CTA 버튼들: 계정 생성 유도 → 추가 정보 → 홈 */}
                    <div className="space-y-3">
                        {/* 핵심 CTA: 계정 생성 → 진행 상황 추적 */}
                        <button
                            onClick={() => router.push('/signup?redirect=/patient')}
                            className="w-full bg-teal-700 text-white font-bold py-4 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100 transform active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {t('success.createAccountCta', langCode)}
                        </button>

                        {inquirySuccess && (
                            <button
                                type="button"
                                onClick={() => {
                                  fetch('/api/inquiries/event', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ eventType: 'step2_viewed', inquiryId: inquirySuccess.inquiryId }),
                                  }).catch(() => {});
                                  router.push(`/inquiry/intake?inquiryId=${inquirySuccess.inquiryId}&token=${encodeURIComponent(inquirySuccess.publicToken)}`);
                                }}
                                className="w-full bg-teal-50 border-2 border-teal-500 text-teal-700 font-bold py-4 rounded-xl hover:bg-teal-100 transition shadow-sm transform active:scale-[0.98]"
                            >
                                {t('success.addInfoCta', langCode)}
                            </button>
                        )}
                        <button
                            onClick={() => setView('home')}
                            className="w-full bg-white border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition transform active:scale-[0.98] text-sm"
                        >
                            {t('success.returnHome', langCode)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
