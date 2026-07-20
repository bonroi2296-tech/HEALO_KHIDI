'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ExternalLink, FileText, Save, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRecoveryTime, formatDuration } from '@/lib/hospitalOffers/formatOfferFields';

const PREVIEW_STEPS = [
  { label: '웹사이트 수집 중', detail: '페이지를 불러오고 있습니다 (약 3초 이내)' },
  { label: '페이지 분석·랭킹 중', detail: '시술/가격 관련 페이지를 선별합니다' },
  { label: '시술 정보 추출 중', detail: '대표 시술 후보를 선별합니다' },
];
const PROGRESS_INTERVAL_MS = 1200;
const PROGRESS_STEP_PCT = 4;
const PROGRESS_MAX_PCT = 92;

/**
 * 미리보기 payload: { hospital_id, captured_at, sources, offers }
 * offers[].treatment: name, slug, description, full_description, duration, anesthesia_type,
 *   recovery_time_min/max, side_effects, precautions, price_min/max/currency, price_includes, tags, images
 * offers[].evidence: { [field]: { source_url, snippet_or_ocr_text } }
 * offers[].confidence: 0~1
 */
const PREVIEW_URLS_COUNT = 5;

function SourceListCollapsible({ sources }) {
  const [expanded, setExpanded] = useState(false);
  const count = sources.length;
  const hasMore = count > PREVIEW_URLS_COUNT;
  const displayList = expanded || !hasMore ? sources : sources.slice(0, PREVIEW_URLS_COUNT);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => hasMore && setExpanded((e) => !e)}
        className={`flex items-center gap-1 text-xs font-bold text-gray-500 uppercase ${hasMore ? 'cursor-pointer hover:text-gray-700' : ''}`}
      >
        Source 보기 ({count}개)
        {hasMore && (expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </button>
      <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
        {displayList.map((s, i) => (
          <li key={i}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-teal-700 hover:underline flex items-center gap-1 truncate"
            >
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{s.title || s.url}</span>
            </a>
          </li>
        ))}
      </ul>
      {hasMore && !expanded && (
        <p className="mt-1 text-xs text-gray-400">펼쳐서 전체 {count}개 보기</p>
      )}
    </div>
  );
}

function OfferCard({ offer, index }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const t = offer?.treatment || {};
  const ev = offer?.evidence || {};
  const priceStr =
    t.price_min != null || t.price_max != null
      ? [t.price_min, t.price_max].filter((n) => n != null).join(' ~ ') + (t.currency ? ` ${t.currency}` : '')
      : null;
  // 적용(offers/apply)이 DB에 넣는 것과 **같은 함수**를 쓴다 — 예전엔 각자 포맷해서
  // min==max 일 때 미리보기 "3~3일" vs 적용 결과 "3일" 로 갈렸다(#103 독립 리뷰 지적).
  const durationStr = formatDuration(t.duration);
  const recoveryStr = formatRecoveryTime(t.recovery_time_min, t.recovery_time_max);

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-bold text-gray-900">{t.name || `시술 ${index + 1}`}</h4>
        <span className="text-xs text-gray-500">신뢰도 {((offer.confidence ?? 0.8) * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-2 space-y-1 text-sm text-gray-600">
        {priceStr && <div>가격: {priceStr}</div>}
        {durationStr && <div>소요: {durationStr}</div>}
        {recoveryStr && <div>회복: {recoveryStr}</div>}
        {t.anesthesia_type && <div>마취: {t.anesthesia_type}</div>}
        {t.price_includes?.length > 0 && (
          <div>포함: {t.price_includes.join(', ')}</div>
        )}
      </div>
      {t.images?.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {t.images.slice(0, 3).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-16 h-16 rounded overflow-hidden border border-gray-200"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.keys(ev).length > 0 && (
          <button
            type="button"
            onClick={() => setShowEvidence((e) => !e)}
            className="flex items-center gap-1 text-xs text-teal-700 hover:underline"
          >
            <FileText size={12} />
            근거 텍스트 {showEvidence ? '숨기기' : '보기'}
          </button>
        )}
      </div>
      {showEvidence && Object.keys(ev).length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 space-y-2 max-h-40 overflow-y-auto">
          {Object.entries(ev).map(([field, v]) => (
            <div key={field}>
              <span className="font-medium text-gray-500">{field}:</span>{' '}
              <a
                href={v?.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:underline"
              >
                Source
              </a>
              <div className="mt-0.5 text-gray-600">{v?.snippet_or_ocr_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HospitalOffersPreviewModal({
  open,
  onClose,
  payload,
  loading,
  onConfirmSave,
  onRetryPoll,
  hospitalId,
  toast,
}) {
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!loading) {
      setProgress(100);
      setStepIndex(PREVIEW_STEPS.length - 1);
      return;
    }
    setProgress(0);
    setStepIndex(0);
    const id = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + PROGRESS_STEP_PCT, PROGRESS_MAX_PCT);
        setStepIndex(next >= 60 ? 2 : next >= 30 ? 1 : 0);
        return next;
      });
    }, PROGRESS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loading]);

  const displayProgress = loading ? Math.min(progress, PROGRESS_MAX_PCT) : 100;
  const currentStep = PREVIEW_STEPS[Math.min(stepIndex, PREVIEW_STEPS.length - 1)];

  if (!open) return null;

  const sources = payload?.sources || [];
  const offers = payload?.offers || [];
  const hint = payload?.hint;
  const hintMessage = payload?.message;
  const isTimeout = payload?.timeout && payload?.job_id;

  const handleApply = async () => {
    if (!hospitalId || !payload) return;
    setSaving(true);
    try {
      const toSend = { ...payload, offers: payload.offers ?? [] };
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/offers/apply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
      });
      const result = await res.json();
      if (result.ok) {
        if (result.partial_failure && result.message) {
          toast?.warning?.(result.message);
        } else {
          toast?.success?.(`저장 완료: 생성 ${result.created}건, 수정 ${result.updated}건`);
        }
        onClose();
        onConfirmSave?.();
      } else {
        toast?.error?.(result.detail || result.error || '저장 실패');
      }
    } catch (_e) {
      toast?.error?.('저장 요청 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold">대표 시술 미리보기 (확정 전)</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 size={32} className="animate-spin shrink-0" />
              <span className="mt-4 font-medium text-gray-700">{currentStep.label}</span>
              <span className="mt-1 text-xs text-gray-500">{currentStep.detail}</span>
              <div className="mt-6 w-full max-w-xs">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 transition-all duration-300 ease-out"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">진행도 {Math.round(displayProgress)}%</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
                <p className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Info size={12} /> 시술 정보 수집 안내
                </p>
                <p className="mb-1">
                  • <strong>알아서 처리</strong>: 먼저 HTML 수집 후, 수집량이 부족하면 동적 사이트로 판단해 자동으로 Playwright로 재시도합니다.
                </p>
                <p>
                  • 추출된 필드가 비어 있으면 사이트에 해당 정보가 없을 수 있으니 관리자가 직접 입력해 주세요.
                </p>
              </div>
              {payload?.crawl_metadata && (
                <div className="mb-3 p-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
                  <span className="font-medium">수집 결과:</span> {payload.crawl_metadata.method} · 페이지 {payload.crawl_metadata.pages_fetched}개 · 텍스트 {payload.crawl_metadata.text_length.toLocaleString()}자
                  {payload.crawl_metadata.hint && (
                    <p className="mt-1 text-amber-700">{payload.crawl_metadata.hint}</p>
                  )}
                </div>
              )}
              {payload?.captured_at && (
                <p className="text-xs text-gray-500 mb-3">
                  수집 시점: {new Date(payload.captured_at).toLocaleString()}
                </p>
              )}
              {isTimeout && (
                <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <p className="font-medium mb-2">백그라운드 생성 중입니다</p>
                  <p className="text-sm mb-3">{payload.message}</p>
                  {onRetryPoll && (
                    <button
                      type="button"
                      onClick={() => onRetryPoll(payload.job_id)}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
                    >
                      다시 확인
                    </button>
                  )}
                </div>
              )}
              {offers.length > 0 && offers.some(o => {
                const t = o?.treatment || {};
                const hasDetail = t.description || t.full_description || (t.price_min != null) || (t.price_max != null) || (t.precautions?.length > 0);
                return !hasDetail;
              }) && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <p className="font-medium mb-1">추출된 정보가 부족합니다</p>
                  <p>가격·설명·주의사항 등이 비어 있습니다. 동적 사이트(SPA)라면 Playwright 옵션으로 재시도하거나, 시술 편집 화면에서 직접 입력해 주세요.</p>
                </div>
              )}
              {sources.length > 0 && (
                <SourceListCollapsible sources={sources} />
              )}
              {hint === 'no_website' && (
                <div className="mb-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900">
                  <p className="font-semibold mb-1">웹사이트 URL이 없습니다</p>
                  <p className="text-sm mb-3">
                    병원 편집 화면의 <strong>웹사이트</strong> 필드에 URL을 입력한 뒤 다시 시도하세요.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-sm font-medium text-amber-700 underline hover:no-underline"
                  >
                    닫고 웹사이트 입력하러 가기 →
                  </button>
                </div>
              )}
              {(hint && hintMessage && hint !== 'no_website' && !isTimeout) && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <p className="font-medium mb-1">추출 실패 사유</p>
                  <p>{hintMessage}</p>
                </div>
              )}
              {process.env.NODE_ENV !== 'production' && payload?.debug && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowDebug((d) => !d)}
                    className="text-xs font-bold text-gray-500 uppercase"
                  >
                    {showDebug ? 'Debug 숨기기' : 'Debug 보기'}
                  </button>
                  {showDebug && (
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-48">
                      {JSON.stringify(payload.debug, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              <div className="space-y-4">
                {offers.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {hintMessage || '추출된 시술이 없습니다. 웹사이트 URL·콘텐츠를 확인하세요.'}
                  </p>
                ) : (
                  offers.map((offer, i) => <OfferCard key={i} offer={offer} index={i} />)
                )}
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
          {!loading && payload && !isTimeout && (
            <button
              type="button"
              onClick={handleApply}
              disabled={saving || offers.length === 0}
              className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? '저장 중...' : '확정 저장'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
