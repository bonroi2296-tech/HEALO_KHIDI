"use client";

import { useState, useCallback } from 'react';
import { Globe, RefreshCw, Loader2, Check, Pencil, AlertCircle } from 'lucide-react';

const LANG_TABS = [
  { code: 'ko', label: 'KO', full: '한국어' },
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'zh', label: 'ZH', full: '中文' },
  { code: 'ja', label: 'JA', full: '日本語' },
];

const FIELDS_HOSPITAL = ['name', 'description', 'tags', 'specialties', 'location'];
const FIELDS_TREATMENT = ['name', 'description', 'tags'];

const FIELD_LABELS = {
  name: '이름',
  description: '설명',
  tags: '태그',
  specialties: '진료과목',
  location: '위치',
};

function StatusBadge({ hasValue }) {
  if (hasValue) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
        <Check size={10} /> 번역됨
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
      <AlertCircle size={10} /> 없음
    </span>
  );
}

export function TranslationPanel({ i18n, onI18nChange, type = 'hospital', _entityId, onRetranslate, toast }) {
  const [activeLang, setActiveLang] = useState('ko');
  const [isOpen, setIsOpen] = useState(false);
  const [retranslating, setRetranslating] = useState(false);

  const fields = type === 'hospital' ? FIELDS_HOSPITAL : FIELDS_TREATMENT;
  const currentData = i18n?.[activeLang] || {};

  const getFieldValue = useCallback((field) => {
    return currentData[field] ?? '';
  }, [currentData]);

  const handleFieldChange = useCallback((field, value) => {
    const updated = {
      ...i18n,
      [activeLang]: {
        ...(i18n?.[activeLang] || {}),
        [field]: value,
      },
    };
    onI18nChange(updated);
  }, [i18n, activeLang, onI18nChange]);

  const handleArrayFieldChange = useCallback((field, valueStr) => {
    const arr = valueStr.split(',').map(s => s.trim()).filter(Boolean);
    handleFieldChange(field, arr);
  }, [handleFieldChange]);

  const handleRetranslate = useCallback(async () => {
    if (!onRetranslate) return;
    setRetranslating(true);
    try {
      await onRetranslate();
      toast?.success?.('번역이 요청되었습니다. 잠시 후 새로고침 해주세요.');
    } catch (e) {
      toast?.error?.('번역 요청 실패: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setRetranslating(false);
    }
  }, [onRetranslate, toast]);

  const langCompleteness = LANG_TABS.map(({ code }) => {
    const langData = i18n?.[code] || {};
    const filled = fields.filter(f => {
      const v = langData[f];
      if (Array.isArray(v)) return v.length > 0;
      return !!v;
    }).length;
    return { code, filled, total: fields.length };
  });

  return (
    <div className="space-y-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
          <Globe size={16} /> 번역 관리 (i18n)
        </h3>
        <div className="flex items-center gap-2">
          {langCompleteness.map(({ code, filled, total }) => (
            <span
              key={code}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                filled === total
                  ? 'bg-green-200 text-green-800'
                  : filled > 0
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {code.toUpperCase()} {filled}/{total}
            </span>
          ))}
          <span className="text-xs text-indigo-400">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="space-y-3">
          {/* Language Tabs */}
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
            {LANG_TABS.map(({ code, label, full: _full }) => {
              const comp = langCompleteness.find(c => c.code === code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setActiveLang(code)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition ${
                    activeLang === code
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                  <span className={`ml-1 text-[10px] ${activeLang === code ? 'text-indigo-200' : 'text-gray-500'}`}>
                    ({comp?.filled}/{comp?.total})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fields for active language */}
          <div className="space-y-2 bg-white rounded-lg p-3 border border-gray-200">
            {fields.map(field => {
              const isArrayField = field === 'tags' || field === 'specialties';
              const val = getFieldValue(field);

              return (
                <div key={field}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-500">{FIELD_LABELS[field] || field}</label>
                    <StatusBadge hasValue={isArrayField ? (Array.isArray(val) && val.length > 0) : !!val} />
                  </div>
                  {isArrayField ? (
                    <input
                      type="text"
                      value={Array.isArray(val) ? val.join(', ') : ''}
                      onChange={e => handleArrayFieldChange(field, e.target.value)}
                      placeholder={`쉼표로 구분 (예: 항목1, 항목2)`}
                      className="w-full border border-gray-200 p-2 rounded text-xs"
                    />
                  ) : field === 'description' ? (
                    <textarea
                      rows={2}
                      value={val || ''}
                      onChange={e => handleFieldChange(field, e.target.value)}
                      placeholder={`${FIELD_LABELS[field]} (${activeLang.toUpperCase()})`}
                      className="w-full border border-gray-200 p-2 rounded text-xs"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val || ''}
                      onChange={e => handleFieldChange(field, e.target.value)}
                      placeholder={`${FIELD_LABELS[field]} (${activeLang.toUpperCase()})`}
                      className="w-full border border-gray-200 p-2 rounded text-xs"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Re-translate button */}
          {onRetranslate && (
            <button
              type="button"
              onClick={handleRetranslate}
              disabled={retranslating}
              className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retranslating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {retranslating ? '번역 중...' : '저장 후 AI 재번역 (전체 언어)'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
