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
import { Table } from "@astryxdesign/core/Table";

// ⚠️ 백오피스 파일럿(정보밀도 화면) — Astryx의 콤팩트/테이블 강점 검증용.
// 환자명은 전부 마스킹 예시(DESIGN.md medical_ui: PII 마스킹). 실데이터 아님.
const STATUS = {
  booked: { label: "예약됨", variant: "gray" },
  live: { label: "진행중", variant: "success" },
  done: { label: "완료", variant: "gray" },
  canceled: { label: "취소", variant: "error" },
};

const ROWS = [
  { id: "c1", patient: "A. K****", hospital: "국립암센터 협진팀", coord: "강O영", when: "2026-07-08 14:00 KST", status: "booked" },
  { id: "c2", patient: "М. Аб****", hospital: "서울권 대학병원 종양내과", coord: "이O나", when: "2026-07-08 16:30 KST", status: "live" },
  { id: "c3", patient: "S. Ким****", hospital: "양·한방 통합 케어센터", coord: "강O영", when: "2026-07-07 11:00 KST", status: "done" },
  { id: "c4", patient: "D. Nur****", hospital: "국립암센터 협진팀", coord: "박O호", when: "2026-07-09 10:00 KST", status: "booked" },
  { id: "c5", patient: "A. Zh****", hospital: "서울권 대학병원 종양내과", coord: "이O나", when: "2026-07-06 15:00 KST", status: "canceled" },
  { id: "c6", patient: "T. Bek****", hospital: "국립암센터 협진팀", coord: "박O호", when: "2026-07-09 13:30 KST", status: "booked" },
];

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "booked", label: "예약됨" },
  { key: "live", label: "진행중" },
  { key: "done", label: "완료" },
];

export default function BackofficePilotPage() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const rows = ROWS.filter((r) => {
    const okStatus = filter === "all" || r.status === filter;
    const okQ =
      !q ||
      r.patient.toLowerCase().includes(q.toLowerCase()) ||
      r.hospital.toLowerCase().includes(q.toLowerCase());
    return okStatus && okQ;
  });

  const columns = [
    { key: "patient", header: "환자(마스킹)", renderCell: (r) => <Text type="body" weight="medium">{r.patient}</Text> },
    { key: "hospital", header: "병원" },
    { key: "coord", header: "담당 코디" },
    { key: "when", header: "예약일시", renderCell: (r) => <Text hasTabularNumbers>{r.when}</Text> },
    {
      key: "status",
      header: "상태",
      renderCell: (r) => <Badge label={STATUS[r.status].label} variant={STATUS[r.status].variant} />,
    },
    {
      key: "action",
      header: "",
      align: "end",
      renderCell: (r) =>
        r.status === "live" ? (
          <Button label="입장" variant="primary" size="sm" />
        ) : (
          <Button label="상세" variant="secondary" size="sm" />
        ),
    },
  ];

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 64px" }}>
      <VStack gap={5} align="stretch">
        {/* 헤더 */}
        <HStack justify="between" align="center" style={{ flexWrap: "wrap", gap: 12 }}>
          <VStack gap={1} align="start">
            <Heading level={2}>상담 관리</Heading>
            <Text type="label" color="secondary">
              원격협진 상담 예약·진행 현황 (백오피스 · 예시 데이터)
            </Text>
          </VStack>
          <Button label="상담 생성" variant="primary" />
        </HStack>

        {/* 필터 바 */}
        <Card variant="muted" padding={3}>
          <HStack justify="between" align="center" style={{ flexWrap: "wrap", gap: 12 }}>
            <HStack gap={2} style={{ flexWrap: "wrap" }}>
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  label={f.label}
                  size="sm"
                  variant={filter === f.key ? "primary" : "ghost"}
                  onClick={() => setFilter(f.key)}
                />
              ))}
            </HStack>
            <div style={{ minWidth: 240 }}>
              <TextInput
                label="검색"
                isLabelHidden
                placeholder="환자·병원 검색"
                value={q}
                onChange={(v) => setQ(v)}
                size="sm"
              />
            </div>
          </HStack>
        </Card>

        {/* 테이블 */}
        <Card variant="default" padding={0}>
          <Table
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            dividers="rows"
            hasHoverHighlight
          />
        </Card>

        <Text type="label" color="secondary">
          총 {rows.length}건 표시 · 환자명은 마스킹 예시(실데이터 아님)
        </Text>
      </VStack>
    </div>
  );
}
