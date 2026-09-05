#!/usr/bin/env node
/**
 * 중간보고회 «시연용» 견본 케이스 한 건을 실DB에 넣는다 (2026-08-25, PO 요청).
 *
 * 왜: 6대 ICT 화면 중 사후관리 쪽(④⑤⑥)은 실환자가 그 단계에 도달한 적이 없어 **전부 빈
 *     화면**이다. 시연에서 빈 표를 보여줄 수는 없으므로, 접수→사전상담→견적→비자→치료→
 *     사후관리(경과·증상·교육·설문·재방문 제안)까지 한 줄로 이어진 견본을 만든다.
 *
 * 🛑 실적 오염 방지 — 이 견본은 전부 `is_test = true` 다.
 *    · KPI 집계(src/lib/khidi/kpi.ts)는 is_test 를 제외하므로 유치건수·상담건수·만족도에 안 섞인다.
 *    · 코디 인박스도 기본으로 숨긴다 → 화면 오른쪽 위 「시험 문의 보기」를 켜야 보인다.
 *    · 메일은 나가지 않는다(발송 cron 은 is_test 케이스를 건너뛴다. 이 스크립트도 메일을 안 보낸다).
 *
 * 환자 계정: patient@test.com (docs/TEST_ACCOUNTS.md). 이 계정으로 로그인하면 환자 화면에서도
 *          같은 케이스가 보인다 — 본인 판정이 「인증된 이메일 일치」라서 문의 이메일을 같게 넣는다.
 *
 * 실행:
 *   node scripts/seed-demo-case.mjs           # 없으면 만들고, 있으면 그대로 둔다
 *   node scripts/seed-demo-case.mjs --reset   # 이전 견본을 지우고 다시 만든다
 *
 * 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL(또는 SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY_V1
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function loadDotenv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadDotenv();

const RESET = process.argv.includes("--reset");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAW_KEY = process.env.ENCRYPTION_KEY_V1;

const SOURCE_TAG = "demo_seed"; // 이 견본을 다시 찾아내는 표식
const PATIENT_EMAIL = "patient@test.com";

const DAY = 86_400_000;
const now = Date.now();
const ago = (d) => new Date(now - d * DAY).toISOString();

// src/lib/security/encryptionV2.ts 의 encryptString 과 «같은» 형식이어야 한다.
function keyBuffer() {
  if (!RAW_KEY) throw new Error("ENCRYPTION_KEY_V1 없음");
  const b = RAW_KEY.length === 64 ? Buffer.from(RAW_KEY, "hex") : Buffer.from(RAW_KEY, "base64");
  if (b.length !== 32) throw new Error("ENCRYPTION_KEY_V1 형식이 32바이트가 아니다");
  return b;
}
function enc(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  let data = cipher.update(String(plaintext), "utf8", "base64");
  data += cipher.final("base64");
  return JSON.stringify({
    v: "v1",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data,
  });
}
const token32 = () =>
  Array.from(crypto.randomBytes(32))
    .map((b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[b % 62])
    .join("");

// 견적 항목 — 면력한방병원 «확정» 가격표(src/lib/costs/immuneClinicPrices.ts, 2026-06 기준).
// 지어낸 숫자를 넣지 않는다. 시연에서 「이 금액 어디서 나왔냐」는 질문에 답할 수 있어야 한다.
const QUOTATION_ITEMS = [
  { label: "고주파 온열암치료 (주 3회 × 4주)", note: "250,000 × 12회", krw: 3_000_000, usd: null, payer: "patient" },
  { label: "미슬토 주사 (주 3회 × 4주)", note: "100,000 × 12회", krw: 1_200_000, usd: null, payer: "patient" },
  { label: "싸이모신 (주 3회 × 4주)", note: "210,000 × 12회", krw: 2_520_000, usd: null, payer: "patient" },
  { label: "고용량 비타민C (주 2회 × 4주)", note: "15,000 × 8회", krw: 120_000, usd: null, payer: "patient" },
];
const QUOTATION_TOTAL = QUOTATION_ITEMS.reduce((s, i) => s + i.krw, 0);

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[중단] SUPABASE URL / SERVICE_ROLE_KEY 없음");
    process.exit(1);
  }
  const key = keyBuffer();
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 환자 계정(patient@test.com) 찾기 — 없으면 만들지 않는다(계정 생성은 이 스크립트의 일이 아니다).
  const { data: userList, error: userErr } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (userErr) throw new Error(`계정 조회 실패: ${userErr.message}`);
  const patient = (userList?.users || []).find((u) => u.email === PATIENT_EMAIL);
  if (!patient) {
    console.error(`[중단] ${PATIENT_EMAIL} 계정이 없다. docs/TEST_ACCOUNTS.md 참고.`);
    process.exit(1);
  }

  // 이미 있는 견본 확인
  const { data: existing } = await db
    .from("inquiries")
    .select("id")
    .eq("source", SOURCE_TAG)
    .eq("is_test", true);

  if (existing?.length && !RESET) {
    console.log(`[견본] 이미 있음 — 문의 #${existing.map((e) => e.id).join(", #")} (다시 만들려면 --reset)`);
    return;
  }
  if (existing?.length && RESET) {
    for (const row of existing) {
      // 자식 표들 — inquiry_id 로 걸린 것만. (progress_records 는 FK CASCADE 지만 명시해 지운다)
      for (const t of ["progress_records", "symptom_alerts", "symptom_reports", "followup_schedules", "case_status_history", "consultation_sessions"]) {
        await db.from(t).delete().eq("inquiry_id", row.id);
      }
      const { data: sv } = await db.from("surveys").select("id").eq("inquiry_id", row.id);
      for (const s of sv || []) await db.from("survey_responses").delete().eq("survey_id", s.id);
      await db.from("surveys").delete().eq("inquiry_id", row.id);
      await db.from("inquiries").delete().eq("id", row.id);
    }
    // reminders_scheduled 는 inquiry 로 FK 가 없어 payload 로 지운다
    await db.from("reminders_scheduled").delete().in("payload->>demo", ["1"]);
    console.log(`[견본] 이전 견본 ${existing.length}건 삭제`);
  }

  // ── 1) 문의(케이스) ─────────────────────────────────────────────
  const { data: inq, error: inqErr } = await db
    .from("inquiries")
    .insert({
      created_at: ago(120),
      first_name: enc("Айгүл", key),
      last_name: enc("Смагулова", key),
      email: enc(PATIENT_EMAIL, key),
      nationality: "KZ",
      preferred_language: "ru",
      spoken_language: "ru",
      contact_method: "email",
      cancer_type: "stomach",
      message: "[Демо] Рак желудка II стадии — вопрос о лечении в Корее (Алматы)",
      source: SOURCE_TAG,
      status: "completed",
      case_status: "follow_up",
      case_status_note: "치료 종료 · 사후관리 진행 중 (시연용 견본)",
      case_status_updated_at: ago(45),
      followup_started_at: ago(45),
      step1_completed_at: ago(120),
      step2_completed_at: ago(118),
      match_accuracy: 90,
      outcome: "admitted",
      outcome_updated_at: ago(60),
      user_id: patient.id,
      is_test: true,
    })
    .select("id")
    .single();
  if (inqErr) throw new Error(`문의 생성 실패: ${inqErr.message}`);
  const inquiryId = inq.id;

  const rows = [];
  const step = async (label, fn) => {
    const { error } = await fn();
    rows.push(`${error ? "✗" : "✓"} ${label}${error ? ` — ${error.message}` : ""}`);
  };

  // ── 2) 케이스 단계 이력 ────────────────────────────────────────
  await step("케이스 단계 이력 5건", () =>
    db.from("case_status_history").insert([
      { inquiry_id: inquiryId, status: "intake", note: "접수 (에이전시 의뢰)", created_at: ago(120) },
      { inquiry_id: inquiryId, status: "consultation", note: "사전상담 완료 — 위암 2기, 수술 후 면역치료 희망", created_at: ago(112) },
      { inquiry_id: inquiryId, status: "preparation", note: "견적 발급 · 비자 초청장 발급", created_at: ago(95) },
      { inquiry_id: inquiryId, status: "treatment", note: "입국 · 치료 시작", created_at: ago(70) },
      { inquiry_id: inquiryId, status: "follow_up", note: "귀국 · 사후관리 시작", created_at: ago(45) },
    ])
  );

  // ── 3) 사전상담(원격협진) 세션 ─────────────────────────────────
  await step("사전상담 세션 1건", () =>
    db.from("consultation_sessions").insert({
      inquiry_id: inquiryId,
      session_type: "pre_consultation",
      status: "completed",
      scheduled_at: ago(112),
      started_at: ago(112),
      ended_at: new Date(now - 112 * DAY + 38 * 60_000).toISOString(),
      duration_seconds: 2280,
      patient_language: "ru",
      doctor_language: "ko",
      livekit_room_name: `demo-${inquiryId}`,
      is_test: true,
    })
  );

  // ── 4) 예상진료비 견적(③) ──────────────────────────────────────
  await step("견적 1건 (면력 확정 가격표 기준)", () =>
    db.from("cost_estimates").insert({
      patient_user_id: patient.id,
      cancer_type: "stomach",
      stage: "II",
      quotation_items: QUOTATION_ITEMS,
      total_krw: QUOTATION_TOTAL,
      status: "accepted",
      quotation_no: `DEMO-${inquiryId}`,
      quotation_issued_at: ago(95),
      patient_accepted_at: ago(92),
      created_at: ago(96),
    })
  );

  // ── 5) 비자(③) ────────────────────────────────────────────────
  await step("비자 신청 1건", () =>
    db.from("visa_applications").insert({
      patient_user_id: patient.id,
      visa_type: "C-3-3",
      nationality: "KZ",
      // ⚠️ visa_applications · cost_estimates 에는 is_test 칸이 없다 — 나중에 세는 사람이
      //    가려낼 수 있게 「[시연용]」 표식과 DEMO- 번호를 값 안에 넣는다.
      purpose: "[시연용] 의료관광 (위암 수술 후 면역치료)",
      duration_days: 60,
      planned_arrival_date: new Date(now - 72 * DAY).toISOString().slice(0, 10),
      planned_departure_date: new Date(now - 46 * DAY).toISOString().slice(0, 10),
      status: "approved",
      invitation_issued_at: ago(93),
      embassy_submission_date: new Date(now - 90 * DAY).toISOString().slice(0, 10),
      embassy_decision_date: new Date(now - 80 * DAY).toISOString().slice(0, 10),
      created_at: ago(96),
    })
  );

  // ── 6) 경과 기록(④) — 해외 의료기관 + 환자 본인 ────────────────
  await step("경과 기록 2건 (현지 병원 · 환자 본인)", () =>
    db.from("progress_records").insert([
      {
        inquiry_id: inquiryId,
        uploader_role: "medical_institution",
        record_type: "test_result",
        note: "[Демо] Анализ крови в Алматы — РЭА 2,1 нг/мл (норма), гемоглобин 11,8 г/дл. Особенностей нет.",
        created_at: ago(20),
      },
      {
        inquiry_id: inquiryId,
        uploader_user_id: patient.id,
        uploader_role: "patient",
        record_type: "progress",
        note: "[Демо] Аппетит вернулся примерно на 70% от уровня до операции. По вечерам бывает лёгкая боль в животе.",
        created_at: ago(12),
      },
    ])
  );

  // ── 7) 증상 보고 + 이상징후 경보(⑤) ────────────────────────────
  const { data: sr } = await db
    .from("symptom_reports")
    .insert({
      inquiry_id: inquiryId,
      patient_user_id: patient.id,
      report_type: "ad_hoc",
      symptoms: [
        { symptom: "Боль в животе", severity: 4, duration: "3 дня", language: "ru" },
        { symptom: "Снижение аппетита", severity: 3, duration: "1 неделя", language: "ru" },
      ],
      ai_risk_score: 0.42,
      ai_assessment: "[시연용] 수술 후 흔한 경과 범위. 통증이 6 이상으로 오르거나 발열이 동반되면 즉시 연락 필요.",
      created_at: ago(12),
    })
    .select("id")
    .single();
  rows.push(`${sr ? "✓" : "✗"} 증상 보고 1건`);

  await step("이상징후 경보 1건", () =>
    db.from("symptom_alerts").insert({
      inquiry_id: inquiryId,
      patient_id: patient.id,
      symptom_entry_id: sr?.id ?? null,
      alert_type: "symptom_risk",
      severity: "medium",
      detected_at: ago(12),
      detected_by: "system",
      data: { risk: 0.42, demo: true },
    })
  );

  // ── 8) 만족도 설문 + 응답(⑤ / K-03) ────────────────────────────
  const { data: sv } = await db
    .from("surveys")
    .insert({
      inquiry_id: inquiryId,
      patient_id: patient.id,
      survey_type: "fu_week_1",
      token: token32(),
      sent_at: ago(38),
      responded: true,
      created_at: ago(38),
    })
    .select("id")
    .single();
  rows.push(`${sv ? "✓" : "✗"} 만족도 설문 1건`);

  if (sv) {
    await step("설문 응답 1건 (96점)", () =>
      db.from("survey_responses").insert({
        survey_id: sv.id,
        q1_score: 5,
        q2_score: 5,
        q3_score: 4,
        q4_score: 5,
        q5_score: 5,
        comment: "[시연용] Всё было организовано хорошо, спасибо координатору.",
        submitted_at: ago(36),
      })
    );
  }

  // ── 9) 자동 발송 이력(설문·교육) ───────────────────────────────
  await step("자동 발송 이력 3건 (설문 1 · 교육 2)", () =>
    db.from("reminders_scheduled").insert([
      {
        reminder_type: "survey_request",
        fire_at: ago(38),
        channel: "email",
        recipient_user_id: patient.id,
        recipient_address: PATIENT_EMAIL,
        payload: { inquiry_id: inquiryId, phase: "week_1", demo: "1" },
        status: "sent",
        sent_at: ago(38),
      },
      {
        reminder_type: "education_content",
        fire_at: ago(38),
        channel: "email",
        recipient_user_id: patient.id,
        recipient_address: PATIENT_EMAIL,
        payload: { inquiry_id: inquiryId, phase: "week_1", lang: "ru", demo: "1" },
        status: "sent",
        sent_at: ago(38),
      },
      {
        reminder_type: "education_content",
        fire_at: ago(31),
        channel: "email",
        recipient_user_id: patient.id,
        recipient_address: PATIENT_EMAIL,
        payload: { inquiry_id: inquiryId, phase: "week_2", lang: "ru", demo: "1" },
        status: "sent",
        sent_at: ago(31),
      },
    ])
  );

  // ── 10) 사후관리 제안 + 재방문 제안(⑤⑥) ───────────────────────
  await step("사후관리 제안 3건 (복약 · 화상 · 재방문)", () =>
    db.from("followup_schedules").insert([
      {
        inquiry_id: inquiryId,
        patient_user_id: patient.id,
        cancer_type: "stomach",
        treatment_completed_at: ago(45).slice(0, 10),
        status: "confirmed",
        current_phase: "week_2",
        next_action_at: ago(31),
        schedule: { kind: "cadence", phase: "week_2", action: "medication_check", title_ko: "2주차 복약 확인", title_ru: "Проверка лекарств через 2 недели", days_from_treatment: 14 },
      },
      {
        inquiry_id: inquiryId,
        patient_user_id: patient.id,
        cancer_type: "stomach",
        treatment_completed_at: ago(45).slice(0, 10),
        status: "proposed",
        current_phase: "month_1",
        next_action_at: ago(15),
        schedule: { kind: "cadence", phase: "month_1", action: "video_call", title_ko: "1개월 화상 상담", title_ru: "Видеоконсультация через 1 месяц", days_from_treatment: 30 },
      },
      {
        inquiry_id: inquiryId,
        patient_user_id: patient.id,
        cancer_type: "stomach",
        treatment_completed_at: ago(45).slice(0, 10),
        status: "proposed",
        current_phase: null,
        next_action_at: new Date(now + 45 * DAY).toISOString(),
        // 재방문 제안은 재진 엔진(/api/khidi/rebooking/create)이 쓰는 모양 그대로 — schedule.source.
        // current_phase 를 비우는 것도 같다(화면 배지는 source 로 그린다).
        schedule: { source: "followup", reason: "[Демо] 사후관리 경과 기반 재방문 제안", session_type: "follow_up", days_from_now: 45 },
      },
    ])
  );

  console.log(`\n[견본] 문의 #${inquiryId} 생성 (is_test=true, source=${SOURCE_TAG})`);
  for (const r of rows) console.log("  " + r);
  console.log(`
보는 곳:
  · 코디 케이스   /coordinator/inbox/${inquiryId}   ← 목록에서 보려면 「시험 문의 보기」를 켜라
  · 환자 화면     ${PATIENT_EMAIL} 로 로그인 → /patient/symptoms · /patient/rebooking
  · 발송 이력     /admin/reminders  (교육·설문)
`);
}

main().catch((e) => {
  console.error("[예외]", e.message);
  process.exit(1);
});
