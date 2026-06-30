"use client";

import { useState, useEffect, useCallback } from "react";
import { ExternalLink, Activity, DollarSign, Database, RefreshCw } from "lucide-react";

// ============================================================
// 외부 서비스 사용량 — 무료 한도/유료 임계 + 제미나이 실시간 비용
// 데이터: /api/admin/usage
// ============================================================

const SURFACE_LABELS = {
  public_chat: "공개 AI 상담",
  consult_translate: "실시간 통역",
  consult_stt: "음성 인식(STT)",
  judge: "응답 자동평가",
  embedding: "임베딩",
  other: "기타",
};

function usd(n) {
  if (n == null) return "—";
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
function num(n) {
  return n == null ? "—" : Number(n).toLocaleString();
}

const CATEGORY_TONE = {
  AI: "bg-teal-50 text-teal-700 border-teal-200",
  "백엔드 · DB": "bg-blue-50 text-blue-700 border-blue-200",
  호스팅: "bg-violet-50 text-violet-700 border-violet-200",
  영상: "bg-amber-50 text-amber-700 border-amber-200",
  모니터링: "bg-gray-50 text-gray-600 border-gray-200",
};

function StatTile({ label, value, sub, tone = "gray" }) {
  const toneText = { teal: "text-teal-700", amber: "text-amber-600", gray: "text-gray-900" }[tone];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${toneText}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function UsagePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usage", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) {
        setError(json.detail ?? json.error ?? "알 수 없는 오류");
        return;
      }
      setData(json);
    } catch {
      setError("서버 연결 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const gemini = data?.live?.gemini;
  const dbAct = data?.live?.db_activity;
  const services = data?.services ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">💳 외부 서비스 사용량</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            지금 무엇을 얼마나 쓰는지 · 언제부터 돈이 나가는지 (현재는 대부분 무료 한도 내)
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "조회 중" : "새로고침"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">오류: {error}</div>
      )}

      {/* 제미나이 비용 (실측) */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
          <DollarSign size={15} className="text-teal-600" /> 제미나이 API 비용 <span className="text-gray-400 font-normal">· 실측(추정 단가)</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="이번 달 누적 비용" value={loading ? "—" : usd(gemini?.month?.costUsd)} sub={`호출 ${num(gemini?.month?.calls)}회`} tone="teal" />
          <StatTile label="월말 예상 비용" value={loading ? "—" : usd(gemini?.projectedMonthCost)} sub="현재 속도 기준 추정" tone="amber" />
          <StatTile label="오늘 비용" value={loading ? "—" : usd(gemini?.today?.costUsd)} sub={`호출 ${num(gemini?.today?.calls)}회`} />
          <StatTile label="이번 달 토큰" value={loading ? "—" : num(gemini?.month?.totalTokens)} sub="입력+출력 합" />
        </div>

        {/* 표면별 분해 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">이번 달 용도별 분해</h3>
          {gemini?.bySurface?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-2 font-medium">용도</th>
                    <th className="py-2 font-medium text-right">호출</th>
                    <th className="py-2 font-medium text-right">토큰</th>
                    <th className="py-2 font-medium text-right">추정 비용</th>
                  </tr>
                </thead>
                <tbody>
                  {gemini.bySurface.map((r) => (
                    <tr key={`${r.surface}-${r.model}`} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-700">{SURFACE_LABELS[r.surface] ?? r.surface}</td>
                      <td className="py-2 text-right text-gray-600">{num(r.calls)}</td>
                      <td className="py-2 text-right text-gray-600">{num(r.totalTokens)}</td>
                      <td className="py-2 text-right font-medium text-gray-800">{usd(r.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              {loading ? "로딩 중..." : "이번 달 AI 호출 기록이 아직 없습니다. (계측은 다음 AI 응답부터 쌓입니다)"}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-3">
            ⚠️ 비용은 <b>추정치</b>입니다. gemini-flash-latest 는 별칭이라 실제 단가가 바뀔 수 있어요 —
            정확한 청구는 Google 콘솔 기준. 0순위 안전장치는 콘솔 spend cap 입니다.
          </p>
        </div>
      </div>

      {/* DB 활동량 */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
          <Database size={15} className="text-blue-600" /> 데이터베이스 활동량 <span className="text-gray-400 font-normal">· 성장 신호</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="누적 문의" value={loading ? "—" : num(dbAct?.inquiriesTotal)} />
          <StatTile label="누적 상담 세션" value={loading ? "—" : num(dbAct?.consultationSessionsTotal)} />
          <StatTile label="이번 달 AI 호출" value={loading ? "—" : num(dbAct?.aiCallsThisMonth)} />
          <StatTile label="누적 채팅 메시지" value={loading ? "—" : num(dbAct?.chatMessagesTotal)} />
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          DB 용량(500MB)·MAU(5만)·대역폭 같은 무료 한도는 Supabase 콘솔에서 확인하세요(아래 카드 링크). 여기 수치는 성장 추세 신호용입니다.
        </p>
      </div>

      {/* 서비스별 카드 */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
          <Activity size={15} className="text-gray-500" /> 서비스별 플랜 · 무료 한도 · 유료 시작점
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{s.name}</h3>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CATEGORY_TONE[s.category] ?? CATEGORY_TONE["모니터링"]}`}>
                      {s.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{s.what}</p>
                </div>
                {s.measure === "live" && (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                    ● 실측
                  </span>
                )}
              </div>

              <dl className="text-xs space-y-1.5 mt-1">
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-20 shrink-0">현재 플랜</dt>
                  <dd className="text-gray-700 font-medium">{s.plan}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-20 shrink-0">무료 한도</dt>
                  <dd className="text-gray-600">{s.freeTier}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-20 shrink-0">유료 시작점</dt>
                  <dd className="text-gray-600">{s.paidTrigger}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-20 shrink-0">유료 단가</dt>
                  <dd className="text-gray-600">{s.paidPrice}</dd>
                </div>
              </dl>

              <a
                href={s.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 self-start"
              >
                콘솔에서 실제 사용량 확인 <ExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
        ※ 무료 한도·유료 단가는 참고치입니다(벤더가 수시로 변경). 정확한 값·청구는 각 서비스 콘솔에서 확인하세요.
        {data?.generatedAt && ` · 조회 ${new Date(data.generatedAt).toLocaleString("ko-KR")}`}
      </p>
    </div>
  );
}
