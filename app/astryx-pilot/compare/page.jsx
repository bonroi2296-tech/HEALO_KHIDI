"use client";

import { useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Divider } from "@astryxdesign/core/Divider";

// ⚠️ A/B 비교용. 같은 내용(예시 데이터)을 우리 현재 톤 vs Astryx로 렌더.
// 병원·숫자는 전부 예시(의료 광고법 — 실제 성과 아님).
const HOSPITALS = [
  {
    name: "국립암센터 협진팀",
    specialty: "폐암·위암 다학제",
    badges: [
      { label: "유치기관 등록", tone: "success" },
      { label: "다학제 협진", tone: "gray" },
    ],
    desc: "폐암·위암 중심 다학제 진료. 러시아어·카자흐어 통역 코디네이터가 초진부터 사후관리까지 동행합니다.",
    stats: [{ n: "8", unit: "협진 전문의" }, { n: "12", unit: "지원 언어 채널" }],
  },
  {
    name: "서울권 대학병원 종양내과",
    specialty: "유방암·부인암",
    badges: [{ label: "유치기관 등록", tone: "success" }],
    desc: "유방암 2차 소견과 항암 일정 조율에 강점. 영상 협진으로 내한 전 치료 방향을 먼저 확인합니다.",
    stats: [{ n: "3", unit: "영업일 내 배정" }, { n: "6", unit: "지원 언어" }],
  },
  {
    name: "양·한방 통합 케어센터",
    specialty: "치료 후 회복·완화",
    badges: [{ label: "통합의학", tone: "gray" }],
    desc: "항암 치료 중·후 회복과 증상 완화를 양·한방 협진으로 관리. KHIDI 과제의 통합 케어 모델 시범 대상.",
    stats: [{ n: "24", unit: "주 케어 프로그램" }],
  },
];

/* ============================================================
 * ① 우리 현재 톤 (Tailwind + DESIGN.md 토큰)
 *    teal-600 / rounded-xl / shadow-sm / system font / tabular-nums
 * ============================================================ */
function OursVersion() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-5 py-10 md:py-14">
        {/* 헤더 */}
        <div className="space-y-3">
          <span className="inline-block rounded-full bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1">
            우리 현재 톤 · teal
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            한국 종양 병원 원격협진 매칭
          </h1>
          <p className="text-base text-gray-600 max-w-2xl">
            카자흐스탄·러시아 암환자를 한국 종양 병원과 연결합니다. 내한 전 영상
            협진으로 치료 방향을 먼저 확인하세요.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 transition-all duration-200">
              상담 신청하기
            </button>
            <button className="rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold px-6 py-3 transition-all duration-200">
              협진 절차 보기
            </button>
          </div>
        </div>

        <hr className="my-10 border-gray-200" />

        {/* 병원 목록 */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5">
          협진 가능 병원 (예시)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HOSPITALS.map((h) => (
            <div
              key={h.name}
              className="rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-5"
            >
              <h3 className="text-lg font-bold text-gray-900">{h.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{h.specialty}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {h.badges.map((b) => (
                  <span
                    key={b.label}
                    className={
                      "rounded-full text-xs font-medium px-2.5 py-1 " +
                      (b.tone === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600")
                    }
                  >
                    {b.label}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{h.desc}</p>
              <div className="flex gap-5 mt-4">
                {h.stats.map((s) => (
                  <div key={s.unit}>
                    <div className="text-xl font-bold text-gray-900 tabular-nums">
                      {s.n}
                    </div>
                    <div className="text-xs text-gray-500">{s.unit}</div>
                  </div>
                ))}
              </div>
              <button className="mt-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 transition-all duration-200">
                병원 상세
              </button>
            </div>
          ))}
        </div>

        <hr className="my-10 border-gray-200" />

        {/* 상담 신청 폼 */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5">상담 신청</h2>
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 max-w-xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                placeholder="홍길동"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">문의 내용</label>
              <textarea
                rows={3}
                placeholder="진단명·희망 병원·현재 상태 등을 적어주세요."
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 transition-all duration-200">
                신청 보내기
              </button>
              <button className="rounded-xl text-gray-500 hover:bg-gray-100 font-semibold px-4 py-2.5 transition-all duration-200">
                초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * ② Astryx (teal 테마)
 * ============================================================ */
function AstryxVersion() {
  return (
    <div
      data-astryx-theme="neutral"
      style={{ background: "var(--color-background-body)", minHeight: "100vh" }}
    >
      <div style={{ maxWidth: 1024, margin: "0 auto", padding: "40px 20px 56px" }}>
        <VStack gap={6} align="stretch">
          <VStack gap={3} align="start">
            <Badge label="Astryx · teal 테마" />
            <Heading level={1}>한국 종양 병원 원격협진 매칭</Heading>
            <Text type="large" color="secondary">
              카자흐스탄·러시아 암환자를 한국 종양 병원과 연결합니다. 내한 전 영상
              협진으로 치료 방향을 먼저 확인하세요.
            </Text>
            <HStack gap={2}>
              <Button label="상담 신청하기" variant="primary" size="lg" />
              <Button label="협진 절차 보기" variant="secondary" size="lg" />
            </HStack>
          </VStack>

          <Divider />

          <VStack gap={4} align="stretch">
            <Heading level={2}>협진 가능 병원 (예시)</Heading>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {HOSPITALS.map((h) => (
                <Card key={h.name} variant="default" padding={5}>
                  <VStack gap={3} align="start">
                    <VStack gap={1} align="start">
                      <Heading level={3}>{h.name}</Heading>
                      <Text type="label" color="secondary">
                        {h.specialty}
                      </Text>
                    </VStack>
                    <HStack gap={2} style={{ flexWrap: "wrap" }}>
                      {h.badges.map((b) => (
                        <Badge
                          key={b.label}
                          label={b.label}
                          variant={b.tone === "success" ? "success" : "gray"}
                        />
                      ))}
                    </HStack>
                    <Text type="body" color="secondary">
                      {h.desc}
                    </Text>
                    <HStack gap={5}>
                      {h.stats.map((s) => (
                        <VStack key={s.unit} gap={0} align="start">
                          <Text size="xl" weight="bold" hasTabularNumbers>
                            {s.n}
                          </Text>
                          <Text type="label" color="secondary">
                            {s.unit}
                          </Text>
                        </VStack>
                      ))}
                    </HStack>
                    <Button label="병원 상세" variant="secondary" size="sm" />
                  </VStack>
                </Card>
              ))}
            </div>
          </VStack>

          <Divider />

          <VStack gap={4} align="stretch">
            <Heading level={2}>상담 신청</Heading>
            <Card variant="muted" padding={6}>
              <div style={{ maxWidth: 520 }}>
                <VStack gap={4} align="stretch">
                  <TextInput label="이름" placeholder="홍길동" value="" onChange={() => {}} />
                  <TextInput
                    label="이메일"
                    type="email"
                    placeholder="you@example.com"
                    value=""
                    onChange={() => {}}
                  />
                  <TextArea
                    label="문의 내용"
                    placeholder="진단명·희망 병원·현재 상태 등을 적어주세요."
                    value=""
                    onChange={() => {}}
                  />
                  <HStack gap={2}>
                    <Button label="신청 보내기" variant="primary" />
                    <Button label="초기화" variant="ghost" />
                  </HStack>
                </VStack>
              </div>
            </Card>
          </VStack>
        </VStack>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [view, setView] = useState("ours"); // 'ours' | 'astryx'

  return (
    <div>
      {/* 전환 바 (중립 크롬 — 어느 쪽 디자인도 아님) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "#111827",
          color: "#fff",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, opacity: 0.8 }}>같은 내용 · 디자인만 전환 →</span>
        <div style={{ display: "inline-flex", background: "#1f2937", borderRadius: 10, padding: 3 }}>
          <button
            onClick={() => setView("ours")}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: view === "ours" ? "#0d9488" : "transparent",
              color: "#fff",
            }}
          >
            우리 현재 톤
          </button>
          <button
            onClick={() => setView("astryx")}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: view === "astryx" ? "#0d9488" : "transparent",
              color: "#fff",
            }}
          >
            Astryx
          </button>
        </div>
      </div>

      {view === "ours" ? <OursVersion /> : <AstryxVersion />}
    </div>
  );
}
