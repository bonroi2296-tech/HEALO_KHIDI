'use client';

import { useState, useEffect, useRef } from 'react';
import { getLangCodeFromCookie } from '../../../src/lib/i18n';

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
  const [lang, setLang] = useState('en');
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('medical_record');
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  // This requires a consultationId - for now use query param or localStorage
  const [consultationId, setConsultationId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('consultationId');
    if (cid) {
      setConsultationId(cid);
      fetchDocuments(cid);
    }
  }, []);

  const fetchDocuments = async (cid) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/khidi/consultation/${cid}/documents`);
      const result = await res.json();
      if (result.ok) setDocuments(result.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleUpload = async (file) => {
    if (!file || !consultationId) return;

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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);
    formData.append('description', description);

    try {
      const res = await fetch(`/api/khidi/consultation/${consultationId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.ok) {
        setMessage({ type: 'success', text: l(LABELS.success) });
        setDescription('');
        fetchDocuments(consultationId);
      } else {
        setMessage({ type: 'error', text: `${l(LABELS.error)}: ${result.error}` });
      }
    } catch (e) {
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

  if (!consultationId) {
    return (
      <main style={{ maxWidth: 600, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{l(LABELS.title)}</h1>
        <p style={{ color: '#666' }}>consultationId parameter required.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }} aria-label={l(LABELS.title)}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{l(LABELS.title)}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{l(LABELS.subtitle)}</p>

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
        style={{
          border: `2px dashed ${dragOver ? '#2563eb' : '#ddd'}`,
          borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer',
          background: dragOver ? '#eff6ff' : '#fafafa', marginBottom: 16,
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{l(LABELS.dragDrop)}</p>
        <p style={{ fontSize: 13, color: '#888' }}>{l(LABELS.formats)} · {l(LABELS.maxSize)}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </div>

      {/* Options */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="doc-type" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{l(LABELS.docType)}</label>
          <select
            id="doc-type"
            value={docType}
            onChange={e => setDocType(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          >
            {DOC_TYPES.map(dt => (
              <option key={dt.value} value={dt.value}>{l(dt.label)}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label htmlFor="doc-desc" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{l(LABELS.description)}</label>
          <input
            id="doc-desc"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Blood test from March 2026"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </div>
      </div>

      {/* Status message */}
      {uploading && (
        <div style={{ textAlign: 'center', padding: 12, color: '#2563eb', fontWeight: 500 }}>
          {l(LABELS.uploading)}
        </div>
      )}
      {message && (
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 500,
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* Document List */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>{l(LABELS.myDocs)}</h2>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>{l(LABELS.loading)}</p>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#f9fafb', borderRadius: 12, color: '#888' }}>
          {l(LABELS.noFiles)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map(doc => (
            <div key={doc.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: '#fff', borderRadius: 8,
              border: '1px solid #eee',
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{doc.file_name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {l(DOC_TYPES.find(dt => dt.value === doc.document_type)?.label || DOC_TYPES[4].label)}
                  {' · '}
                  {formatFileSize(doc.file_size)}
                  {doc.description && ` · ${doc.description}`}
                </div>
              </div>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
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
