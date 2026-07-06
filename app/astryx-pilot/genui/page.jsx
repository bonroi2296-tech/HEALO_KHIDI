"use client";

import { useState, useRef, useEffect } from "react";

// ⚠️ 개념 시연(파일럿). "챗봇이 텍스트 대신 '검증된 컴포넌트'를 상황맞춤 렌더" = DESIGN.md
// 「런타임 gen-UI 화이트리스트」의 실물. 지금은 키워드 라우팅으로 LLM의 툴 선택을 모사(비용 0).
// 실제 연결 = Vercel AI SDK(`ai` v6, 이미 설치)의 tool()이 아래 컴포넌트를 반환하게 하면 됨.
// 톤 = 우리 Tailwind teal(환자 앞단 유지). 데이터는 전부 예시(의료광고법).

/* ============================================================
 * 검증된 컴포넌트 화이트리스트 (DESIGN.md 참조)
 * ============================================================ */

// 1) 병원 비교 카드
function HospitalCompareCard() {
  const rows = [
    { name: "국립암센터 협진팀", spec: "폐암·위암 다학제", docs: "8", reg: true },
    { name: "서울권 대학병원 종양내과", spec: "유방암·부인암", docs: "6", reg: true },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
        병원 비교 (예시)
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {rows.map((h) => (
          <div key={h.name} className="p-4">
            <div className="font-bold text-gray-900 text-sm leading-snug">{h.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{h.spec}</div>
            {h.reg && (
              <span className="inline-block mt-2 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2 py-0.5">
                유치기관 등록
              </span>
            )}
            <div className="mt-3">
              <span className="text-xl font-bold text-gray-900 tabular-nums">{h.docs}</span>
              <span className="text-xs text-gray-500 ml-1">협진 전문의</span>
            </div>
            <button className="mt-3 w-full rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold py-1.5 transition-all duration-200">
              자세히
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2) 예약/상담 슬롯 피커
function BookingSlotPicker() {
  const [sel, setSel] = useState(null);
  const slots = ["07-08 14:00", "07-08 16:30", "07-09 10:00", "07-09 13:30"];
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-700">영상 협진 예약 (KST · 예시)</div>
      <div className="flex flex-wrap gap-2 mt-3">
        {slots.map((s) => (
          <button
            key={s}
            onClick={() => setSel(s)}
            className={
              "rounded-xl text-xs font-medium px-3 py-2 border transition-all duration-200 tabular-nums " +
              (sel === s
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
            }
          >
            {s}
          </button>
        ))}
      </div>
      <button
        disabled={!sel}
        className="mt-3 w-full rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-semibold py-2 transition-all duration-200"
      >
        {sel ? `${sel} KST 예약 요청` : "시간을 선택하세요"}
      </button>
    </div>
  );
}

// 3) 비용 추정 요약
function CostEstimateSummary() {
  const items = [
    { label: "초진·영상 협진", range: "무료" },
    { label: "정밀검사 패키지", range: "80–150만원" },
    { label: "1차 항암 사이클", range: "300–600만원" },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-700">비용 추정 (예시 · 공식 진료비 자료 기준)</div>
      <div className="mt-3 divide-y divide-gray-100">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">{it.label}</span>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{it.range}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        * 실제 비용은 진단·병원별 상이. 확정 견적은 상담 후 제공.
      </p>
    </div>
  );
}

// 4) 상담 채널 선택
function ChannelPicker() {
  const channels = ["WhatsApp", "Telegram", "WeChat", "LINE"];
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-700">코디네이터 연결 채널</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {channels.map((c) => (
          <button
            key={c}
            className="rounded-xl border border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-700 text-sm font-semibold py-2.5 transition-all duration-200"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * 의도 라우터 (키워드) — 실제로는 LLM 툴 선택이 이 자리를 대체
 * ============================================================ */
function routeIntent(text) {
  const t = text.toLowerCase();
  if (/비교|병원|어디|추천/.test(t)) return { kind: "hospital", reply: "조건에 맞는 병원을 비교해 드릴게요." };
  if (/예약|슬롯|상담|협진|시간/.test(t)) return { kind: "booking", reply: "가능한 영상 협진 시간이에요. 편한 시간을 골라주세요." };
  if (/비용|가격|얼마|돈|금액/.test(t)) return { kind: "cost", reply: "예상 비용 범위예요 (공식 진료비 자료 기준)." };
  if (/연락|문의|채널|톡|메시지/.test(t)) return { kind: "channel", reply: "편한 메신저로 코디네이터와 연결해 드릴게요." };
  return {
    kind: "text",
    reply: "무엇을 도와드릴까요? 아래에서 골라보셔도 돼요.",
  };
}

function defaultReplyFor(kind) {
  return (
    {
      hospital: "조건에 맞는 병원을 비교해 드릴게요.",
      booking: "가능한 영상 협진 시간이에요. 편한 시간을 골라주세요.",
      cost: "예상 비용 범위예요 (공식 진료비 자료 기준).",
      channel: "편한 메신저로 코디네이터와 연결해 드릴게요.",
    }[kind] || "무엇을 도와드릴까요?"
  );
}

function ComponentFor({ kind }) {
  if (kind === "hospital") return <HospitalCompareCard />;
  if (kind === "booking") return <BookingSlotPicker />;
  if (kind === "cost") return <CostEstimateSummary />;
  if (kind === "channel") return <ChannelPicker />;
  return null;
}

/* ============================================================
 * 모의 챗봇
 * ============================================================ */
const SUGGESTIONS = [
  "폐암 병원 비교해줘",
  "협진 예약하고 싶어",
  "비용이 얼마나 들어?",
  "코디네이터랑 연락하고 싶어",
];

export default function GenUiPilotPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "안녕하세요. 한국 종양 병원 원격협진 안내 도우미예요. 무엇이 궁금하세요?", kind: "text" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // 'llm' | 'mock' — 마지막 응답 출처
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 실제 LLM 툴콜 → kind 매핑
  const TOOL_KIND = {
    showHospitalCompare: "hospital",
    showBookingSlots: "booking",
    showCostEstimate: "cost",
    showChannelPicker: "channel",
  };

  async function send(text) {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/astryx-pilot/genui", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      if (!res.ok) throw new Error("fallback");
      const data = await res.json();
      if (!data?.ok) throw new Error("fallback");
      const call = (data.toolCalls || [])[0];
      const kind = call ? TOOL_KIND[call.name] || "text" : "text";
      const reply = data.text?.trim() || defaultReplyFor(kind);
      setMode("llm");
      setMessages((m) => [...m, { role: "assistant", text: reply, kind }]);
    } catch {
      // 키 없음/오류 → 키워드 모의로 폴백(프리뷰 안전).
      const routed = routeIntent(q);
      setMode("mock");
      setMessages((m) => [...m, { role: "assistant", text: routed.reply, kind: routed.kind }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-3">
          <span className="inline-block rounded-full bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1">
            gen-UI 파일럿
            {mode === "llm" && " · 실제 LLM(Gemini)"}
            {mode === "mock" && " · 모의 폴백(키 없음)"}
          </span>
          <p className="text-xs text-gray-400 mt-2">
            챗봇이 답을 <b>텍스트 대신 검증된 컴포넌트</b>로 렌더합니다. Gemini가 화이트리스트
            도구를 선택 → 클라이언트가 렌더(자유 UI 생성 아님). 키 없으면 키워드 모의로 폴백.
          </p>
        </div>

        {/* 메시지 */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 space-y-3 min-h-[380px]">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="rounded-2xl rounded-br-sm bg-teal-600 text-white text-sm px-3.5 py-2 max-w-[80%]">
                  {m.text}
                </div>
              ) : (
                <div className="space-y-2 max-w-[92%]">
                  <div className="rounded-2xl rounded-bl-sm bg-gray-100 text-gray-800 text-sm px-3.5 py-2 inline-block">
                    {m.text}
                  </div>
                  {m.kind && m.kind !== "text" && <ComponentFor kind={m.kind} />}
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* 추천 칩 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-gray-300 text-gray-600 hover:border-teal-500 hover:text-teal-700 text-xs px-3 py-1.5 transition-all duration-200"
            >
              {s}
            </button>
          ))}
        </div>

        {/* 입력 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 mt-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder={busy ? "생각 중…" : "메시지를 입력하세요…"}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-semibold px-5 transition-all duration-200"
          >
            {busy ? "…" : "보내기"}
          </button>
        </form>
      </div>
    </div>
  );
}
