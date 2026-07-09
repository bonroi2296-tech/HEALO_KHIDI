"use client";

/**
 * 코디 인박스 상세 — 전문의 세컨드 오피니언 블록 (코디·어드민 전용).
 * · "소견 요청 링크 만들기" → 계정 불필요 매직링크 + 카톡 붙여넣기용 요약 생성.
 * · 도착한 소견 목록 표시. '그 외 의료진' 등은 "소견 주신 분"을 코디가 나중에 라벨.
 * 자체 완결형(부모 CoordinatorInboxDetailClient 는 한 줄만 삽입).
 */

import { useState, useEffect, useCallback } from "react";
import { Stethoscope, Copy, Check, Link2, Loader2, Pencil, Paperclip, FileText, X, ArrowRight } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CASE_STATUS_STEPS } from "@/lib/khidi/caseStatus";

const STEP_ORDER = Object.fromEntries(CASE_STATUS_STEPS.map((s) => [s.key, s.order]));
const STEP_LABEL = Object.fromEntries(CASE_STATUS_STEPS.map((s) => [s.key, s.ko]));

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

export default function OpinionsSection({ inquiryId, currentCaseStatus, onCaseStatusAdvanced }) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [summary, setSummary] = useState("");
  const [opinions, setOpinions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");
  const [stageSuggestDismissed, setStageSuggestDismissed] = useState(false);
  const [advancingStage, setAdvancingStage] = useState(false);

  const [showDirect, setShowDirect] = useState(false);
  const [directDoctor, setDirectDoctor] = useState("");
  const [directText, setDirectText] = useState("");
  const [addingDirect, setAddingDirect] = useState(false);
  const [directFiles, setDirectFiles] = useState([]); // [{ path, name }]
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [patientLang, setPatientLang] = useState(null); // 접수 시 선택한 환자 언어 — 확정본 AI 번역 타겟

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

  // 소견 공개 후 "진행 단계"를 깜빡하고 안 올리는 문제(PO 2026-07-09) — 여기서 바로 올릴 수 있게 제안.
  // 이미 hospital_review 이상이면 더 올릴 게 없으니 제안 자체를 안 띄운다.
  const advanceStage = async (key) => {
    setAdvancingStage(true);
    try {
      const res = await authFetch(`/api/admin/khidi/cases`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: Number(inquiryId), case_status: key }),
      });
      const data = await res.json();
      if (data.ok) {
        onCaseStatusAdvanced?.(key);
        setStageSuggestDismissed(true);
      }
    } catch { /* silent */ } finally {
      setAdvancingStage(false);
    }
  };

  // 여러 파일(FileList/배열) 순차 업로드 — 검사지+진단서처럼 첨부가 여러 개인 경우.
  const uploadDirectFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    setUploadingFile(true);
    setFileError("");
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) setDirectFiles((prev) => [...prev, { path: data.path, name: data.name || file.name }]);
        else setFileError("일부 업로드 실패 — 다시 시도해 주세요.");
      }
    } catch {
      setFileError("업로드 실패 — 다시 시도해 주세요.");
    } finally {
      setUploadingFile(false);
    }
  };
  const removeDirectFile = (path) => setDirectFiles((prev) => prev.filter((f) => f.path !== path));

  const addDirect = async () => {
    if (!directDoctor.trim() || (directText.trim().length < 5 && directFiles.length === 0)) return;
    setAddingDirect(true);
    try {
      const res = await authFetch(`/api/coordinator/opinions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: Number(inquiryId), direct: true, doctorName: directDoctor,
          opinionText: directText,
          ...(directFiles.length > 0 ? { files: directFiles } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDirectDoctor(""); setDirectText(""); setDirectFiles([]); setShowDirect(false);
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
                {/* 텍스트 입력칸이자 드롭존 — 원장님이 주신 문서·이미지 파일(여러 개 가능)을 여기로 바로 드래그 */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    uploadDirectFiles(e.dataTransfer.files);
                  }}
                  className={`rounded border ${dragOver ? "border-teal-500 bg-teal-50/60" : "border-gray-200"}`}
                >
                  <textarea
                    value={directText}
                    onChange={(e) => setDirectText(e.target.value)}
                    rows={3}
                    placeholder="받은 소견 원문을 그대로 붙여넣거나, 문서·이미지 파일을 여기로 드래그하세요 (여러 개 가능 — 텍스트 대신 자동 번역)"
                    className="w-full text-sm bg-transparent px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded"
                  />
                  <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 cursor-pointer">
                      {uploadingFile ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
                      {uploadingFile ? "업로드 중…" : "파일 업로드 (여러 개 가능)"}
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        disabled={uploadingFile}
                        onChange={(e) => uploadDirectFiles(e.target.files)}
                      />
                    </label>
                  </div>
                </div>

                {directFiles.length > 0 && (
                  <div className="space-y-1">
                    {directFiles.map((f) => (
                      <div key={f.path} className="flex items-center gap-2 text-xs bg-white border border-gray-200 rounded px-2 py-1.5">
                        <FileText size={13} className="text-teal-600 shrink-0" />
                        <span className="truncate flex-1 text-gray-700">{f.name}</span>
                        <button onClick={() => removeDirectFile(f.path)} className="shrink-0 text-gray-400 hover:text-red-600">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {fileError && <p className="text-[11px] text-red-600">{fileError}</p>}

                <div className="flex items-center gap-2">
                  <button
                    onClick={addDirect}
                    disabled={addingDirect || uploadingFile || !directDoctor.trim() || (directText.trim().length < 5 && directFiles.length === 0)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    {addingDirect ? (directFiles.length > 0 ? "번역 중…" : "추가 중…") : "추가"}
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
              opinions.map((o) => <OpinionItem key={o.id} opinion={o} patientLang={patientLang} />)
            )}
          </div>

          {/* 소견 공개했는데 진행 단계는 그대로인 경우 — 깜빡하기 쉬워서 여기서 바로 올리게 제안(강제 아님). */}
          {!stageSuggestDismissed &&
            opinions.some((o) => o.released_at) &&
            (STEP_ORDER[currentCaseStatus] || 0) < STEP_ORDER.hospital_review && (
              <div className="mt-3 flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <span className="text-xs text-amber-800">
                  소견을 에이전시에 공개했어요 — 보통은 환자·에이전시가 이걸 보고 판단하는 &apos;사전상담&apos; 단계예요.
                </span>
                <button
                  onClick={() => advanceStage("pre_consult")}
                  disabled={advancingStage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {advancingStage ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />} {STEP_LABEL.pre_consult}
                </button>
                <button
                  onClick={() => advanceStage("hospital_review")}
                  disabled={advancingStage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                  title="병원이 아직 치료 가능 여부 자체를 확인 중인 경우에만"
                >
                  <ArrowRight size={11} /> {STEP_LABEL.hospital_review}
                </button>
                <button
                  onClick={() => setStageSuggestDismissed(true)}
                  className="text-xs text-gray-400 hover:underline ml-auto"
                >
                  넘어가기
                </button>
              </div>
            )}
        </>
      )}
    </div>
  );
}

const LANG_LABEL = { en: "영어", ru: "러시아어", kz: "카자흐어", zh: "중국어", ja: "일본어" };

function OpinionItem({ opinion, patientLang }) {
  const [attr, setAttr] = useState(opinion.attribution_note || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [released, setReleased] = useState(!!opinion.released_at);
  // 접수 시점에 서버가 이미 환자 언어로 자동 번역해둔 초안(auto_translated_text)이 있으면 그걸 기본값으로.
  // 없으면(번역 실패·미지원 언어·아직 처리 중) 원문(한글) 폴백 — 아래 "다시 번역" 버튼으로 수동 재시도 가능.
  const [draft, setDraft] = useState(opinion.released_text || opinion.auto_translated_text || opinion.opinion_text || "");
  const [releasing, setReleasing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");
  const canAiTranslate = LANG_LABEL[patientLang];
  const preTranslated = !opinion.released_at && !!opinion.auto_translated_text;

  // 재번역 — 원문(한글)을 다시 환자 언어로 번역해 draft 를 덮어씀(코디 교정 전 초기화 용도).
  const aiTranslate = async () => {
    if (!opinion.opinion_text?.trim()) return;
    setTranslating(true);
    setTranslateError("");
    try {
      const res = await authFetch(`/api/coordinator/opinions/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: opinion.opinion_text, lang: patientLang }),
      });
      const data = await res.json();
      if (data.ok) setDraft(data.translated);
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
        <span className="text-[11px] text-gray-400">{fmt(opinion.created_at)}</span>
        {released && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">에이전시 공개됨</span>
        )}
      </div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <p className="text-xs text-gray-400">
          {opinion.file_path ? "원장님 원문 — AI 번역 초안(내부용, 에이전시에 안 보임)" : "원장님 원문 (내부용, 에이전시에 안 보임)"}
        </p>
        {opinion.attached_files?.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {opinion.attached_files.map((f, i) => f.url && (
              <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:underline shrink-0">
                <Paperclip size={11} /> {f.name || `원본 ${i + 1}`}
              </a>
            ))}
          </div>
        ) : opinion.file_url && (
          <a href={opinion.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:underline shrink-0">
            <Paperclip size={11} /> 원본 파일 ({opinion.file_name || "첨부"})
          </a>
        )}
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{opinion.opinion_text}</p>

      {/* 에이전시 공개 — 접수 시점에 이미 AI 초벌 번역(환자 언어) 완료 → 코디 교정 → 공개해야만 노출 */}
      <div className="mt-3 bg-blue-50/40 border border-blue-100 rounded-lg p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[11px] text-blue-700">
            에이전시에 보낼 확정본{canAiTranslate ? ` (환자 언어: ${LANG_LABEL[patientLang]})` : ""}
            {preTranslated ? " — AI가 자동 번역해뒀습니다, 확인·교정 후 공개" : " — 직접 교정 후 공개"}
          </p>
          {canAiTranslate && !released && (
            <button
              onClick={aiTranslate}
              disabled={translating || !opinion.opinion_text?.trim()}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline disabled:opacity-50"
            >
              {translating && <Loader2 size={11} className="animate-spin" />}
              {translating ? "번역 중…" : "다시 번역"}
            </button>
          )}
        </div>
        {translateError && <p className="text-[11px] text-red-600 mb-1">{translateError}</p>}
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
