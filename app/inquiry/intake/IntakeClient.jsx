"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, UploadCloud, File, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { uploadAttachment } from '@/lib/uploadAttachment';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';

// 암 컨시어지용 Step2 인테이크 — 코디가 병원 매칭·일정 준비에 필요한 정보.
// (구 일반 통증클리닉 폼: 무릎/어깨/심각도 → 암환자에 부적합이라 전면 교체.)
// 표시 문자열은 중앙 i18n 사전(intakeForm.*)에서 t()로 렌더 — key/v 값은 API 페이로드라 인라인 유지.
// (구 인라인 6언어 사전은 src/lib/i18n 로 이동. 제출 값은 이전과 byte 동일.)
const SINGLE_FIELDS = [
  {
    key: 'diagnosis_timing',
    labelKey: 'intakeForm.fields.diagnosisTiming.label',
    options: [
      { v: 'lt1m', labelKey: 'intakeForm.fields.diagnosisTiming.options.lt1m' },
      { v: '1to6m', labelKey: 'intakeForm.fields.diagnosisTiming.options.1to6m' },
      { v: '6mto1y', labelKey: 'intakeForm.fields.diagnosisTiming.options.6mto1y' },
      { v: 'gt1y', labelKey: 'intakeForm.fields.diagnosisTiming.options.gt1y' },
      { v: 'unknown', labelKey: 'intakeForm.fields.diagnosisTiming.options.unknown' },
    ],
  },
  {
    key: 'stage',
    labelKey: 'intakeForm.fields.stage.label',
    options: [
      { v: '1', labelKey: 'intakeForm.fields.stage.options.1' },
      { v: '2', labelKey: 'intakeForm.fields.stage.options.2' },
      { v: '3', labelKey: 'intakeForm.fields.stage.options.3' },
      { v: '4', labelKey: 'intakeForm.fields.stage.options.4' },
      { v: 'unknown', labelKey: 'intakeForm.fields.stage.options.unknown' },
    ],
  },
  {
    key: 'current_status',
    labelKey: 'intakeForm.fields.currentStatus.label',
    options: [
      { v: 'diagnosed', labelKey: 'intakeForm.fields.currentStatus.options.diagnosed' },
      { v: 'surgery_done', labelKey: 'intakeForm.fields.currentStatus.options.surgery_done' },
      { v: 'chemo', labelKey: 'intakeForm.fields.currentStatus.options.chemo' },
      { v: 'radiation', labelKey: 'intakeForm.fields.currentStatus.options.radiation' },
      { v: 'completed', labelKey: 'intakeForm.fields.currentStatus.options.completed' },
      { v: 'recurrence', labelKey: 'intakeForm.fields.currentStatus.options.recurrence' },
    ],
  },
  {
    key: 'entry_timing',
    labelKey: 'intakeForm.fields.entryTiming.label',
    options: [
      { v: 'lt1m', labelKey: 'intakeForm.fields.entryTiming.options.lt1m' },
      { v: '1to3m', labelKey: 'intakeForm.fields.entryTiming.options.1to3m' },
      { v: 'gt3m', labelKey: 'intakeForm.fields.entryTiming.options.gt3m' },
      { v: 'undecided', labelKey: 'intakeForm.fields.entryTiming.options.undecided' },
    ],
  },
];

const TREATMENTS = [
  { v: 'surgery', labelKey: 'intakeForm.treatments.surgery' },
  { v: 'chemo', labelKey: 'intakeForm.treatments.chemo' },
  { v: 'radiation', labelKey: 'intakeForm.treatments.radiation' },
  { v: 'immuno', labelKey: 'intakeForm.treatments.immuno' },
  { v: 'oriental', labelKey: 'intakeForm.treatments.oriental' },
  { v: 'none', labelKey: 'intakeForm.treatments.none' },
];

const DOCUMENTS = [
  { v: 'pathology', labelKey: 'intakeForm.documents.pathology' },
  { v: 'imaging', labelKey: 'intakeForm.documents.imaging' },
  { v: 'records', labelKey: 'intakeForm.documents.records' },
];

export function InquiryIntakePage({ setView }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const langCode = useLang();
  const inquiryId = searchParams.get('inquiryId');
  const token = searchParams.get('token');

  const [form, setForm] = useState({
    diagnosis_timing: '',
    stage: '',
    current_status: '',
    entry_timing: '',
    treatments_received: [],
    documents: [],
    notes: '',
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // 못 올라간 첨부 — 완료 화면에서 크게 알린다(토스트로 흘리면 서류가 조용히 사라진다).
  const [failedUploads, setFailedUploads] = useState([]);

  useEffect(() => {
    if (!inquiryId || !token) {
      // 환자용 화면 — 영어 고정 문구였다(2026-09-06). 깨진·만료된 링크로 온 사람이 보는 첫 문장이다.
      toast.error(t('intake.linkInvalid', langCode));
      router.push('/inquiry');
    }
  }, [inquiryId, token, router, toast]);

  const toggleIn = (key, v) => {
    setForm((s) => ({
      ...s,
      [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v],
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
      // ⚠️ 실패한 첨부를 «토스트 한 번»으로 흘리면, 환자는 다 넘어간 줄 알고 접수를 끝내고
      //    코디는 그 서류를 영영 못 받는다(2026-08-14 감사: 의료 서류 손실).
      //    PO 결정(2026-08-15): 접수는 받되 «크게» 경고 + 코디에게도 알린다.
      let extraPaths = [];
      const failedFiles = [];
      if (files.length) {
        for (const file of files) {
          const uploadResult = await uploadAttachment(file);
          if (uploadResult.ok) extraPaths.push({ path: uploadResult.path, name: uploadResult.name, type: uploadResult.type || null });
          else {
            failedFiles.push({ name: file.name, reason: uploadResult.error || 'upload_failed' });
            toast.error(t(uploadResult.error === 'file_too_large' ? 'chat.upload.tooLarge' : 'chat.upload.failed', langCode));
          }
        }
      }

      const intakePatch = {
        cancer: {
          diagnosis_timing: form.diagnosis_timing || null,
          stage: form.stage || null,
          current_status: form.current_status || null,
          entry_timing: form.entry_timing || null,
          treatments_received: form.treatments_received.length ? form.treatments_received : null,
          documents: form.documents.length ? form.documents : null,
        },
        notes: form.notes || null,
      };
      if (extraPaths.length) intakePatch.attachments_extra = extraPaths;
      // 코디가 「서류가 왜 없지」를 몰라 헤매지 않게, 못 올라간 파일 목록을 문의에 같이 남긴다.
      if (failedFiles.length) intakePatch.attachments_failed = failedFiles;

      const res = await fetch('/api/inquiries/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId: Number(inquiryId), publicToken: token, intakePatch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 서버 오류 코드(internal_error 등)를 환자에게 그대로 보이지 않는다 — 콘솔에만.
        if (json?.error) console.warn('[intake] save failed:', json.error);
        toast.error(t('intake.saveFailed', langCode));
        setSubmitting(false);
        return;
      }
      try { sessionStorage.removeItem('inquiry_success'); } catch (err) { console.warn('clear ss:', err); }

      if (inquiryId != null) {
        fetch('/api/inquiries/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'step2_submitted', inquiryId: Number(inquiryId) }),
        }).catch(() => {});
      }
      setFailedUploads(failedFiles);
      setDone(true);
    } catch (e) {
      console.error(e);
      toast.error(t('intake.saveFailed', langCode));
    } finally {
      setSubmitting(false);
    }
  };

  if (!inquiryId || !token) return null;

  if (done) {
    // 소프트 계정 유도 — 정보를 다 받은 '뒤'에, 진행상황 추적을 혜택으로 제안(강요/벽 아님).
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-lg font-bold text-teal-700 mb-6">{t('intake.saved', langCode)}</p>

        {/* 못 올라간 첨부가 있으면 «크게» 알린다 — 토스트로 흘리면 환자는 다 넘어간 줄 알고
            코디는 그 서류를 영영 못 받는다(PO 결정 2026-08-15: 접수는 받되 크게 경고). */}
        {failedUploads.length > 0 && (
          <div role="alert" className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-left">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-900">{t('intake.attachFailed.title', langCode)}</p>
                <p className="text-xs text-amber-800 leading-relaxed mt-1">{t('intake.attachFailed.desc', langCode)}</p>
                <ul className="mt-2.5 space-y-1">
                  {failedUploads.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="text-xs font-semibold text-amber-900 break-all">• {f.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-teal-100 bg-teal-50/60 p-5 text-left">
          <p className="text-sm font-semibold text-gray-900 mb-1.5">{t('intakeForm.soft.title', langCode)}</p>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">{t('intakeForm.soft.desc', langCode)}</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => router.push('/signup')} className="w-full px-4 py-3 text-sm font-bold bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition">{t('intakeForm.soft.cta', langCode)}</button>
            <button onClick={() => (setView?.('home') || router.push('/'))} className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-teal-700 transition">{t('intakeForm.soft.later', langCode)}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="flex items-center text-sm font-bold text-gray-500 mb-6 hover:text-teal-700">
        <ChevronLeft size={16} /> {t('intake.back', langCode)}
      </button>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{t('intake.title', langCode)}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('intake.subtitle', langCode)}</p>

      <div className="space-y-6">
        {/* 단일 선택 필드들 (진단시기·병기·현재상태·입국시기) */}
        {SINGLE_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`fld-${f.key}`} className="block text-xs font-bold text-gray-700 mb-1">{t(f.labelKey, langCode)}</label>
            <select
              id={`fld-${f.key}`}
              value={form[f.key]}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white"
            >
              <option value="">{t('intakeForm.selectPh', langCode)}</option>
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>{t(o.labelKey, langCode)}</option>
              ))}
            </select>
          </div>
        ))}

        {/* 이미 받은 치료 (복수) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{t('intakeForm.treatmentsTitle', langCode)}</label>
          <div className="flex flex-wrap gap-2">
            {TREATMENTS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => toggleIn('treatments_received', o.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${form.treatments_received.includes(o.v) ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {t(o.labelKey, langCode)}
              </button>
            ))}
          </div>
        </div>

        {/* 보유 서류 (복수) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{t('intakeForm.documentsTitle', langCode)}</label>
          <div className="flex flex-wrap gap-2">
            {DOCUMENTS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => toggleIn('documents', o.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${form.documents.includes(o.v) ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {t(o.labelKey, langCode)}
              </button>
            ))}
          </div>
        </div>

        {/* 추가 메모 */}
        <div>
          <label htmlFor="intake-notes" className="block text-xs font-bold text-gray-700 mb-1">{t('intakeForm.notesTitle', langCode)}</label>
          <textarea
            id="intake-notes"
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            rows={3}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm"
            placeholder={t('intakeForm.notesPh', langCode)}
          />
        </div>

        {/* 파일 업로드 (의료 서류) */}
        <div>
          <label htmlFor="intake-file" className="flex items-center justify-center gap-2 w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 cursor-pointer hover:border-teal-400">
            <UploadCloud size={18} /> {t('intakeForm.upload', langCode)}
          </label>
          <input id="intake-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-1.5 text-gray-700 truncate"><File size={13} /> {f.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-teal-700 text-white py-4 rounded-2xl font-bold text-base hover:bg-teal-800 transition disabled:bg-gray-400"
        >
          {submitting ? '...' : t('intakeForm.save', langCode)}
        </button>
      </div>
    </div>
  );
}
