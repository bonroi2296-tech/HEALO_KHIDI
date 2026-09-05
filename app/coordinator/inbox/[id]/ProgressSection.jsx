"use client";

/**
 * 코디 인박스 상세 — «사후관리 경과» 블록 (코디·어드민 전용).
 *
 * 왜 (2026-08-25): 경과 기록(검사결과·영상·소견)은 2026-06 부터 쌓을 수 있었지만
 *   **보는 화면이 없었다.** 해외 의료기관은 자기가 올린 것만, 관리자 계정은 API 로만 볼 수
 *   있었고, 케이스를 실제로 끌고 가는 코디 화면에는 타임라인에 「경과 업로드」 한 줄만 떴다
 *   — 무엇이 올라왔는지는 못 열었다. 공고 ICT ④의 「수집·저장」은 담당자가 열람할 수 있어야
 *   충족이다.
 *
 * 읽기 전용이다. 올리는 쪽은 두 곳 — 해외 의료기관 포털(/agency)과 환자 화면(/patient/symptoms).
 * 파일 링크는 1시간짜리 서명 주소라 새로고침하면 다시 발급된다.
 *
 * 자체 완결형(부모는 한 줄만 삽입).
 */

import { useState, useEffect, useCallback } from "react";
import { Activity, FileText, Loader2, RefreshCw, Download } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useDateLocale } from "@/lib/i18n/coordinator";

const UPLOADER_LABEL = {
  medical_institution: "해외 의료기관",
  patient: "환자 본인",
};

async function authFetch(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

export default function ProgressSection({ inquiryId }) {
  const loc = useDateLocale();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authFetch(`/api/khidi/progress?inquiryId=${inquiryId}`);
      const d = await res.json();
      if (d.ok) setItems(d.records || []);
      else setErr("경과 기록을 불러오지 못했습니다.");
    } catch {
      setErr("경과 기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Activity size={16} className="text-teal-700" />
          사후관리 경과 {items.length > 0 && <span className="text-gray-500 font-normal">({items.length})</span>}
        </h3>
        <button
          type="button"
          onClick={load}
          className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
        >
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">
        해외 의료기관·환자가 올린 검사결과·영상·소견. 파일 링크는 1시간 뒤 만료됩니다.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500 inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> 불러오는 중
        </p>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">아직 올라온 경과가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">
                  {r.record_type_label}
                </span>
                <span className="text-[11px] text-gray-500">
                  {UPLOADER_LABEL[r.uploader_role] || r.uploader_role || "—"}
                </span>
                <span className="text-[11px] text-gray-500 ml-auto">
                  {new Date(r.created_at).toLocaleString(loc)}
                </span>
              </div>
              {r.note && <p className="text-sm text-gray-700 whitespace-pre-wrap mb-1">{r.note}</p>}
              {r.file_name && (
                <a
                  href={r.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 text-sm ${r.url ? "text-teal-700 hover:underline" : "text-gray-500 pointer-events-none"}`}
                >
                  <FileText size={14} />
                  {r.file_name}
                  {r.url && <Download size={13} />}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
