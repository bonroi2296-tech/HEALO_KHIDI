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
import { uploadAttachment } from "@/lib/uploadAttachment";
import { useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";

async function authFetch(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

// 날짜 표기도 화면 언어에 맞춘다(ko-KR 고정이면 러시아어 화면에 한국식 표기가 샌다).
function fmt(iso, loc) {
  try { return new Date(iso).toLocaleString(loc || "ko-KR"); } catch { return iso; }
}

export default function OpinionsSection({ inquiryId }) {
  const L = useCoordinatorL();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [summary, setSummary] = useState("");
  const [opinions, setOpinions] = useState([]);
  // 환자 언어 — 소견 L.soRetranslate 버튼의 타겟(서버가 GET 응답에 실어 보냄).
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
      const data = await uploadAttachment(file);
      if (data.ok) setDirectFile({ path: data.path, name: data.name || file.name });
      else setFileError(L.soUploadFail);
    } catch {
      setFileError(L.soUploadFail);
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
        setDirectError(L.soSaveUnconfirmed);
        await load();
      }
    } catch {
      setDirectError(L.soSaveUnconfirmed);
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
        <Stethoscope size={16} className="text-teal-600" /> {L.soTitle}
      </h2>
      <p className="text-xs text-gray-500 mb-3">{L.soDesc}</p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-3"><Loader2 size={15} className="animate-spin" /> {L.soLoading}</div>
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
                    <span className="text-[11px] text-gray-500">{L.soCopySummary}</span>
                    <button onClick={() => copy(summary, "sum")} className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline">
                      {copied === "sum" ? <Check size={13} /> : <Copy size={13} />} 요약 복사
                    </button>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded p-2 font-sans">{summary}</pre>
                </div>
              )}
              <p className="text-[11px] text-gray-500">{L.soLinkHint}</p>
              <button onClick={createLink} disabled={creating} className="text-xs text-gray-500 hover:text-teal-700 hover:underline">
                {L.soNewLink}
              </button>
            </div>
          )}

          {/* 이미 카톡·메일 등으로 받은 소견을 링크 없이 직접 입력 */}
          <div className="mt-2">
            {!showDirect ? (
              <button onClick={() => setShowDirect(true)} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-700 hover:underline">
                <Pencil size={12} /> {L.soManualEntry}
              </button>
            ) : (
              <div className="space-y-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                <input
                  value={directDoctor}
                  onChange={(e) => setDirectDoctor(e.target.value)}
                  placeholder={L.soAuthorPh}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <textarea
                  value={directText}
                  onChange={(e) => setDirectText(e.target.value)}
                  rows={3}
                  placeholder={L.soBodyPh}
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
                    {uploadingFile ? L.soUploading : L.soAttachLabel}
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
                    {addingDirect ? L.soSavingLong : "추가"}
                  </button>
                  <button onClick={() => setShowDirect(false)} className="text-xs text-gray-500 hover:underline">{L.soCancel}</button>
                </div>
              </div>
            )}
          </div>

          {/* 도착한 소견 */}
          <div className="mt-4 space-y-3">
            {opinions.length === 0 ? (
              <p className="text-xs text-gray-500">{L.soNone}</p>
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
  // 이 하위 부품도 자기 언어를 직접 가져온다(부모에서 넘기면 인자만 늘어난다).
  const L = useCoordinatorL();
  const dateLoc = useDateLocale();
  const [attr, setAttr] = useState(opinion.attribution_note || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [released, setReleased] = useState(!!opinion.released_at);
  // 접수 시점에 서버가 이미 환자 언어로 자동 번역해둔 초안(auto_translated_text)이 있으면 그걸 기본값으로.
  // 없으면(번역 실패·미지원 언어·아직 처리 중) 원문(한글) 폴백 — 아래 L.soRetranslate으로 수동 재시도.
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
      else setTranslateError(L.soTranslateFail);
    } catch {
      setTranslateError(L.soTranslateFail);
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
    // 「공개」의 대상에 **환자 본인**이 들어가면서(2026-08-05) 되돌리기 어려운 무게가 생겼다 —
    // 「4기·다발 전이」 같은 문장을 환자가 링크에서 바로 읽는다. 누르기 전에 한 번 알린다.
    if (!window.confirm(L.soPublishConfirm)) return;
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
        <span className="text-[11px] text-gray-500">{fmt(opinion.created_at, dateLoc)}</span>
        {released && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">{L.soPublished}</span>
        )}
      </div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">
          {opinion.file_path ? L.soOriginalDraft : L.soOriginalInternal}
        </p>
        {opinion.file_url && (
          <a href={opinion.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:underline shrink-0">
            <Paperclip size={11} /> 원본 파일 ({opinion.file_name || L.soAttach})
          </a>
        )}
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{opinion.opinion_text}</p>

      {/* 원장님이 소견과 «같이 낸» 서류(견적서 등). 저장은 되는데 화면에 안 떠서 코디가
          있는 줄도 몰랐다(2026-08-04 발견 — 실제 제출본 1건이 묻혀 있었다). */}
      {Array.isArray(opinion.files) && opinion.files.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-500">같이 받은 서류</span>
          {opinion.files.map((f, i) => (
            <a
              key={i}
              href={f.url || "#"}
              download={f.name}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 bg-white text-[11px] text-gray-700 hover:bg-gray-50 max-w-full truncate"
            >
              <Paperclip size={11} className="shrink-0" /> {f.name}
            </a>
          ))}
        </div>
      )}

      {/* 공개 — 접수 시점에 AI 초벌 번역(환자 언어) → 코디 교정 → 공개해야만 노출.
          대상은 «에이전시 포털»뿐이다. 2026-08-05~09-05 사이엔 환자 진행상황 링크에도 «소견서 모양»으로
          떴는데, 2026-08-18 PO 결정(«제2 의료소견서 화면 빼자 — 공식 문서로») 이 2026-09-06 에 본판에 들어오면서
          환자에게는 공식 문서(「환자에게 보이기」)로만 간다. 이 문구를 다시 «환자에게 보인다»로 돌리지 마라. */}
      <div className="mt-3 bg-blue-50/40 border border-blue-100 rounded-lg p-3">
        <p className="text-[11px] text-blue-700 mb-1.5">
          에이전시에 보낼 확정본
          {preTranslated ? L.soPublishAuto : L.soPublishManual}
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
              className="text-xs text-teal-700 hover:underline disabled:opacity-50"
            >
              {translating ? L.soTranslating : L.soRetranslate}
            </button>
          )}
          {released ? (
            <button onClick={unpublish} disabled={releasing} className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50">
              {releasing ? L.soProcessing : L.soUnpublish}
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={releasing || !draft.trim()}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition disabled:opacity-50"
            >
              {releasing ? L.soPublishing : L.soPublish}
            </button>
          )}
        </div>
      </div>

      {/* 소견 주신 분 라벨 — '그 외 의료진'이면 코디가 신원을 채운다 */}
      <div className="mt-2 flex items-center gap-2">
        <input
          value={attr}
          onChange={(e) => setAttr(e.target.value)}
          placeholder={L.soAuthorPhOpt}
          className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button onClick={save} disabled={saving} className="shrink-0 text-xs text-teal-700 font-medium hover:underline disabled:opacity-50">
          {saved ? L.soSaved : saving ? L.soSaving : "저장"}
        </button>
      </div>
    </div>
  );
}
