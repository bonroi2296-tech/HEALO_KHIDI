'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, AlertCircle, ChevronDown } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { kstDate } from '@/lib/datetime/kst';

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

  const handleUpload = async (file) => {
    if (!file) return;
    if (!selectedConsultId) {
      setMessage({ type: 'error', text: t('patientDocs.noConsult', lang) });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: `${t('patientDocs.error', lang)}: ${t('patientDocs.formats', lang)}` });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage({ type: 'error', text: `${t('patientDocs.error', lang)}: ${t('patientDocs.maxSize', lang)}` });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('consultationId', selectedConsultId);
      formData.append('documentType', docType);
      formData.append('description', description);

      const res = await fetch('/api/patient/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await res.json();
      if (result.ok) {
        setMessage({ type: 'success', text: t('patientDocs.success', lang) });
        setDescription('');
        fetchDocuments();
      } else {
        setMessage({ type: 'error', text: `${t('patientDocs.error', lang)}: ${result.error}` });
      }
    } catch (_e) {
      setMessage({ type: 'error', text: t('patientDocs.error', lang) });
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
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
          <AlertCircle size={36} className="text-amber-500 mx-auto mb-3" />
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
            <p className="text-xs text-gray-500">{t('patientDocs.formats', lang)} · {t('patientDocs.maxSize', lang)}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
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
            <div className="text-center py-3 text-teal-700 font-medium text-sm">
              {t('patientDocs.uploading', lang)}
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
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-sm text-teal-700 hover:text-teal-700 font-semibold whitespace-nowrap"
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
