"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * AI 상태 한눈에 — 비개발자(PO)용 쉬운 요약 화면.
 * 기존 /admin/khidi/ai-quality(엔지니어용 상세)의 데이터를 그대로 쓰되,
 * 영어·전문용어·JSON 없이 한국어 신호등으로만 보여준다.
 */

// 채점 시스템이 붙이는 영문 flag → 비개발자도 아는 한국어 한 줄
const FLAG_KO = {
  hallucination: "없는 사실을 지어냄",
  medical_diagnosis: "병을 진단함 (하면 안 됨)",
  fabricated_hospital: "등록 안 된 병원을 언급",
  off_topic: "질문과 동떨어진 답",
  unsafe_advice: "위험한 의료 조언",
  fabricated_price: "근거 없는 가격을 말함",
  treatment_recommendation: "치료법을 단정·권유함",
  drug_advice: "약·용량을 안내함 (하면 안 됨)",
  prognosis_claim: "생존율·완치율을 단정함",
  scan_interpretation: "검사 결과를 직접 판독함",
  cure_claim: "완치된다고 표현함",
  anecdotal_guarantee: "남의 사례로 결과를 보장함",
};

function flagToKo(flag) {
  return FLAG_KO[flag] || flag;
}

// 평균 점수(0~1) → 신호등 상태
function statusOf(avg) {
  if (avg == null) return { tone: "gray", emoji: "⚪", label: "데이터 없음", desc: "아직 살펴본 답변이 없어요." };
  if (avg >= 0.8) return { tone: "green", emoji: "🟢", label: "좋음", desc: "AI가 손님에게 답변을 잘 하고 있어요." };
  if (avg >= 0.65) return { tone: "amber", emoji: "🟡", label: "주의", desc: "대체로 괜찮지만, 가끔 아쉬운 답변이 있어요." };
  return { tone: "red", emoji: "🔴", label: "점검 필요", desc: "답변 품질이 낮아요. 아래 문제 답변을 확인해 주세요." };
}

const TONE_BG = {
  green: "bg-emerald-50 border-emerald-200",
  amber: "bg-amber-50 border-amber-200",
  red: "bg-red-50 border-red-200",
  gray: "bg-gray-50 border-gray-200",
};
const TONE_TEXT = {
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-red-600",
  gray: "text-gray-500",
};

// "이렇게 답했어야 해" — PO가 올바른 답을 직접 적어 AI에게 가르치는 박스(카드별 자체 상태).
// 박스를 열면 AI가 '이상적인 답변 초안'을 먼저 채워줌 → PO는 고치기만 하면 됨.
function TeachBox({ item }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | done | error
  const [suggesting, setSuggesting] = useState(false);

  const fetchSuggestion = async () => {
    setSuggesting(true);
    try {
      const res = await fetch("/api/admin/playbook/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: item.query_text }),
      });
      const json = await res.json();
      if (json.ok && json.suggestion) setText(json.suggestion);
    } catch {
      /* 실패해도 빈칸으로 직접 작성 가능 */
    } finally {
      setSuggesting(false);
    }
  };

  const openBox = () => {
    setOpen(true);
    fetchSuggestion(); // 열자마자 AI 초안 받아오기
  };

  const submit = async () => {
    const answer = text.trim();
    if (!answer) return;
    setState("saving");
    try {
      const res = await fetch("/api/admin/playbook/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: item.query_text,
          answer,
          evaluation_id: item.id,
          thread_id: item.thread_id,
        }),
      });
      const json = await res.json();
      setState(json.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2">
        ✅ AI에게 가르쳤어요. 다음부터 비슷한 질문엔 이 답을 참고합니다.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={openBox}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-3 py-1.5 transition"
      >
        ✏️ 이렇게 답했어야 해 (AI 가르치기)
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {suggesting ? "🤖 AI가 추천 초안을 쓰는 중…" : "🤖 AI 추천 초안이에요. 고쳐서 저장하세요."}
        </span>
        <button
          onClick={fetchSuggestion}
          disabled={suggesting}
          className="text-xs text-teal-700 hover:text-teal-800 disabled:opacity-50"
        >
          다시 추천
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={suggesting ? "AI가 초안을 작성하고 있어요…" : "이 질문에 AI가 했어야 할 올바른 답을 적어주세요. (AI 초안을 고치거나, 직접 새로 써도 됩니다.)"}
        rows={5}
        maxLength={2000}
        className="w-full text-sm rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={state === "saving" || !text.trim()}
          className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-4 py-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === "saving" ? "가르치는 중…" : "저장하고 가르치기"}
        </button>
        <button
          onClick={() => { setOpen(false); setText(""); setState("idle"); }}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5"
        >
          취소
        </button>
        {state === "error" && <span className="text-sm text-red-600">저장 실패 — 잠시 후 다시 시도해 주세요.</span>}
      </div>
      <p className="text-xs text-gray-500">
        저장하면 개인정보는 자동 제거되고, AI의 의료 안전 규칙(진단·가격 단정 금지 등)은 그대로 적용됩니다.
      </p>
    </div>
  );
}

function StatCard({ label, value, sub, tone }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${tone ? TONE_TEXT[tone] : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AiStatusPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/khidi/ai-quality");
      const json = await res.json();
      if (json.ok) setData(json);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-56" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 lg:p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">AI 상태 한눈에</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          정보를 불러오지 못했어요. 잠시 후 새로고침 해주세요.
          <button onClick={fetchData} className="ml-2 underline">다시 시도</button>
        </div>
      </div>
    );
  }

  const { summary, low_score_items } = data;
  const avg = summary?.avg_overall ?? null;
  const st = statusOf(avg);
  const scoreText = avg != null ? `${Math.round(avg * 100)}점` : "—";
  const total = summary?.total_count ?? 0;
  const lowCount = summary?.low_score_count ?? 0;
  const lowRate = summary?.low_score_rate ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">AI 상태 한눈에</h1>
        <p className="text-sm text-gray-500 mt-1">복잡한 건 몰라도 돼요. 이 화면만 가끔 보면 됩니다. (최근 2주 기준)</p>
      </div>

      {/* 큰 신호등 카드 */}
      <div className={`rounded-2xl border p-6 ${TONE_BG[st.tone]}`}>
        <div className="flex items-center gap-4">
          <span className="text-5xl leading-none">{st.emoji}</span>
          <div>
            <p className={`text-2xl font-bold ${TONE_TEXT[st.tone]}`}>{st.label}</p>
            <p className="text-sm text-gray-600 mt-0.5">{st.desc}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/60 flex items-baseline gap-2">
          <span className="text-sm text-gray-500">AI 답변 점수</span>
          <span className={`text-3xl font-bold ${TONE_TEXT[st.tone]}`}>{scoreText}</span>
          <span className="text-sm text-gray-500">/ 100점</span>
        </div>
      </div>

      {/* 쉬운 숫자 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="살펴본 답변" value={`${total.toLocaleString()}개`} sub="최근 2주 동안" />
        <StatCard
          label="문제 있던 답변"
          value={`${lowCount.toLocaleString()}개`}
          sub={`전체의 ${lowRate}%`}
          tone={lowRate >= 15 ? "red" : lowRate >= 5 ? "amber" : "green"}
        />
        <StatCard label="자동 개선 기능" value="켜짐 🟢" sub="매일 밤 자동 점검" />
      </div>

      {/* 문제 있던 답변 목록 */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">문제 있던 답변 살펴보기</h2>
        <p className="text-xs text-gray-500 mb-3">점수가 낮았던 답변이에요. 어떤 답이 아쉬웠는지 직접 볼 수 있어요.</p>

        {(!low_score_items || low_score_items.length === 0) ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm">
            🎉 최근 2주간 문제된 답변이 없어요.
          </div>
        ) : (
          <div className="space-y-3">
            {low_score_items.map((item) => {
              const score = Math.round((item.overall_score ?? 0) * 100);
              const flags = Array.isArray(item.flags) ? item.flags : [];
              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("ko-KR") : ""}
                    </span>
                    <span className={`text-sm font-bold ${score < 40 ? "text-red-600" : "text-amber-600"}`}>
                      {score}점 {score < 40 ? "🔴" : "🟡"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-900">
                    <span className="text-gray-500">손님 질문 · </span>
                    {item.query_text}
                  </p>
                  <p className="text-sm text-gray-600 mt-1.5 line-clamp-3">
                    <span className="text-gray-500">AI 답변 · </span>
                    {item.response_text}
                  </p>

                  {item.judge_reasoning && (
                    <p className="text-sm text-gray-700 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-gray-500">왜 낮았나 · </span>
                      {item.judge_reasoning}
                    </p>
                  )}

                  {flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {flags.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600 border border-red-100">
                          {flagToKo(f)}
                        </span>
                      ))}
                    </div>
                  )}

                  <TeachBox item={item} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 엔지니어용 링크 (작게) */}
      <div className="pt-2 text-xs text-gray-500">
        🔧 더 자세한 기술 화면:{" "}
        <a href="/admin/khidi/ai-quality" className="underline hover:text-gray-600">상세 품질 데이터</a>
        {" · "}
        <a href="/admin/automation/playbook" className="underline hover:text-gray-600">자동화 정비실</a>
        <span>(메뉴 숨김 — 이 링크로만 접근)</span>
      </div>
    </div>
  );
}
