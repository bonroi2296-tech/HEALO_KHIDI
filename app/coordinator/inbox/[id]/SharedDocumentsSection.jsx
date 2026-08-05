"use client";

/**
 * 코디 인박스 상세 — «환자에게 보낼 서류» 블록 (코디·어드민 전용).
 *
 * 왜 있나 (2026-08-05, 문의 #60): 원장님 2차 소견서·사전상담 정리본을 만들어 놓고도 **환자에게
 *   줄 통로가 없었다.** 소견 「공개」는 에이전시 화면에만 뜨는데 그 환자는 에이전시도 계정도
 *   없었다. 여기 올려서 「보이기」를 켜면 환자가 받은 진행상황 링크(/claim/<토큰>)에 뜬다.
 *
 * ⚠️ 올린다고 바로 안 나간다 — «보이기»를 켠 것만 환자에게 보인다. 그 링크는 왓츠앱으로
 *    굴러다닐 수 있어서, 실수 한 번이 곧 유출이 되지 않게 두 단계로 나눴다.
 *
 * 자체 완결형(부모 CoordinatorInboxDetailClient 는 한 줄만 삽입).
 */

import { useState, useEffect, useCallback } from "react";
import { Send, FileText, Loader2, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadDirect } from "@/lib/uploadAttachment";
import { useDateLocale } from "@/lib/i18n/coordinator";

// ponytail: 이 블록의 문구는 한국어 고정 — 옆 OpinionsSection 도 절반이 그렇다.
// 코디 화면을 러시아어로 쓰는 사람이 생기면 그때 coordinatorL 로 옮긴다.

async function authFetch(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

function fmt(iso, loc) {
  try { return new Date(iso).toLocaleString(loc || "ko-KR"); } catch { return iso; }
}

const ERR = {
  file_too_large: "파일이 너무 큽니다 (최대 50MB)",
  invalid_file_type: "PDF·워드·사진만 올릴 수 있습니다",
  invalid_file_content: "파일 내용이 확장자와 다릅니다",
  too_many_files: "서류는 20개까지입니다",
};

export default function SharedDocumentsSection({ inquiryId }) {
  const loc = useDateLocale();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/shared-documents`);
      const data = await res.json();
      if (data.ok) setDocs(data.documents || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => { load(); }, [load]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 고를 수 있게
    if (!file) return;

    setError("");
    setUploading(true);
    setProgress(0);
    const res = await uploadDirect(
      `/api/coordinator/inquiries/${inquiryId}/shared-documents`,
      file,
      {},
      { fetch: authFetch, onProgress: setProgress }
    );
    setUploading(false);
    if (!res.ok) {
      setError(ERR[res.error] || "올리지 못했습니다");
      return;
    }
    await load();
  };

  const toggle = async (doc) => {
    setBusyId(doc.id);
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/shared-documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id, visible: !doc.visible }),
      });
      const data = await res.json();
      if (data.ok) await load();
    } catch { /* silent */ } finally {
      setBusyId("");
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`「${doc.name}」을 지웁니다. 환자 화면에서도 사라집니다.`)) return;
    setBusyId(doc.id);
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/shared-documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id }),
      });
      const data = await res.json();
      if (data.ok) await load();
    } catch { /* silent */ } finally {
      setBusyId("");
    }
  };

  const shownCount = docs.filter((d) => d.visible).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
        <Send size={16} className="text-teal-700" /> 환자에게 보낼 서류
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        소견서·사전상담 정리본처럼 <b>우리가 환자에게 주는</b> 서류. 올린 뒤 「환자에게 보이기」를
        켠 것만 환자가 받은 진행상황 링크에 뜹니다. (환자가 우리에게 낸 자료는 위 「첨부」 칸입니다.)
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-3">
          <Loader2 size={15} className="animate-spin" /> 불러오는 중…
        </div>
      ) : (
        <>
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition cursor-pointer disabled:opacity-50">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? `올리는 중… ${Math.round(progress * 100)}%` : "서류 올리기"}
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={onPick}
            />
          </label>
          <p className="text-[11px] text-gray-500 mt-1.5">
            PDF·워드·사진, 한 개 50MB까지. <b>환자는 폰으로 열어봅니다 — 워드(docx)보다 PDF 가 안전합니다.</b>
          </p>
          {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}

          {docs.length > 0 && (
            <ul className="mt-3 space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                    d.visible ? "border-teal-200 bg-teal-50" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <FileText size={14} className="mt-0.5 shrink-0 text-teal-700" />
                  <div className="min-w-0 flex-1">
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm text-gray-800 hover:underline"
                      >
                        {d.name}
                      </a>
                    ) : (
                      <span className="block truncate text-sm text-gray-800">{d.name}</span>
                    )}
                    <span className="block text-[11px] text-gray-500 mt-0.5">
                      {d.visible ? `환자에게 보임 · ${fmt(d.sharedAt, loc)}` : "아직 환자에게 안 보임"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(d)}
                    disabled={busyId === d.id}
                    className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded disabled:opacity-50 ${
                      d.visible
                        ? "text-gray-600 hover:bg-gray-200"
                        : "text-white bg-teal-700 hover:bg-teal-800"
                    }`}
                  >
                    {busyId === d.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : d.visible ? (
                      <EyeOff size={12} />
                    ) : (
                      <Eye size={12} />
                    )}
                    {d.visible ? "감추기" : "환자에게 보이기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(d)}
                    disabled={busyId === d.id}
                    className="shrink-0 text-gray-500 hover:text-red-600 p-1 disabled:opacity-50"
                    aria-label="서류 지우기"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {docs.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-2">
              환자에게 보이는 서류 {shownCount}개 / 올린 것 {docs.length}개
            </p>
          )}
        </>
      )}
    </div>
  );
}
