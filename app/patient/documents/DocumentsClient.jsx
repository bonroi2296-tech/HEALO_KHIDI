'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, AlertCircle, ChevronDown } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const LABELS = {
  title: { ko: '의료 문서 관리', en: 'Medical Documents', ru: 'Медицинские документы', zh: '医疗文档', ja: '医療書類', kz: 'Медициналық құжаттар' },
  subtitle: { ko: '진단서, 검사 결과 등을 업로드하세요', en: 'Upload medical records, test results, and more', ru: 'Загрузите медицинские записи, результаты анализов и др.', zh: '上传病历、检查结果等', ja: '診断書や検査結果をアップロード', kz: 'Медициналық жазбаларды жүктеңіз' },
  upload: { ko: '파일 업로드', en: 'Upload File', ru: 'Загрузить файл', zh: '上传文件', ja: 'ファイルをアップロード', kz: 'Файл жүктеу' },
  dragDrop: { ko: '여기에 파일을 드래그하거나 클릭하세요', en: 'Drag files here or click to browse', ru: 'Перетащите файлы сюда или нажмите для выбора', zh: '将文件拖到此处或点击浏览', ja: 'ファイルをここにドラッグまたはクリック', kz: 'Файлдарды осында сүйреңіз немесе басыңыз' },
  docType: { ko: '문서 유형', en: 'Document Type', ru: 'Тип документа', zh: '文档类型', ja: '書類タイプ', kz: 'Құжат түрі' },
  description: { ko: '설명 (선택)', en: 'Description (optional)', ru: 'Описание (необязательно)', zh: '描述（可选）', ja: '説明（任意）', kz: 'Сипаттама (міндетті емес)' },
  uploading: { ko: '업로드 중...', en: 'Uploading...', ru: 'Загрузка...', zh: '上传中...', ja: 'アップロード中...', kz: 'Жүктелуде...' },
  success: { ko: '업로드 완료!', en: 'Upload complete!', ru: 'Загрузка завершена!', zh: '上传完成！', ja: 'アップロード完了！', kz: 'Жүктеу аяқталды!' },
  error: { ko: '업로드 실패', en: 'Upload failed', ru: 'Ошибка загрузки', zh: '上传失败', ja: 'アップロード失敗', kz: 'Жүктеу сәтсіз' },
  noFiles: { ko: '업로드된 파일이 없습니다', en: 'No files uploaded yet', ru: 'Файлы ещё не загружены', zh: '尚未上传文件', ja: 'ファイルはまだありません', kz: 'Файлдар жүктелмеген' },
  maxSize: { ko: '최대 20MB', en: 'Max 20MB', ru: 'Макс. 20МБ', zh: '最大20MB', ja: '最大20MB', kz: 'Макс. 20МБ' },
  formats: { ko: 'PDF, JPEG, PNG, WebP', en: 'PDF, JPEG, PNG, WebP', ru: 'PDF, JPEG, PNG, WebP', zh: 'PDF, JPEG, PNG, WebP', ja: 'PDF, JPEG, PNG, WebP', kz: 'PDF, JPEG, PNG, WebP' },
  myDocs: { ko: '내 문서', en: 'My Documents', ru: 'Мои документы', zh: '我的文档', ja: 'マイ書類', kz: 'Менің құжаттарым' },
  loading: { ko: '로딩 중...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...', ja: '読み込み中...', kz: 'Жүктелуде...' },
  selectConsult: { ko: '연결할 상담', en: 'Linked consultation', ru: 'Связанная консультация', zh: '关联咨询', ja: '関連相談', kz: 'Байланысты кеңес' },
  noConsult: { ko: '먼저 사전상담을 신청하세요', en: 'Please request a pre-consultation first', ru: 'Сначала запросите консультацию', zh: '请先申请预咨询', ja: 'まず事前相談を申請してください', kz: 'Алдымен кеңес сұраңыз' },
  noConsultDesc: { ko: '의료 문서는 상담과 연결되어 저장됩니다.', en: 'Medical documents are linked to a consultation.', ru: 'Документы привязываются к консультации.', zh: '医疗文档与咨询关联。', ja: '書類は相談と紐付きます。', kz: 'Құжаттар кеңеспен байланысады.' },
  requestConsult: { ko: '사전상담 신청', en: 'Request Consultation', ru: 'Запросить консультацию', zh: '申请咨询', ja: '相談を申請', kz: 'Кеңес сұрау' },
  loginRequired: { ko: '로그인이 필요합니다', en: 'Login required', ru: 'Требуется вход', zh: '需要登录', ja: 'ログインが必要です', kz: 'Кіру қажет' },
};

const DOC_TYPES = [
  { value: 'medical_record', label: { ko: '진단서', en: 'Medical Record', ru: 'Медицинская запись', zh: '病历', ja: '診断書', kz: 'Медициналық жазба' } },
  { value: 'test_result', label: { ko: '검사 결과', en: 'Test Result', ru: 'Результат анализа', zh: '检查结果', ja: '検査結果', kz: 'Талдау нәтижесі' } },
  { value: 'imaging', label: { ko: '영상 (CT/MRI)', en: 'Imaging (CT/MRI)', ru: 'Снимки (КТ/МРТ)', zh: '影像(CT/MRI)', ja: '画像(CT/MRI)', kz: 'Бейнелер (КТ/МРТ)' } },
  { value: 'prescription', label: { ko: '처방전', en: 'Prescription', ru: 'Рецепт', zh: '处方', ja: '処方箋', kz: 'Рецепт' } },
  { value: 'other', label: { ko: '기타', en: 'Other', ru: 'Другое', zh: '其他', ja: 'その他', kz: 'Басқа' } },
];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsClient() {
  const router = useRouter();
  const lang = useLang();
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

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
      setMessage({ type: 'error', text: l(LABELS.noConsult) });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: `${l(LABELS.error)}: ${l(LABELS.formats)}` });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage({ type: 'error', text: `${l(LABELS.error)}: ${l(LABELS.maxSize)}` });
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
        setMessage({ type: 'success', text: l(LABELS.success) });
        setDescription('');
        fetchDocuments();
      } else {
        setMessage({ type: 'error', text: `${l(LABELS.error)}: ${result.error}` });
      }
    } catch (_e) {
      setMessage({ type: 'error', text: l(LABELS.error) });
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
        <h1 className="text-2xl font-bold mb-4">{l(LABELS.title)}</h1>
        <p className="text-gray-500 mb-6">{l(LABELS.loginRequired)}</p>
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
    <main className="max-w-3xl mx-auto px-4 py-6" aria-label={l(LABELS.title)}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{l(LABELS.title)}</h1>
        <p className="text-gray-500 text-sm mt-1">{l(LABELS.subtitle)}</p>
      </div>

      {/* No consultation yet */}
      {consultations.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center">
          <AlertCircle size={36} className="text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-amber-900 mb-1">{l(LABELS.noConsult)}</p>
          <p className="text-sm text-amber-700 mb-4">{l(LABELS.noConsultDesc)}</p>
          <button
            onClick={() => router.push('/inquiry')}
            className="bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800 transition text-sm"
          >
            {l(LABELS.requestConsult)}
          </button>
        </div>
      ) : (
        <>
          {/* Consultation picker */}
          <div className="mb-4">
            <label htmlFor="consult-picker" className="block text-xs font-semibold text-gray-700 mb-1.5">
              {l(LABELS.selectConsult)}
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
                    {c.session_type === 'pre_consultation' ? '사전상담' :
                     c.session_type === 'follow_up' ? '추후진료' :
                     c.session_type === 'emergency' ? '긴급상담' : c.session_type || 'Consultation'}
                    {' · '}
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '-'}
                    {' · '}
                    {c.status}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Upload Area */}
          <div
            role="button"
            tabIndex={0}
            aria-label={l(LABELS.dragDrop)}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-4 ${
              dragOver ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <Upload size={36} className="text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">{l(LABELS.dragDrop)}</p>
            <p className="text-xs text-gray-500">{l(LABELS.formats)} · {l(LABELS.maxSize)}</p>
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
              <label htmlFor="doc-type" className="block text-xs font-semibold text-gray-700 mb-1.5">{l(LABELS.docType)}</label>
              <select
                id="doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{l(dt.label)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="doc-desc" className="block text-xs font-semibold text-gray-700 mb-1.5">{l(LABELS.description)}</label>
              <input
                id="doc-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Blood test from March 2026"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
          </div>

          {uploading && (
            <div className="text-center py-3 text-teal-700 font-medium text-sm">
              {l(LABELS.uploading)}
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
      <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">{l(LABELS.myDocs)}</h2>

      {documents.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-500 text-sm">
          <FileText size={32} className="text-gray-300 mx-auto mb-2" />
          {l(LABELS.noFiles)}
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
                  {l(DOC_TYPES.find((dt) => dt.value === doc.document_type)?.label || DOC_TYPES[4].label)}
                  {' · '}
                  {formatFileSize(doc.file_size)}
                  {doc.description && ` · ${doc.description}`}
                </div>
                {doc.consultation && (
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {doc.consultation.session_type === 'pre_consultation' ? '사전상담' :
                     doc.consultation.session_type === 'follow_up' ? '추후진료' :
                     doc.consultation.session_type || 'Consultation'}
                    {doc.consultation.scheduled_at && ` · ${new Date(doc.consultation.scheduled_at).toLocaleDateString()}`}
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
