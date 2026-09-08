'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, AlertCircle, ChevronDown, Trash2 } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { uploadDirect } from '@/lib/uploadAttachment';
import { describeUpload, checkFile, UPLOAD_POLICY } from '@/lib/uploadPolicy';
import { kstDate } from '@/lib/datetime/kst';

// ponytail: 한 묶음 10개 — 서버 uploadLimiter 가 5분에 20회(파일당 sign+commit 2회)라 그 이상은 어차피 막힌다.
// 더 받고 싶으면 rateLimiter.ts 의 uploadLimiter 부터 올리고 여기와 사전(patientDocs.tooMany)의 10을 같이 바꾼다.
const MAX_BATCH = 10;

// DB document_type 코드 → 표시 라벨 키(중앙 사전)
const DOC_TYPES = [
  { value: 'medical_record', label: 'patientDocs.docTypes.medicalRecord' },
  { value: 'test_result', label: 'patientDocs.docTypes.testResult' },
  { value: 'imaging', label: 'patientDocs.docTypes.imaging' },
  { value: 'prescription', label: 'patientDocs.docTypes.prescription' },
  { value: 'other', label: 'patientDocs.docTypes.other' },
];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 상담 유형(DB session_type 코드) → 표시 라벨 키(중앙 사전, 6개 활성언어 ko·en·ru·kz·zh·ja)
const SESSION_LABELS = {
  pre_consultation: 'patientDocs.session.preConsultation',
  follow_up: 'patientDocs.session.followUp',
  emergency: 'patientDocs.session.emergency',
  consultation: 'patientDocs.session.consultation',
};

export default function DocumentsClient() {
  const router = useRouter();
  const lang = useLang();
  const sessionLabel = (type) => t(SESSION_LABELS[type] || SESSION_LABELS.consultation, lang);

  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [selectedConsultId, setSelectedConsultId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batch, setBatch] = useState({ index: 0, total: 0, name: '' }); // 지금 올리는 파일이 몇 번째인지
  const [waitSec, setWaitSec] = useState(0); // 분당 상한에 걸려 기다리는 중이면 남은 초
  const [docType, setDocType] = useState('medical_record');
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthed(false);
        setAuthChecked(true);
        setLoading(false);
        return;
      }
      setAuthed(true);

      const res = await fetch('/api/patient/documents', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (result.ok) {
        setDocuments(result.data || []);
        setConsultations(result.consultations || []);
        if (result.consultations?.length && !selectedConsultId) {
          setSelectedConsultId(result.consultations[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setAuthChecked(true);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  // Allow ?consultationId= override
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('consultationId');
    if (cid) setSelectedConsultId(cid);
  }, []);

  // 실패 사유 코드 → 사람이 읽을 문구. 형식·내용 문제는 「뭘 올릴 수 있는지」를 그대로 보여준다
  // (예전엔 사전에 박힌 「PDF, JPEG, PNG, WebP」를 보여줘서 안내 문구와 어긋났다).
  const reasonText = (code) => {
    if (code === 'file_too_large') return t('patientDocs.maxSize', lang);
    if (code === 'invalid_file_type' || code === 'invalid_file_content') return describeUpload('medicalDoc', lang);
    return t('patientDocs.error', lang);
  };

  // 여러 파일을 한 번에 — 하나씩 차례로 올리고(서버 상한이 5분 20회) 끝나면 한 번에 결과를 알린다.
  const handleUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (!selectedConsultId) {
      setMessage({ type: 'error', text: t('patientDocs.noConsult', lang) });
      return;
    }

    setUploading(true);
    setMessage(null);
    const queue = files.slice(0, MAX_BATCH);
    const failed = [];
    let done = 0;

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const authFetch = (url, init) =>
        fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session.access_token}` } });

      for (const [i, file] of queue.entries()) {
        setBatch({ index: i + 1, total: queue.length, name: file.name });
        setProgress(0);
        // 화면 검사는 정책 파일(uploadPolicy)이 기준 — 확장자 없는 DICOM 은 형식이 빈 값이라 서버가 내용으로 판정한다.
        const pre = checkFile('medicalDoc', file);
        if (!pre.ok) { failed.push(`${file.name}: ${reasonText(pre.error)}`); continue; }
        try {
          const result = await uploadDirect(
            '/api/patient/documents',
            file,
            { consultationId: selectedConsultId, documentType: docType, description },
            { fetch: authFetch, onProgress: setProgress, onWait: setWaitSec }
          );
          if (result.ok) done++;
          else failed.push(`${file.name}: ${reasonText(result.error)}`);
        } catch (_e) {
          failed.push(`${file.name}: ${t('patientDocs.error', lang)}`);
        }
      }
    } catch (_e) {
      failed.push(t('patientDocs.error', lang));
    }

    const overflow = files.length > MAX_BATCH ? ` · ${t('patientDocs.tooMany', lang)}` : '';
    if (failed.length === 0) {
      setMessage({ type: 'success', text: `${t('patientDocs.success', lang)}${done > 1 ? ` (${done})` : ''}${overflow}` });
    } else {
      setMessage({ type: 'error', text: `${t('patientDocs.error', lang)} (${failed.length}/${queue.length}): ${failed.join(' · ')}${overflow}` });
    }
    if (done > 0) {
      setDescription('');
      fetchDocuments();
    }
    setUploading(false);
    setProgress(0);
    setWaitSec(0);
    setBatch({ index: 0, total: 0, name: '' });
  };

  const [deletingId, setDeletingId] = useState(null);
  const handleDelete = async (doc) => {
    if (!window.confirm(`${t('patientDocs.deleteConfirm', lang)}\n${doc.file_name}`)) return;
    setDeletingId(doc.id);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/patient/documents?id=${encodeURIComponent(doc.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const result = await res.json().catch(() => ({ ok: false }));
      if (result.ok) {
        // 서버 답을 기다렸다가 목록에서 빼기 — 재조회(스피너)로 화면 전체를 깜빡이지 않게
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      } else {
        setMessage({ type: 'error', text: t('patientDocs.deleteFailed', lang) });
      }
    } catch (_e) {
      setMessage({ type: 'error', text: t('patientDocs.deleteFailed', lang) });
    }
    setDeletingId(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleFileSelect = (e) => {
    handleUpload(e.target.files);
    e.target.value = ''; // 같은 파일을 다시 골라도 onChange 가 뜨게
  };

  if (!authChecked || loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full" />
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('patientDocs.title', lang)}</h1>
        <p className="text-gray-500 mb-6">{t('patientDocs.loginRequired', lang)}</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800 transition"
        >
          Login
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6" aria-label={t('patientDocs.title', lang)}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('patientDocs.title', lang)}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('patientDocs.subtitle', lang)}</p>
      </div>

      {/* No consultation yet */}
      {consultations.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center">
          <AlertCircle size={36} className="text-amber-700 mx-auto mb-3" />
          <p className="font-semibold text-amber-900 mb-1">{t('patientDocs.noConsult', lang)}</p>
          <p className="text-sm text-amber-700 mb-4">{t('patientDocs.noConsultDesc', lang)}</p>
          <button
            onClick={() => router.push('/inquiry')}
            className="bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800 transition text-sm"
          >
            {t('patientDocs.requestConsult', lang)}
          </button>
        </div>
      ) : (
        <>
          {/* Consultation picker */}
          <div className="mb-4">
            <label htmlFor="consult-picker" className="block text-xs font-semibold text-gray-700 mb-1.5">
              {t('patientDocs.selectConsult', lang)}
            </label>
            <div className="relative">
              <select
                id="consult-picker"
                value={selectedConsultId}
                onChange={(e) => setSelectedConsultId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              >
                {consultations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {sessionLabel(c.session_type)}
                    {' · '}
                    {c.scheduled_at ? kstDate(c.scheduled_at) : '-'}
                    {' · '}
                    {c.status}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Upload Area */}
          <div
            role="button"
            tabIndex={0}
            aria-label={t('patientDocs.dragDrop', lang)}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-4 ${
              dragOver ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <Upload size={36} className="text-gray-500 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">{t('patientDocs.dragDrop', lang)}</p>
            <p className="text-xs text-gray-500">{describeUpload('medicalDoc', lang)}</p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={UPLOAD_POLICY.medicalDoc.accept}
              onChange={handleFileSelect}
              className="hidden"
              aria-hidden="true"
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-1">
              <label htmlFor="doc-type" className="block text-xs font-semibold text-gray-700 mb-1.5">{t('patientDocs.docType', lang)}</label>
              <select
                id="doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{t(dt.label, lang)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="doc-desc" className="block text-xs font-semibold text-gray-700 mb-1.5">{t('patientDocs.description', lang)}</label>
              <input
                id="doc-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('patientDocs.descPlaceholder', lang)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
          </div>

          {uploading && (
            <div className="py-3">
              <div className="text-center text-teal-700 font-medium text-sm mb-2">
                {t('patientDocs.uploading', lang)}
                {batch.total > 1 && ` ${batch.index}/${batch.total}`}
                {' · '}
                <span className="text-gray-600 font-normal truncate inline-block max-w-[60%] align-bottom">{batch.name}</span>
                {' · '}
                {/* 상한에 걸려 기다리는 중이면 그렇게 말한다 — 안 그러면 멈춘 줄 알고 창을 닫는다 */}
                {waitSec > 0 ? `${t('patientDocs.tooMany', lang)} (${waitSec}s)` : `${Math.round(progress * 100)}%`}
              </div>
              {/* 큰 파일은 몇 분 걸린다 — 막대가 없으면 멈춘 줄 알고 나간다. */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-700 rounded-full transition-[width] duration-200"
                  style={{ width: `${Math.max(2, progress * 100)}%` }}
                />
              </div>
            </div>
          )}
          {message && (
            <div className={`p-3 rounded-xl mb-4 text-sm font-medium border ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </>
      )}

      {/* Document List */}
      <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">{t('patientDocs.myDocs', lang)}</h2>

      {documents.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-500 text-sm">
          <FileText size={32} className="text-gray-300 mx-auto mb-2" />
          {t('patientDocs.noFiles', lang)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-900 truncate">{doc.file_name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t(DOC_TYPES.find((dt) => dt.value === doc.document_type)?.label || DOC_TYPES[4].label, lang)}
                  {' · '}
                  {formatFileSize(doc.file_size)}
                  {doc.description && ` · ${doc.description}`}
                </div>
                {doc.consultation && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {sessionLabel(doc.consultation.session_type)}
                    {doc.consultation.scheduled_at && ` · ${kstDate(doc.consultation.scheduled_at)}`}
                  </div>
                )}
              </div>
              <div className="ml-3 flex items-center gap-1 shrink-0">
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1.5 text-sm text-teal-700 hover:text-teal-800 font-semibold whitespace-nowrap"
                  >
                    {t('patientDocs.view', lang)}
                  </a>
                )}
                {/* 코디·의사가 상담방에 공유한 자료는 환자가 못 지운다(can_delete=false) — 버튼 자체를 안 그린다 */}
                {doc.can_delete !== false && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    aria-label={`${t('patientDocs.delete', lang)}: ${doc.file_name}`}
                    title={t('patientDocs.delete', lang)}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
