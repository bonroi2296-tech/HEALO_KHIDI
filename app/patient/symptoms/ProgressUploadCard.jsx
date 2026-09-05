'use client';

/**
 * 환자 본인 «검사결과·경과» 올리기 (공고 ICT ④ — 검사결과·영상정보 전송·수집·저장)
 *
 * 왜 (2026-08-25): 경과를 올릴 창구가 해외 의료기관 포털에만 있었다. 환자가 올린 서류는
 * 일반 서류함으로 가서 «경과기록»으로는 안 쌓였고, 코디 화면·타임라인에도 안 붙었다.
 * 여기서 올리면 /api/portal/progress → progress_records(uploader_role='patient') 에 쌓이고
 * 코디 케이스 화면의 「사후관리 경과」 칸에 그대로 뜬다.
 *
 * 파일은 브라우저 → Storage 직행(uploadDirect) — 서버 경유하면 4.5MB 에서 끊긴다.
 * 자체 완결형: 부모는 <ProgressUploadCard /> 한 줄만 넣는다.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/lib/i18n/LangContext';
import { t, dateLocale } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { uploadDirect } from '@/lib/uploadAttachment';
import { Upload, Paperclip, Loader2, CheckCircle, FileText } from 'lucide-react';

const TYPES = ['test_result', 'imaging', 'clinical_note', 'progress'];

async function authFetch(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

export default function ProgressUploadCard() {
  const lang = useLang();
  const [recordType, setRecordType] = useState('test_result');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/portal/progress');
      const d = await res.json();
      if (d.ok) setItems(d.records || []);
    } catch { /* 없으면 빈 목록 */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    setErr('');
    setDone(false);
    if (!file && note.trim().length < 2) {
      setErr(t('patientProgress.needSomething', lang));
      return;
    }
    setBusy(true);
    try {
      let res;
      if (file) {
        // 1) 서명 2) Storage 직행 3) 서버가 실물 검사 후 저장 — 한 번에 처리하는 공용 헬퍼.
        res = await uploadDirect('/api/portal/progress', file, { recordType, note }, { fetch: authFetch });
      } else {
        res = await (await authFetch('/api/portal/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordType, note }),
        })).json();
      }
      if (!res?.ok) {
        setErr(res?.error === 'no_case'
          ? t('patientProgress.errorNoCase', lang)
          : t('patientProgress.errorGeneric', lang));
        return;
      }
      setDone(true);
      setNote('');
      setFile(null);
      await load();
    } catch {
      setErr(t('patientProgress.errorGeneric', lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
        <Upload size={18} className="text-teal-700" />
        {t('patientProgress.title', lang)}
      </h2>
      <p className="text-sm text-gray-500 mb-4">{t('patientProgress.subtitle', lang)}</p>

      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {t('patientProgress.typeLabel', lang)}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TYPES.map((tp) => (
          <button
            key={tp}
            type="button"
            onClick={() => setRecordType(tp)}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              recordType === tp
                ? 'bg-teal-700 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
            }`}
          >
            {t(`patientProgress.type.${tp}`, lang)}
          </button>
        ))}
      </div>

      <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="progress-note">
        {t('patientProgress.note', lang)}
      </label>
      <textarea
        id="progress-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t('patientProgress.notePlaceholder', lang)}
        className="w-full rounded-xl border border-gray-200 p-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      <div className="flex flex-wrap items-center gap-3 mb-1">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 cursor-pointer hover:border-teal-400">
          <Paperclip size={15} />
          {file ? file.name : t('patientProgress.chooseFile', lang)}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.dcm,application/pdf,image/*,application/dicom"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 disabled:opacity-40 inline-flex items-center gap-2"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {busy ? t('patientProgress.uploading', lang) : t('patientProgress.submit', lang)}
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">{t('patientProgress.allowed', lang)}</p>

      {done && (
        <p className="flex items-center gap-1.5 text-sm text-teal-700 mb-2">
          <CheckCircle size={15} /> {t('patientProgress.saved', lang)}
        </p>
      )}
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}

      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="text-xs font-semibold text-gray-600 mb-2">{t('patientProgress.history', lang)}</div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{t('patientProgress.empty', lang)}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm text-gray-700">
                <FileText size={15} className="text-gray-500 mt-0.5 shrink-0" />
                <span className="flex-1">
                  <span className="font-medium">{t(`patientProgress.type.${r.record_type}`, lang)}</span>
                  {r.file_name ? ` · ${r.file_name}` : ''}
                  {r.note ? <span className="block text-gray-500">{r.note}</span> : null}
                </span>
                <span className="text-xs text-gray-500 shrink-0">
                  {new Date(r.created_at).toLocaleDateString(dateLocale(lang))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
