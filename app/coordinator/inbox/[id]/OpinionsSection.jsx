"use client";

/**
 * 코디 인박스 상세 — 전문의 세컨드 오피니언 블록 (코디·어드민 전용).
 * · "소견 요청 링크 만들기" → 계정 불필요 매직링크 + 카톡 붙여넣기용 요약 생성.
 * · 도착한 소견 목록 표시. '그 외 의료진' 등은 "소견 주신 분"을 코디가 나중에 라벨.
 * 자체 완결형(부모 CoordinatorInboxDetailClient 는 한 줄만 삽입).
 */

import { useState, useEffect, useCallback } from "react";
import { Stethoscope, Copy, Check, Link2, Loader2, Pencil } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

async function authFetch(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

function fmt(iso) {
  try { return new Date(iso).toLocaleString("ko-KR"); } catch { return iso; }
}

export default function OpinionsSection({ inquiryId }) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [summary, setSummary] = useState("");
  const [opinions, setOpinions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");

  const [showDirect, setShowDirect] = useState(false);
  const [directDoctor, setDirectDoctor] = useState("");
  const [directText, setDirectText] = useState("");
  const [addingDirect, setAddingDirect] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/coordinator/opinions?inquiryId=${inquiryId}`);
      const data = await res.json();
      if (data.ok) {
        setRequest(data.request || null);
        setSummary(data.summaryText || "");
        setOpinions(data.opinions || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => { load(); }, [load]);

  const createLink = async () => {
    setCreating(true);
    try {
      const res = await authFetch(`/api/coordinator/opinions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: Number(inquiryId) }),
      });
      const data = await res.json();
      if (data.ok) {
        setRequest(data.request);
        setSummary(data.summaryText || "");
      }
    } catch { /* silent */ } finally {
      setCreating(false);
    }
  };

  const addDirect = async () => {
    if (!directDoctor.trim() || directText.trim().length < 5) return;
    setAddingDirect(true);
    try {
      const res = await authFetch(`/api/coordinator/opinions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: Number(inquiryId), direct: true, doctorName: directDoctor, opinionText: directText }),
      });
      const data = await res.json();
      if (data.ok) {
        setDirectDoctor(""); setDirectText(""); setShowDirect(false);
        await load();
      }
    } catch { /* silent */ } finally {
      setAddingDirect(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
        <Stethoscope size={16} className="text-teal-600" /> 전문의 소견 (세컨드 오피니언)
      </h2>
      <p className="text-xs text-gray-400 mb-3">협력병원·전문의에게 소견 요청 링크를 보내고, 받은 소견을 여기서 확인합니다. (코디·어드민 전용)</p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-3"><Loader2 size={15} className="animate-spin" /> 불러오는 중…</div>
      ) : (
        <>
          {/* 링크 생성 / 재공유 */}
          {!request ? (
            <button
              onClick={createLink}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
              소견 요청 링크 만들기
            </button>
          ) : (
            <div className="space-y-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <input readOnly value={request.url} className="flex-1 min-w-0 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-gray-700" />
                <button onClick={() => copy(request.url, "url")} className="shrink-0 inline-flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline">
                  {copied === "url" ? <Check size={13} /> : <Copy size={13} />} 링크
                </button>
              </div>
              {summary && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-400">카톡 붙여넣기용 요약</span>
                    <button onClick={() => copy(summary, "sum")} className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline">
                      {copied === "sum" ? <Check size={13} /> : <Copy size={13} />} 요약 복사
                    </button>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded p-2 font-sans">{summary}</pre>
                </div>
              )}
              <p className="text-[11px] text-gray-400">링크를 카톡 등으로 원장님께 보내세요. 원장님은 로그인 없이 소견을 남깁니다.</p>
              <button onClick={createLink} disabled={creating} className="text-xs text-gray-500 hover:text-teal-700 hover:underline">
                새 링크 만들기
              </button>
            </div>
          )}

          {/* 이미 카톡·메일 등으로 받은 소견을 링크 없이 직접 입력 */}
          <div className="mt-2">
            {!showDirect ? (
              <button onClick={() => setShowDirect(true)} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-700 hover:underline">
                <Pencil size={12} /> 이미 받은 소견 직접 입력
              </button>
            ) : (
              <div className="space-y-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                <input
                  value={directDoctor}
                  onChange={(e) => setDirectDoctor(e.target.value)}
                  placeholder="소견 주신 분 (예: ○○대병원 종양내과 김○○)"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <textarea
                  value={directText}
                  onChange={(e) => setDirectText(e.target.value)}
                  rows={3}
                  placeholder="받은 소견 원문을 그대로 붙여넣으세요"
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={addDirect}
                    disabled={addingDirect || !directDoctor.trim() || directText.trim().length < 5}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    {addingDirect ? "추가 중…" : "추가"}
                  </button>
                  <button onClick={() => setShowDirect(false)} className="text-xs text-gray-400 hover:underline">취소</button>
                </div>
              </div>
            )}
          </div>

          {/* 도착한 소견 */}
          <div className="mt-4 space-y-3">
            {opinions.length === 0 ? (
              <p className="text-xs text-gray-400">아직 도착한 소견이 없습니다.</p>
            ) : (
              opinions.map((o) => <OpinionItem key={o.id} opinion={o} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OpinionItem({ opinion }) {
  const [attr, setAttr] = useState(opinion.attribution_note || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [released, setReleased] = useState(!!opinion.released_at);
  const [draft, setDraft] = useState(opinion.released_text || opinion.opinion_text || "");
  const [releasing, setReleasing] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await authFetch(`/api/coordinator/opinions/${opinion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributionNote: attr }),
      });
      const data = await res.json();
      if (data.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!draft.trim()) return;
    setReleasing(true);
    try {
      const res = await authFetch(`/api/coordinator/opinions/${opinion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releasedText: draft }),
      });
      const data = await res.json();
      if (data.ok) setReleased(true);
    } catch { /* silent */ } finally {
      setReleasing(false);
    }
  };

  const unpublish = async () => {
    setReleasing(true);
    try {
      const res = await authFetch(`/api/coordinator/opinions/${opinion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ release: false }),
      });
      const data = await res.json();
      if (data.ok) setReleased(false);
    } catch { /* silent */ } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">{opinion.doctor_name}</span>
        <span className="text-[11px] text-gray-400">{fmt(opinion.created_at)}</span>
        {released && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">에이전시 공개됨</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-1">원장님 원문 (내부용, 에이전시에 안 보임)</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{opinion.opinion_text}</p>

      {/* 에이전시 공개 — 원문을 교정/번역해 확정본을 만들고 공개해야만 에이전시에 노출 */}
      <div className="mt-3 bg-blue-50/40 border border-blue-100 rounded-lg p-3">
        <p className="text-[11px] text-blue-700 mb-1.5">에이전시에 보낼 확정본 (오탈자·외국어 교정 후 공개)</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          disabled={released}
          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <div className="mt-2">
          {released ? (
            <button onClick={unpublish} disabled={releasing} className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50">
              {releasing ? "처리 중…" : "공개 취소 (다시 비공개로)"}
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={releasing || !draft.trim()}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {releasing ? "공개 중…" : "에이전시에 공개"}
            </button>
          )}
        </div>
      </div>

      {/* 소견 주신 분 라벨 — '그 외 의료진'이면 코디가 신원을 채운다 */}
      <div className="mt-2 flex items-center gap-2">
        <input
          value={attr}
          onChange={(e) => setAttr(e.target.value)}
          placeholder="소견 주신 분 (예: ○○대병원 종양내과 김○○) — 필요 시 메모"
          className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button onClick={save} disabled={saving} className="shrink-0 text-xs text-teal-700 font-medium hover:underline disabled:opacity-50">
          {saved ? "저장됨" : saving ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}
