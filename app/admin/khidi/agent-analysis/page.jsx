"use client";

/**
 * 어드민: AI 에이전트 자기분석 (마스터키 '힐로')
 *
 * 코디/PO가 채팅 스레드를 골라 "분석 실행"을 누르면, 그 스레드 전체를 모델이
 * 6하원칙(왜 그렇게 답했나 / 무슨 문제 / 어떻게 개선 도출 / 뭘 고쳐야)으로 자기점검한다.
 * 채팅창에서 '힐로'/'healo'를 치는 것과 동일한 분석을 어드민에서 실행하는 화면.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Brain, RefreshCw, Clock, Sparkles, Copy, Check,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { scrollToTopOnNarrow } from "@/lib/a11y/prefersReducedMotion";

const supabase = createSupabaseBrowserClient();

function fmtTime(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString("ko-KR", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function AgentAnalysisPage() {
  const toast = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [extra, setExtra] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }, []);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      const res = await fetch("/api/admin/chat/threads?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) {
        const list = (json.threads || []).slice().sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        );
        setThreads(list);
      } else {
        toast.error(`목록 로딩 실패: ${json.error || "unknown"}`);
      }
    } catch (_e) {
      toast.error("목록 로딩 실패");
    } finally {
      setLoading(false);
    }
  }, [getToken, toast]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const runAnalysis = async (thread) => {
    if (!thread || running) return;
    setRunning(true);
    setAnalysis("");
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/khidi/agent-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ thread_id: thread.id, extra: extra.trim() || undefined }),
      });
      const json = await res.json();
      if (json.ok) {
        setAnalysis(json.analysis || "");
        if (!json.generated) toast.info("분석을 일부만 생성했어요. 대화가 충분한지 확인해 주세요.");
      } else {
        toast.error(`분석 실패: ${json.error || "unknown"}`);
      }
    } catch (_e) {
      toast.error("분석 실패");
    } finally {
      setRunning(false);
    }
  };

  const selectThread = (thread) => {
    setSelected(thread);
    setAnalysis("");
    scrollToTopOnNarrow(); // 폰(1단 배치): 상세가 목록 «아래»라 눌러도 화면이 안 바뀌던 것
  };

  const copyAnalysis = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사 실패");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Brain size={20} className="text-teal-600" /> AI 에이전트 자기분석
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            채팅 스레드를 골라 분석을 실행하면, 그 대화에서 에이전트가 왜 그렇게 답했고 무슨 문제가
            있었는지 6하원칙으로 자기점검합니다. (채팅창에 <span className="font-semibold text-gray-700">힐로</span> 입력
            시에도 동일 분석 — 옛 트리거어 healo 는 실사용자 입력과 충돌해 제거됨)
          </p>
        </div>
        <button
          onClick={fetchThreads}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
        >
          <RefreshCw size={15} /> 새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 스레드 목록 — 폰에선 고르면 접히고 분석 결과만 보인다 */}
        <div className={`lg:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${
          selected ? "hidden lg:block" : ""
        }`}>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <RefreshCw size={18} className="animate-spin mr-2" /> 불러오는 중...
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">대화가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {threads.map((t) => {
                const active = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => selectThread(t)}
                      className={`w-full text-left px-4 py-3 transition-all duration-200 ${active ? "bg-teal-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-gray-500 truncate">#{String(t.id).slice(0, 8)}</span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1 shrink-0">
                          <Clock size={11} /> {fmtTime(t.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {t.metadata?.language && (
                          <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                            {String(t.metadata.language).toUpperCase()}
                          </span>
                        )}
                        {t.metadata?.hand_off_requested && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            핸드오프
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">{t.status}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 분석 패널 */}
        <div className={`lg:col-span-2 bg-white border border-gray-200 rounded-xl min-h-[50vh] shadow-sm ${
          selected ? "" : "hidden lg:block"
        }`}>
          {!selected ? (
            <div className="flex items-center justify-center h-full py-24 text-sm text-gray-500">
              왼쪽에서 분석할 대화를 선택하세요.
            </div>
          ) : (
            <div className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="lg:hidden shrink-0 -ml-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    ← 목록
                  </button>
                  <span className="truncate">
                    스레드 <span className="font-mono text-gray-800">#{String(selected.id).slice(0, 8)}</span>
                    <span className="text-gray-500"> · {fmtTime(selected.updated_at)}</span>
                  </span>
                </div>
                {analysis && (
                  <button
                    onClick={copyAnalysis}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    {copied ? "복사됨" : "복사"}
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="추가 지시(선택): 예) 마지막 답변만, 공감 톤 위주로, 러시아어 답변 검증"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  onKeyDown={(e) => { if (e.key === "Enter") runAnalysis(selected); }}
                />
                <button
                  onClick={() => runAnalysis(selected)}
                  disabled={running}
                  className="flex items-center justify-center gap-1.5 px-6 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {running ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {running ? "분석 중..." : "분석 실행"}
                </button>
              </div>

              {running && !analysis ? (
                <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
                  <RefreshCw size={18} className="animate-spin mr-2" /> 대화 전체를 점검하는 중...
                </div>
              ) : analysis ? (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{analysis}</p>
                </div>
              ) : (
                <div className="text-center py-16 text-sm text-gray-500">
                  "분석 실행"을 누르면 이 대화에 대한 6하원칙 자기분석이 표시됩니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
