'use client';

import { useState, useEffect } from 'react';
import { getLangCodeFromCookie } from '../../../src/lib/i18n';

const NATIONALITIES = [
  { value: 'ru', label: { ko: '러시아', en: 'Russia', ru: 'Россия', zh: '俄罗斯', ja: 'ロシア', kz: 'Ресей' } },
  { value: 'kz', label: { ko: '카자흐스탄', en: 'Kazakhstan', ru: 'Казахстан', zh: '哈萨克斯坦', ja: 'カザフスタン', kz: 'Қазақстан' } },
  { value: 'mn', label: { ko: '몽골', en: 'Mongolia', ru: 'Монголия', zh: '蒙古', ja: 'モンゴル', kz: 'Моңғолия' } },
  { value: 'zh', label: { ko: '중국', en: 'China', ru: 'Китай', zh: '中国', ja: '中国', kz: 'Қытай' } },
  { value: 'ja', label: { ko: '일본', en: 'Japan', ru: 'Япония', zh: '日本', ja: '日本', kz: 'Жапония' } },
  { value: 'en', label: { ko: '기타', en: 'Other', ru: 'Другое', zh: '其他', ja: 'その他', kz: 'Басқа' } },
];

const LABELS = {
  title: { ko: '의료비자 가이드', en: 'Medical Visa Guide', ru: 'Гид по медицинской визе', zh: '医疗签证指南', ja: '医療ビザガイド', kz: 'Медициналық виза нұсқаулығы' },
  subtitle: { ko: '한국 의료 비자 신청에 필요한 정보', en: 'Information for Korean medical visa application', ru: 'Информация для получения медицинской визы в Корею', zh: '韩国医疗签证申请所需信息', ja: '韓国医療ビザ申請に必要な情報', kz: 'Корея медициналық визасына қажетті ақпарат' },
  nationality: { ko: '국적', en: 'Nationality', ru: 'Гражданство', zh: '国籍', ja: '国籍', kz: 'Азаматтық' },
  duration: { ko: '예상 치료 기간 (일)', en: 'Expected treatment duration (days)', ru: 'Ожидаемый срок лечения (дни)', zh: '预计治疗时间（天）', ja: '予想治療期間（日）', kz: 'Болжалды емдеу мерзімі (күн)' },
  recommended: { ko: '추천 비자', en: 'Recommended Visa', ru: 'Рекомендуемая виза', zh: '推荐签证', ja: '推奨ビザ', kz: 'Ұсынылған виза' },
  alternative: { ko: '대안 비자', en: 'Alternative Visa', ru: 'Альтернативная виза', zh: '备选签证', ja: '代替ビザ', kz: 'Балама виза' },
  documents: { ko: '필요 서류', en: 'Required Documents', ru: 'Необходимые документы', zh: '所需文件', ja: '必要書類', kz: 'Қажетті құжаттар' },
  processingTime: { ko: '처리 기간', en: 'Processing Time', ru: 'Срок обработки', zh: '处理时间', ja: '処理期間', kz: 'Өңдеу мерзімі' },
  fee: { ko: '수수료', en: 'Fee', ru: 'Сбор', zh: '费用', ja: '手数料', kz: 'Алым' },
  maxStay: { ko: '최대 체류', en: 'Max Stay', ru: 'Макс. пребывание', zh: '最长停留', ja: '最大滞在', kz: 'Макс. тұру' },
  days: { ko: '일', en: 'days', ru: 'дней', zh: '天', ja: '日', kz: 'күн' },
  embassy: { ko: '대사관 정보', en: 'Embassy Info', ru: 'Информация о посольстве', zh: '大使馆信息', ja: '大使館情報', kz: 'Елшілік ақпараты' },
  print: { ko: '체크리스트 인쇄', en: 'Print Checklist', ru: 'Печать чек-листа', zh: '打印清单', ja: 'チェックリスト印刷', kz: 'Тізімді басып шығару' },
  note: { ko: '참고', en: 'Note', ru: 'Примечание', zh: '备注', ja: '備考', kz: 'Ескерту' },
  loading: { ko: '로딩 중...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...', ja: '読み込み中...', kz: 'Жүктелуде...' },
};

function VisaCard({ checklist, label, l }) {
  const [checks, setChecks] = useState({});

  const toggle = (docId) => {
    setChecks(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  if (!checklist) return null;

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e40af' }}>{checklist.visaName}</h3>
        <span style={{ fontSize: 12, background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: 12, fontWeight: 600 }}>{label}</span>
      </div>

      <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>{checklist.description}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#f9fafb', padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#888' }}>{l(LABELS.maxStay)}</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{checklist.maxStay} {l(LABELS.days)}</div>
        </div>
        <div style={{ background: '#f9fafb', padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#888' }}>{l(LABELS.processingTime)}</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{checklist.processingTime}</div>
        </div>
        <div style={{ background: '#f9fafb', padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#888' }}>{l(LABELS.fee)}</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{checklist.fee}</div>
        </div>
      </div>

      {/* Document Checklist */}
      <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{l(LABELS.documents)}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {checklist.documents.map(doc => (
          <label
            key={doc.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10,
              background: checks[doc.id] ? '#f0fdf4' : '#fafafa', borderRadius: 8,
              cursor: 'pointer', border: `1px solid ${checks[doc.id] ? '#86efac' : '#eee'}`,
            }}
          >
            <input
              type="checkbox"
              checked={!!checks[doc.id]}
              onChange={() => toggle(doc.id)}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                {doc.name}
                {doc.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{doc.description}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Note */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, fontSize: 13, color: '#92400e' }}>
        <strong>{l(LABELS.note)}:</strong> {checklist.notes}
      </div>
    </div>
  );
}

export default function VisaClient() {
  const [lang, setLang] = useState('en');
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj[lang] || obj['en'] || '';

  const [nationality, setNationality] = useState('ru');
  const [duration, setDuration] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ nationality, duration: String(duration), lang });

    fetch(`/api/khidi/visa?${params}`)
      .then(r => r.json())
      .then(res => {
        if (res.ok) setData(res);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [nationality, duration, lang]);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }} aria-label={l(LABELS.title)}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{l(LABELS.title)}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{l(LABELS.subtitle)}</p>

      {/* Inputs */}
      <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="visa-nationality" style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{l(LABELS.nationality)}</label>
          <select
            id="visa-nationality"
            value={nationality}
            onChange={e => setNationality(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          >
            {NATIONALITIES.map(n => (
              <option key={n.value} value={n.value}>{l(n.label)}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="visa-duration" style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{l(LABELS.duration)}</label>
          <input
            id="visa-duration"
            type="number"
            value={duration}
            onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            max={365}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </div>
      </form>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#999', padding: 40 }}>{l(LABELS.loading)}</p>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <VisaCard checklist={data.recommended} label={l(LABELS.recommended)} l={l} />
          {data.alternative && (
            <VisaCard checklist={data.alternative} label={l(LABELS.alternative)} l={l} />
          )}

          {/* Embassy Info */}
          {data.embassy && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#f8fafc' }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{l(LABELS.embassy)}</h4>
              <p style={{ fontSize: 14, marginBottom: 4 }}>{data.embassy.ko || data.embassy.en}</p>
              {data.embassy.url && (
                <a href={data.embassy.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#2563eb' }}>
                  {data.embassy.url}
                </a>
              )}
            </div>
          )}

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            style={{
              padding: '12px 24px', borderRadius: 8, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', alignSelf: 'center',
            }}
          >
            {l(LABELS.print)}
          </button>
        </div>
      ) : null}

      <style>{`
        @media print {
          button { display: none !important; }
          select, input { border: 1px solid #000 !important; }
        }
      `}</style>
    </main>
  );
}
