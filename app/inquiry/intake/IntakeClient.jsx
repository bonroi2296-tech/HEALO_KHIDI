"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, UploadCloud, File, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';


const BODY_PARTS = ['knee', 'back', 'neck', 'shoulder', 'hip', 'wrist', 'ankle', 'head', 'chest', 'abdomen', 'other'];
const DURATIONS = ['<1w', '1-4w', '1-6m', '6m-1y', '1y+'];

export function InquiryIntakePage({ setView }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const langCode = useLang();
  const inquiryId = searchParams.get('inquiryId');
  const token = searchParams.get('token');

  const [step2, setStep2] = useState({
    body_part: [],
    duration: '',
    severity: '',
    diagnosis_yesno: false,
    diagnosis_text: '',
    medication_yesno: false,
    medication_text: '',
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inquiryId || !token) {
      toast.error('Missing inquiryId or token.');
      router.push('/inquiry');
    }
  }, [inquiryId, token, router, toast]);

  const toggleBodyPart = (p) => {
    setStep2((s) => ({
      ...s,
      body_part: s.body_part.includes(p) ? s.body_part.filter((x) => x !== p) : [...s.body_part, p],
    }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFiles((prev) => [...prev, f]);
  };

  const handleSubmit = async () => {
    if (!inquiryId || !token) return;
    setSubmitting(true);
    try {
      let extraPaths = [];
      if (files.length) {
        for (const file of files) {
          const uploadForm = new FormData();
          uploadForm.append('file', file);
          const uploadRes = await fetch('/api/attachments/upload', {
            method: 'POST',
            body: uploadForm,
          });
          const uploadResult = await uploadRes.json();
          if (uploadResult.ok) extraPaths.push({ path: uploadResult.path, name: uploadResult.name, type: uploadResult.type || null });
        }
      }

      const intakePatch = {
        complaint: {
          body_part: step2.body_part.length ? step2.body_part : null,
          duration: step2.duration || null,
          severity: step2.severity ? Number(step2.severity) : null,
        },
        history: {
          diagnosis: { has: !!step2.diagnosis_yesno, text: step2.diagnosis_text || '' },
          meds: { has: !!step2.medication_yesno, text: step2.medication_text || '' },
        },
      };
      if (extraPaths.length) {
        intakePatch.attachments_extra = extraPaths;
      }

      const res = await fetch('/api/inquiries/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId: Number(inquiryId), publicToken: token, intakePatch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || 'Failed to save.');
        setSubmitting(false);
        return;
      }
      try { 
        sessionStorage.removeItem('inquiry_success'); 
      } catch (err) {
        console.warn("Failed to clear session storage:", err);
      }
      
      // ✅ Funnel 이벤트: Step2 저장 성공
      if (inquiryId != null) {
        fetch('/api/inquiries/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'step2_submitted', inquiryId: Number(inquiryId) }),
        }).catch(() => {});
      }
      
      setDone(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!inquiryId || !token) return null;

  if (done) {
    // 소프트 계정 유도 — 정보를 다 받은 '뒤'에, 진행상황 추적을 혜택으로 제안(강요/벽 아님).
    const SOFT = {
      title: {
        ko: "진행 상황을 받아보시겠어요?", en: "Want to follow your progress?",
        ru: "Хотите следить за ходом дела?", kz: "Барысын қадағалағыңыз келе ме?",
        zh: "想跟进您的进度吗？", ja: "進捗を受け取りますか？",
      },
      desc: {
        ko: "계정을 만들면 코디네이터 답변·상담 일정·치료 진행을 한 곳에서 볼 수 있어요. 지금 안 만드셔도 코디네이터가 연락드립니다.",
        en: "With an account you can see your coordinator's replies, schedule and treatment progress in one place. No account needed — your coordinator will reach out either way.",
        ru: "С аккаунтом вы увидите ответы координатора, расписание и ход лечения в одном месте. Можно и без него — координатор всё равно свяжется с вами.",
        kz: "Аккаунтпен координатордың жауаптарын, кестені және емдеу барысын бір жерден көресіз. Болмаса да — координатор бәрібір хабарласады.",
        zh: "注册后可在一处查看协调员回复、日程与治疗进度。也可不注册——协调员都会联系您。",
        ja: "アカウントがあれば、コーディネーターの返信・予定・治療の進捗を一か所で確認できます。なくても担当者からご連絡します。",
      },
      cta: {
        ko: "진행상황 받기 (계정 만들기)", en: "Follow progress (create account)",
        ru: "Следить (создать аккаунт)", kz: "Қадағалау (аккаунт ашу)",
        zh: "跟进（注册账号）", ja: "進捗を受け取る（登録）",
      },
      later: {
        ko: "괜찮아요, 코디네이터 연락 기다릴게요", en: "No thanks, I'll wait for the coordinator",
        ru: "Нет, подожду координатора", kz: "Жоқ, координаторды күтемін",
        zh: "不用了，等协调员联系", ja: "今はいいです",
      },
    };
    const L = (o) => o[langCode] || o.en;
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-lg font-bold text-teal-700 mb-6">{t('intake.saved', langCode)}</p>

        <div className="mb-6 rounded-2xl border border-teal-100 bg-teal-50/60 p-5 text-left">
          <p className="text-sm font-semibold text-gray-900 mb-1.5">{L(SOFT.title)}</p>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">{L(SOFT.desc)}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/signup')}
              className="w-full px-4 py-3 text-sm font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
            >
              {L(SOFT.cta)}
            </button>
            <button
              onClick={() => (setView?.('home') || router.push('/'))}
              className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-teal-700 transition"
            >
              {L(SOFT.later)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="flex items-center text-sm font-bold text-gray-500 mb-6 hover:text-teal-700">
        <ChevronLeft size={16}/> {t('intake.back', langCode)}
      </button>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{t('intake.title', langCode)}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('intake.subtitle', langCode)}</p>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{t('intake.bodyParts', langCode)}</label>
          <div className="flex flex-wrap gap-2">
            {BODY_PARTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggleBodyPart(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${step2.body_part.includes(p) ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="intake-duration" className="block text-xs font-bold text-gray-700 mb-1">{t('intake.duration', langCode)}</label>
          <select id="intake-duration" value={step2.duration} onChange={(e) => setStep2({ ...step2, duration: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm">
            <option value="">Select...</option>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="intake-severity" className="block text-xs font-bold text-gray-700 mb-1">{t('intake.severity', langCode)}</label>
          <input id="intake-severity" type="number" min={1} max={10} value={step2.severity} onChange={(e) => setStep2({ ...step2, severity: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm" placeholder="e.g. 7"/>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{t('intake.priorDiagnosis', langCode)}</label>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" checked={!!step2.diagnosis_yesno} onChange={(e) => setStep2({ ...step2, diagnosis_yesno: e.target.checked })} className="rounded accent-teal-600"/>
            <span className="text-sm">{t('intake.yes', langCode)}</span>
          </label>
          {step2.diagnosis_yesno && (
            <textarea value={step2.diagnosis_text} onChange={(e) => setStep2({ ...step2, diagnosis_text: e.target.value })} rows={2} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm" placeholder="e.g. MRI: meniscus tear"/>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{t('intake.currentMeds', langCode)}</label>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" checked={!!step2.medication_yesno} onChange={(e) => setStep2({ ...step2, medication_yesno: e.target.checked })} className="rounded accent-teal-600"/>
            <span className="text-sm">{t('intake.yes', langCode)}</span>
          </label>
          {step2.medication_yesno && (
            <textarea value={step2.medication_text} onChange={(e) => setStep2({ ...step2, medication_text: e.target.value })} rows={2} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm" placeholder="e.g. ibuprofen"/>
          )}
        </div>

        <div>
          <input type="file" id="step2file" className="hidden" onChange={handleFileChange}/>
          <div
            role="button"
            tabIndex={0}
            aria-label={t('intake.uploadMore', langCode)}
            onClick={() => document.getElementById('step2file')?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault();
                document.getElementById('step2file')?.click();
              }
            }}
            className="border border-dashed border-gray-300 rounded-xl p-3 text-center hover:bg-gray-50 cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <UploadCloud size={18} className="text-gray-400"/>
            <span className="text-xs text-gray-500">{t('intake.uploadMore', langCode)}</span>
          </div>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <File size={14}/><span className="truncate">{f.name}</span>
                  <button type="button" aria-label="Remove file" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-red-500"><X size={14}/></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="w-full bg-teal-700 text-white py-4 rounded-xl font-bold hover:bg-teal-800 disabled:opacity-50">
          {submitting ? t('intake.saving', langCode) : t('intake.save', langCode)}
        </button>
      </div>
    </div>
  );
}
