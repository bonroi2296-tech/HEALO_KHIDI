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
import { EmptyState } from "@astryxdesign/core/EmptyState";

// ⚠️ 파일럿 검토용 화면. 병원·숫자는 전부 "예시 데이터"(의료 광고법 — 실제 성과 아님).
// Astryx 컴포넌트를 우리 teal 테마로 렌더해 "AI가 만든 느낌"이 사라지는지 / 유지보수 가능한지 판정한다.

const HOSPITALS = [
  {
    name: "국립암센터 협진팀",
    specialty: "폐암·위암 다학제",
    badges: [{ label: "유치기관 등록", variant: "success" }, { label: "다학제 협진" }],
    desc: "폐암·위암 중심 다학제 진료. 러시아어·카자흐어 통역 코디네이터가 초진부터 사후관리까지 동행합니다.",
    stats: [{ n: "8", unit: "협진 전문의" }, { n: "12", unit: "지원 언어 채널" }],
  },
  {
    name: "서울권 대학병원 종양내과",
    specialty: "유방암·부인암",
    badges: [{ label: "유치기관 등록", variant: "success" }],
    desc: "유방암 2차 소견(second opinion)과 항암 일정 조율에 강점. 영상 협진으로 내한 전 치료 방향을 먼저 확인합니다.",
    stats: [{ n: "3", unit: "영업일 내 배정" }, { n: "6", unit: "지원 언어" }],
  },
  {
    name: "양·한방 통합 케어센터",
    specialty: "치료 후 회복·완화",
    badges: [{ label: "통합의학", variant: "gray" }],
    desc: "항암 치료 중·후 회복과 증상 완화를 양·한방 협진으로 관리. KHIDI 과제의 통합 케어 모델 시범 대상.",
    stats: [{ n: "24", unit: "주 케어 프로그램" }],
  },
];

export default function AstryxPilotPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px 80px" }}>
      <VStack gap={6} align="stretch">
        {/* ── 헤더 ───────────────────────────────── */}
        <VStack gap={3} align="start">
          <Badge label="Astryx 파일럿 · teal 테마" />
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

        {/* ── 병원 목록 ─────────────────────────────── */}
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
                      <Badge key={b.label} label={b.label} variant={b.variant} />
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

        {/* ── 상담 신청 폼 ──────────────────────────── */}
        <VStack gap={4} align="stretch">
          <Heading level={2}>상담 신청</Heading>
          <Card variant="muted" padding={6}>
            {submitted ? (
              <EmptyState
                title="신청이 접수되었습니다"
                description="코디네이터가 1영업일 내 이메일로 협진 일정을 안내합니다. (파일럿 데모 — 실제 전송 안 함)"
                actions={
                  <Button
                    label="다시 작성"
                    variant="secondary"
                    onClick={() => setSubmitted(false)}
                  />
                }
              />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
              >
                <VStack gap={4} align="stretch">
                  <TextInput
                    label="이름"
                    placeholder="홍길동"
                    value={name}
                    onChange={(v) => setName(v)}
                  />
                  <TextInput
                    label="이메일"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(v) => setEmail(v)}
                  />
                  <TextArea
                    label="문의 내용"
                    placeholder="진단명·희망 병원·현재 상태 등을 적어주세요."
                    value={message}
                    onChange={(v) => setMessage(v)}
                  />
                  <HStack gap={2}>
                    <Button label="신청 보내기" variant="primary" type="submit" />
                    <Button
                      label="초기화"
                      variant="ghost"
                      onClick={() => {
                        setName("");
                        setEmail("");
                        setMessage("");
                      }}
                    />
                  </HStack>
                </VStack>
              </form>
            )}
          </Card>
        </VStack>
      </VStack>
    </div>
  );
}
