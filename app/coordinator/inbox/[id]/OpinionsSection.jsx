"use client";

/**
 * 코디 인박스 상세 — 전문의 세컨드 오피니언 블록 (코디·어드민 전용).
 * · "소견 요청 링크 만들기" → 계정 불필요 매직링크 + 카톡 붙여넣기용 요약 생성.
 * · 도착한 소견 목록 표시. '그 외 의료진' 등은 "소견 주신 분"을 코디가 나중에 라벨.
 * 자체 완결형(부모 CoordinatorInboxDetailClient 는 한 줄만 삽입).
 */

import { useState, useEffect, useCallback } from "react";
import { Stethoscope, Copy, Check, Link2, Loader2, Pencil, Paperclip, FileText, X } from "lucide-react";
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
  // 환자 언어 — 소견 "다시 번역" 버튼의 타겟(서버가 GET 응답에 실어 보냄).
  const [patientLang, setPatientLang] = useState(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");

  const [showDirect, setShowDirect] = useState(false);
  const [directDoctor, setDirectDoctor] = useState("");
  const [directText, setDirectText] = useState("");
  const [addingDirect, setAddingDirect] = useState(false);
  const [directFile, setDirectFile] = useState(null); // { path, name }
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [directError, setDirectError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/coordinator/opinions?inquiryId=${inquiryId}`);
      const data = await res.json();
      if (data.ok) {
        setRequest(data.request || null);
        setSummary(data.summaryText || "");
        setOpinions(data.opinions || []);
        setPatientLang(data.patientLang || null);
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

  const uploadDirectFile = async (file) => {
    if (!file) return;
    setUploadingFile(true);
    setFileError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) setDirectFile({ path: data.path, name: data.name || file.name });
      else setFileError("업로드 실패 — 다시 시도해 주세요.");
    } catch {
      setFileError("업로드 실패 — 다시 시도해 주세요.");
    } finally {
      setUploadingFile(false);
    }
  };

  const addDirect = async () => {
    if (!directDoctor.trim() || (directText.trim().length < 5 && !directFile)) return;
    setAddingDirect(true);
    setDirectError("");
    try {
      const res = await authFetch(`/api/coordinator/opinions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: Number(inquiryId), direct: true, doctorName: directDoctor,
          opinionText: directText,
          ...(directFile ? { filePath: directFile.path, fileName: directFile.name } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDirectDoctor(""); setDirectText(""); setDirectFile(null); setShowDirect(false);
        await load();
      } else {
        // ⚠️ 실패를 삼키면 안 된다 — 서버는 소견을 저장한 뒤 번역 단계에서 잘릴 수 있는데,
        // 화면이 조용하면 코디가 "안 됐나 보다" 하고 다시 눌러 **같은 소견이 두 번 들어간다**
        // (case_opinions 에 유일 제약 없음, 2라운드 리뷰 지적).
        setDirectError("저장 여부가 확인되지 않았습니다. 다시 누르기 전에 아래 목록을 새로고침해 이미 들어갔는지 확인해 주세요.");
        await load();
      }
    } catch {
      setDirectError("저장 여부가 확인되지 않았습니다. 다시 누르기 전에 아래 목록을 새로고침해 이미 들어갔는지 확인해 주세요.");
      await load();
    } finally {
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
      <p className="text-xs text-gray-500 mb-3">협력병원·전문의에게 소견 요청 링크를 보내고, 받은 소견을 여기서 확인합니다. (코디·어드민 전용)</p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-3"><Loader2 size={15} className="animate-spin" /> 불러오는 중…</div>
      ) : (
        <>
          {/* 링크 생성 / 재공유 */}
          {!request ? (
            <button
              onClick={createLink}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
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
                    <span className="text-[11px] text-gray-500">카톡 붙여넣기용 요약</span>
                    <button onClick={() => copy(summary, "sum")} className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline">
                      {copied === "sum" ? <Check size={13} /> : <Copy size={13} />} 요약 복사
                    </button>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded p-2 font-sans">{summary}</pre>
                </div>
              )}
              <p className="text-[11px] text-gray-500">링크를 카톡 등으로 원장님께 보내세요. 원장님은 로그인 없이 소견을 남깁니다.</p>
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
                  placeholder="받은 소견 원문을 그대로 붙여넣으세요 (또는 아래에 문서·이미지로 첨부)"
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                {/* 텍스트 대신(또는 추가로) 원장님이 준 문서·이미지 파일을 그대로 첨부 — 서버가 자동 번역 */}
                {directFile ? (
                  <div className="flex items-center gap-2 text-xs bg-white border border-gray-200 rounded px-2 py-1.5">
                    <FileText size={13} className="text-teal-600 shrink-0" />
                    <span className="truncate flex-1 text-gray-700">{directFile.name}</span>
                    <button onClick={() => setDirectFile(null)} className="shrink-0 text-gray-500 hover:text-red-600">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-700 cursor-pointer">
                    {uploadingFile ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
                    {uploadingFile ? "업로드 중…" : "원장님이 주신 문서·이미지 첨부 (텍스트 대신 자동 번역)"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      disabled={uploadingFile}
                      onChange={(e) => uploadDirectFile(e.target.files?.[0])}
                    />
                  </label>
                )}
                {fileError && <p className="text-[11px] text-red-600">{fileError}</p>}
                {directError && <p className="text-[11px] text-red-600">{directError}</p>}

                <div className="flex items-center gap-2">
                  <button
                    onClick={addDirect}
                    disabled={addingDirect || uploadingFile || !directDoctor.trim() || (directText.trim().length < 5 && !directFile)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    {addingDirect ? "저장·번역 중… (최대 1~2분)" : "추가"}
                  </button>
                  <button onClick={() => setShowDirect(false)} className="text-xs text-gray-500 hover:underline">취소</button>
                </div>
              </div>
            )}
          </div>

          {/* 도착한 소견 */}
          <div className="mt-4 space-y-3">
            {opinions.length === 0 ? (
              <p className="text-xs text-gray-500">아직 도착한 소견이 없습니다.</p>
            ) : (
              opinions.map((o) => <OpinionItem key={o.id} opinion={o} patientLang={patientLang} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OpinionItem({ opinion, patientLang }) {
  const [attr, setAttr] = useState(opinion.attribution_note || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [released, setReleased] = useState(!!opinion.released_at);
  // 접수 시점에 서버가 이미 환자 언어로 자동 번역해둔 초안(auto_translated_text)이 있으면 그걸 기본값으로.
  // 없으면(번역 실패·미지원 언어·아직 처리 중) 원문(한글) 폴백 — 아래 "다시 번역"으로 수동 재시도.
  const [draft, setDraft] = useState(
    opinion.released_text || opinion.auto_translated_text || opinion.opinion_text || ""
  );
  // 코디가 손댔는지 추적 — 아래 동기화가 편집분을 덮지 않게 하는 유일한 근거.
  const [draftTouched, setDraftTouched] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");
  // 아직 공개 전인데 자동 번역본이 있으면 = 코디가 교정만 하면 되는 상태(안내 문구 분기용).
  const preTranslated = !opinion.released_at && !!opinion.auto_translated_text;

  // 의사 매직링크 경로는 번역을 응답 후(after())에 채우므로, 처음 조회 땐 auto_translated_text 가
  // 없다가 다음 재조회에서 생긴다. draft 는 useState 초기값이라 그대로면 라벨만 "AI가 번역해뒀습니다"
  // 로 바뀌고 본문은 한글 원문인 어긋남이 난다 → 늦게 도착한 번역을 초안에 반영한다.
  // ⚠️ 단 **코디가 이미 손댔으면 절대 덮지 않는다.** (초기엔 key 를 뒤집어 재마운트시켰는데,
  // 그러면 다른 소견을 추가하다 재조회될 때 편집 중이던 확정본이 말없이 날아갔다 — 2라운드 리뷰 지적.)
  useEffect(() => {
    if (draftTouched) return;
    if (opinion.released_text) return;      // 이미 공개된 확정본이 우선
    if (!opinion.auto_translated_text) return;
    setDraft(opinion.auto_translated_text);
  }, [opinion.auto_translated_text, opinion.released_text, draftTouched]);

  // 재번역 — 원문(한글)을 다시 환자 언어로 번역해 draft 를 덮어쓴다(코디가 초안을 날렸거나
  // 접수 시점 자동번역이 실패한 경우의 복구 경로). 저장은 안 하고 화면 초안만 바꾼다.
  const retranslate = async () => {
    setTranslating(true);
    setTranslateError("");
    try {
      const res = await authFetch(`/api/coordinator/opinions/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: opinion.opinion_text || "", lang: patientLang }),
      });
      const data = await res.json();
      if (data.ok) { setDraft(data.translated); setDraftTouched(true); }
      else setTranslateError("번역 실패 — 다시 시도해 주세요.");
    } catch {
      setTranslateError("번역 실패 — 다시 시도해 주세요.");
    } finally {
      setTranslating(false);
    }
  };

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
        <span className="text-[11px] text-gray-500">{fmt(opinion.created_at)}</span>
        {released && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">에이전시 공개됨</span>
        )}
      </div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">
          {opinion.file_path ? "원장님 원문 — AI 번역 초안(내부용, 에이전시에 안 보임)" : "원장님 원문 (내부용, 에이전시에 안 보임)"}
        </p>
        {opinion.file_url && (
          <a href={opinion.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:underline shrink-0">
            <Paperclip size={11} /> 원본 파일 ({opinion.file_name || "첨부"})
          </a>
        )}
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{opinion.opinion_text}</p>

      {/* 에이전시 공개 — 접수 시점에 AI 초벌 번역(환자 언어) → 코디 교정 → 공개해야만 노출 */}
      <div className="mt-3 bg-blue-50/40 border border-blue-100 rounded-lg p-3">
        <p className="text-[11px] text-blue-700 mb-1.5">
          에이전시에 보낼 확정본
          {preTranslated ? " — AI가 자동 번역해뒀습니다, 확인·교정 후 공개" : " — 직접 교정 후 공개"}
        </p>
        <textarea
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setDraftTouched(true); }}
          rows={3}
          disabled={released}
          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        {translateError && <p className="text-[11px] text-red-600 mt-1">{translateError}</p>}
        <div className="mt-2 flex items-center gap-2">
          {/* 자동번역이 실패했거나 코디가 초안을 날린 경우의 복구 버튼. 환자 언어를 모르면 숨긴다. */}
          {!released && patientLang && (
            <button
              onClick={retranslate}
              disabled={translating}
              className="text-xs text-blue-700 hover:underline disabled:opacity-50"
            >
              {translating ? "번역 중…" : "다시 번역"}
            </button>
          )}
          {released ? (
            <button onClick={unpublish} disabled={releasing} className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50">
              {releasing ? "처리 중…" : "공개 취소 (다시 비공개로)"}
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={releasing || !draft.trim()}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
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
