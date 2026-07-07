"use client";

// ⚠️ A/B 파일럿: 실제 홈(app/home/HomeClient.jsx)과 "같은 내용"을 Astryx로 렌더.
// 목적 = 디자인 시스템만 유일 변수로 두고 실제 현재 홈과 육안 비교(PO가 두 탭 열고).
// 한국어 전용(파일럿). 의료진·병원 이미지는 public/ 실제 파일 그대로 사용.
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";

const STATS = [
  { value: "78.4%", label: "위암 5년 생존율 (세계 1위)" },
  { value: "201만+", label: "2025 외국인 환자 한국 방문" },
  { value: "60~80%", label: "미국 대비 치료비 절감" },
  { value: "Top 10", label: "의료 시설 품질 세계 순위" },
];

const DOCTORS = [
  { name: "황이준 대표원장", title: "면력한방병원 강서점 대표원장", specialty: "한방 면역 종양학 · 통합 암 케어", img: "/immune/doctor/gangeo-dr-hwang-ijun.png" },
  { name: "유형진 대표원장", title: "면력한방병원 신촌점 대표원장", specialty: "한방 면역 치료 · 암 통합 케어", img: "/immune/doctor/sinchon-dr-yoo-hyeongjin.png" },
  { name: "배길준 대표원장", title: "면력한방병원 광명점 대표원장", specialty: "통합면역 · 암환자 케어", img: "/immune/doctor/gwangmyeong-dr-bae-giljun.png" },
  { name: "강주안 대표원장", title: "면력한방병원 성동점 대표원장", specialty: "한방내과 · 면역통합의학", img: "/immune/doctor/seongdong-dr-kang-juan.png" },
];

const SERVICES = [
  { title: "전문의 원격 상담", desc: "한국 3대 암 병원 출신 전문의와 화상으로 먼저 상담." },
  { title: "6개국어 AI 통역", desc: "한·영·러·중·일·카자흐어 실시간 자동 통역." },
  { title: "양·한방 통합 케어", desc: "수술·항암은 암 병원, 면역 관리는 면력한방병원에서." },
  { title: "사후관리 프로그램", desc: "귀국 후에도 증상 추적, 교육 콘텐츠, 재진 예약까지." },
];

const PROCESS = [
  { num: "01", title: "인테이크 작성", desc: "암종, 병기, 치료 이력 입력 (5분)" },
  { num: "02", title: "전문의 상담 배정", desc: "코디네이터가 전문의 상담을 배정 (24시간 이내)" },
  { num: "03", title: "화상 사전상담", desc: "실시간 AI 통역과 함께 상담" },
  { num: "04", title: "치료 · 사후관리", desc: "한국 방문 치료 + 귀국 후 관리" },
];

const CANCERS = [
  { emoji: "🫁", label: "위암", stat: "5년 생존율 78.4%" },
  { emoji: "🩷", label: "유방암", stat: "보존율 세계 최고" },
  { emoji: "🫀", label: "간암", stat: "간이식 세계 1위" },
  { emoji: "🌬️", label: "폐암", stat: "VATS 수술 선도" },
  { emoji: "🦋", label: "갑상선암", stat: "생존율 100% 근접" },
  { emoji: "🎗️", label: "대장암", stat: "복강경 세계 최다" },
];

const PARTNERS = [
  { badge: "제휴 병원", name: "면력한방병원 강서점", desc: "강서 소재 한방 면역치료 병원", img: "/images/hospitals/immunehospital-magok/1.jpg?v=3" },
  { badge: "제휴 병원", name: "면력한방병원 신촌점", desc: "서대문구 연세로 소재", img: "/images/hospitals/immunehospital-sinchon/1.jpg?v=3" },
  { badge: "협진 대학병원", name: "이대서울병원", desc: "서울 마곡 소재 최신 대학병원", img: "/images/hospitals/ewha-seoul/1.jpg?v=3" },
  { badge: "협진 대학병원", name: "신촌세브란스병원", desc: "연세대학교 세브란스병원", img: "/images/hospitals/severance-sinchon/1.jpg?v=3" },
];

function SectionTitle({ title, subtitle }) {
  return (
    <VStack gap={2} align="center" style={{ textAlign: "center", marginBottom: 8 }}>
      <Heading level={2}>{title}</Heading>
      {subtitle && (
        <Text type="large" color="secondary">
          {subtitle}
        </Text>
      )}
    </VStack>
  );
}

export default function HomeAstryxPage() {
  const wrap = { maxWidth: 1040, margin: "0 auto", padding: "0 20px" };
  return (
    <div style={{ background: "var(--color-background-body)" }}>
      {/* ── HERO ── */}
      <section style={{ ...wrap, paddingTop: 56, paddingBottom: 40 }}>
        <VStack gap={4} align="center" style={{ textAlign: "center" }}>
          <Badge label="Astryx 버전 · 실제 홈 A/B · 한국어" />
          <Heading level={1}>
            한국 최고의 암 전문의에게
            <br />
            먼저 상담받으세요
          </Heading>
          <Text type="large" color="secondary">
            AI 실시간 통역 · 화상 사전상담 · 한방 통합 케어까지
            <br />
            한국 방문 전, 집에서 모든 것을 준비하세요
          </Text>
          <VStack gap={1} align="center">
            <Button label="무료 사전상담 신청" variant="primary" size="lg" />
            <Text type="label" color="secondary">
              5분이면 충분합니다 · 비용 무료
            </Text>
          </VStack>
        </VStack>
      </section>

      <Divider />

      {/* ── STATS ── */}
      <section style={{ ...wrap, paddingTop: 40, paddingBottom: 40 }}>
        <SectionTitle
          title="왜 한국에서 암 치료인가요?"
          subtitle="한국은 세계 최고 수준의 암 생존율과 최첨단 의료 기술을 보유하고 있습니다"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 20 }}>
          {STATS.map((s) => (
            <Card key={s.label} variant="teal" padding={5}>
              <VStack gap={1} align="center" style={{ textAlign: "center" }}>
                <Text size="2xl" weight="bold" hasTabularNumbers>
                  {s.value}
                </Text>
                <Text type="label" color="secondary">
                  {s.label}
                </Text>
              </VStack>
            </Card>
          ))}
        </div>
      </section>

      {/* ── DOCTORS ── */}
      <section style={{ ...wrap, paddingTop: 40, paddingBottom: 40 }}>
        <SectionTitle title="협력 의료진" subtitle="한국 주요 암 전문 병원에서 다년간 경력을 쌓은 전문의들이 함께합니다" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 20 }}>
          {DOCTORS.map((d) => (
            <Card key={d.name} variant="default" padding={0}>
              <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "var(--color-background-muted)" }}>
                <img src={d.img} alt={d.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ padding: 16 }}>
                <VStack gap={1} align="start">
                  <Heading level={4}>{d.name}</Heading>
                  <Text type="label" color="accent">
                    {d.title}
                  </Text>
                  <Text type="label" color="secondary">
                    {d.specialty}
                  </Text>
                </VStack>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section style={{ ...wrap, paddingTop: 40, paddingBottom: 40 }}>
        <SectionTitle title="healwith가 해드리는 일" subtitle="한국 암 치료의 모든 과정을 원스톱으로 지원합니다" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 20 }}>
          {SERVICES.map((s) => (
            <Card key={s.title} variant="default" padding={6}>
              <VStack gap={2} align="start">
                <Heading level={3}>{s.title}</Heading>
                <Text type="body" color="secondary">
                  {s.desc}
                </Text>
              </VStack>
            </Card>
          ))}
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section style={{ ...wrap, paddingTop: 40, paddingBottom: 40 }}>
        <SectionTitle title="이용 절차" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 20 }}>
          {PROCESS.map((p) => (
            <Card key={p.num} variant="muted" padding={5}>
              <VStack gap={2} align="start">
                <Text size="xl" weight="bold" color="accent" hasTabularNumbers>
                  {p.num}
                </Text>
                <Heading level={4}>{p.title}</Heading>
                <Text type="label" color="secondary">
                  {p.desc}
                </Text>
              </VStack>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CANCERS ── */}
      <section style={{ ...wrap, paddingTop: 40, paddingBottom: 40 }}>
        <SectionTitle title="주요 지원 암종" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginTop: 20 }}>
          {CANCERS.map((c) => (
            <Card key={c.label} variant="default" padding={4}>
              <VStack gap={1} align="center" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32 }}>{c.emoji}</div>
                <Text type="body" weight="bold">
                  {c.label}
                </Text>
                <Text type="label" color="accent">
                  {c.stat}
                </Text>
              </VStack>
            </Card>
          ))}
        </div>
      </section>

      {/* ── PARTNERS ── */}
      <section style={{ ...wrap, paddingTop: 40, paddingBottom: 40 }}>
        <SectionTitle title="제휴·협진 병원" subtitle="healwith와 함께하는 제휴 병원 및 협진 대학병원" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
          {PARTNERS.map((h) => (
            <Card key={h.name} variant="default" padding={0}>
              <div style={{ aspectRatio: "16 / 10", overflow: "hidden", background: "var(--color-background-muted)" }}>
                <img src={h.img} alt={h.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ padding: 16 }}>
                <VStack gap={1} align="start">
                  <Badge label={h.badge} variant={h.badge === "제휴 병원" ? "success" : "gray"} />
                  <Heading level={4}>{h.name}</Heading>
                  <Text type="label" color="secondary">
                    {h.desc}
                  </Text>
                </VStack>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 하단 CTA ── */}
      <section style={{ ...wrap, paddingTop: 24, paddingBottom: 72 }}>
        <Card variant="teal" padding={8}>
          <VStack gap={3} align="center" style={{ textAlign: "center" }}>
            <Heading level={2}>지금, 집에서 첫 상담을 시작하세요</Heading>
            <Text type="large" color="secondary">
              불안한 기다림 대신, 한국 전문의의 소견을 먼저 확인하세요.
            </Text>
            <Button label="무료 사전상담 신청" variant="primary" size="lg" />
          </VStack>
        </Card>
      </section>
    </div>
  );
}
