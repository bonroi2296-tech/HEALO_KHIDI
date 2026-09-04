/**
 * healwith KHIDI 월간 보고 xlsx 자동 생성 API
 *
 * POST /api/admin/khidi/monthly-report
 * Body: { year: number, month: number }
 *
 * 처리 흐름:
 * 1. requireAdminAuth 권한 체크
 * 2. 템플릿 xlsx 읽기 (원본 수정 절대 금지 — 메모리 사본으로만 처리)
 * 3. KPI 집계 + 환자 명단 조회
 * 4. 해당 월 시트에 셀 채우기 (C9/C10/C11/C12)
 * 5. 사전사후관리 현황보고 시트 환자 행 채우기
 * 6. xlsx Buffer 스트림 반환
 *
 * 셀 매핑:
 *   C9  사전상담 건수 (K-02)
 *   C10 사후관리 건수 (K-04)
 *   C11 환자유치 건수 (K-01)
 *   C12 기타사항 (자동 생성 메모)
 *
 * 라이브러리: exceljs ^4.4.0
 * 권한: admin only
 */

export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import {
  getKpiForMonth,
} from "@/lib/khidi/kpi";
import { fetchTestInquiryIds } from "@/lib/khidi/testData";
import { readSessionNotes } from "@/lib/khidi/consultationNotes";
import { createClient } from "@supabase/supabase-js";
import { contentDisposition } from "@/lib/documents/sharedDocMeta";

// ============================================================
// 템플릿 파일 경로 (원본 — 읽기 전용)
// ============================================================
const TEMPLATE_CANDIDATES = [
  // 실제 파일 경로 (로컬 개발 환경)
  "C:/Users/user/Documents/테플러/2025 정부지원과제/02. 본로이/03. 진행 중/12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업/02. 진행서류/07. 월간 업무 보고/월간 업무 보고_5월_본로이_작성본.xlsx",
  // Vercel 배포 환경 — public 폴더에 복사해두는 경우
  path.join(process.cwd(), "public/templates/khidi_monthly_report_template.xlsx"),
];

const MONTH_SHEET_NAMES: Record<number, string> = {
  4: "4월", 5: "5월", 6: "6월", 7: "7월",
  8: "8월", 9: "9월", 10: "10월", 11: "11월",
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchPatientList(year: number, month: number) {
  const supabase = getAdminClient();
  const fromISO = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const toISO = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+09:00`;

  // ⚠️ 옛 코드는 존재하지 않는 테이블 khidi_intakes 를 `!inner` 조인해 명단이 항상
  //    빈칸이었다(쿼리 에러 → []). KNOWN_ISSUES/kpi.ts 가 못박은 실제 연결고리는
  //    consultation_sessions.inquiry_id → inquiries 다. 2단계로 합류한다.
  //    (국적·주상병명은 inquiries 에 있으나 '성별·출생연도'는 어느 테이블에도 수집되지
  //    않아 빈칸 — 데이터 수집 갭, PO 보고.) POSTMORTEMS #19.
  const { data: sessions, error } = await supabase
    .from("consultation_sessions")
    .select("id, patient_id, inquiry_id, session_type, scheduled_at, notes, notes_encrypted")
    .eq("status", "completed")
    // ⚠️ 공식 제출물이다. KHIDI 성과지표는 사전상담(K-02)·사후관리(K-04) 뿐이므로
    //    파트너(에이전시·병원) 미팅은 반드시 빠져야 한다. 아래 B열 라벨이
    //    `pre_consultation ? "사전상담" : "사후관리"` 2분기라, 안 거르면 파트너 미팅이
    //    「사후관리」로 둔갑해 찍힌다(2026-07-27 발견).
    .in("session_type", ["pre_consultation", "follow_up"])
    // ⚠️ 시험분 제외. 유형만 거르고 is_test 를 안 봐서, 문의가 안 붙은 시험 상담이
    //    공식 제출물에 「사전상담」으로 실리고 있었다(2026-08-04 실측 1건 — status=completed,
    //    inquiry_id=null 이라 「시험 문의」 거름망에도 안 걸리던 건). KPI 대시보드(kpi.ts)와
    //    증빙 CSV 는 이미 세션 자체의 is_test 도장을 본다 — 이 제출물만 어긋나 있었다.
    .or("is_test.is.null,is_test.eq.false")
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[monthly-report] patient fetch error:", error.message);
    return [];
  }

  // 공식 제출물 — 테스트 데이터는 항상 제외(테스트 문의에 딸린 상담세션 제거. null inquiry 는 보존).
  const allRows = (sessions ?? []) as any[];
  const testSet = new Set(await fetchTestInquiryIds(supabase));
  const rows = allRows.filter((r) => !testSet.has(r.inquiry_id));
  const inquiryIds = [...new Set(rows.map((r) => r.inquiry_id).filter((v) => v != null))];

  const inquiryMap = new Map<number, any>();
  if (inquiryIds.length > 0) {
    const { data: inqs, error: inqErr } = await supabase
      .from("inquiries")
      .select("id, nationality, cancer_type, treatment_type")
      .in("id", inquiryIds);
    if (inqErr) {
      console.error("[monthly-report] inquiry join error:", inqErr.message);
    } else {
      (inqs ?? []).forEach((q: any) => inquiryMap.set(q.id, q));
    }
  }

  return rows.map((r) => ({ ...r, inquiry: inquiryMap.get(r.inquiry_id) ?? null }));
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  let body: { year?: number; month?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { year, month } = body;
  if (!year || !month || month < 4 || month > 11) {
    return Response.json(
      { ok: false, error: "invalid_params", detail: "year·month 필수 (month: 4~11)" },
      { status: 400 }
    );
  }

  const sheetName = MONTH_SHEET_NAMES[month];
  if (!sheetName) {
    return Response.json(
      { ok: false, error: "unsupported_month", detail: "4~11월만 지원됩니다" },
      { status: 400 }
    );
  }

  // ── 1. 템플릿 파일 찾기 ──────────────────────────────────
  let templatePath: string | null = null;
  for (const candidate of TEMPLATE_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      templatePath = candidate;
      break;
    }
  }

  if (!templatePath) {
    console.error("[monthly-report] Template file not found. Candidates:", TEMPLATE_CANDIDATES);
    return Response.json(
      {
        ok: false,
        error: "template_not_found",
        detail:
          "템플릿 xlsx 파일을 찾을 수 없습니다. public/templates/khidi_monthly_report_template.xlsx 에 복사해 주세요.",
      },
      { status: 500 }
    );
  }

  try {
    // ── 2. KPI + 환자 명단 병렬 조회 ──────────────────────
    const [kpi, patients] = await Promise.all([
      getKpiForMonth(year, month),
      fetchPatientList(year, month),
    ]);

    // 평가 직결: 공식 제출용 보고서에 집계 오류로 인한 0 이 조용히 들어가지 않게 canary 발사
    // (cron 스냅샷 경로와 동일. POSTMORTEMS #19.) 알림 실패는 보고서 생성에 영향 없게 격리.
    if (((kpi.errors as string[]) || []).length > 0) {
      try {
        const { alertKpiAggregationErrors } = await import("@/lib/alerts/operationalAlerts");
        await alertKpiAggregationErrors(kpi.errors as string[], `monthly-report ${year}-${month}`);
      } catch (alertErr) {
        console.error("[monthly-report] canary 발송 실패:", (alertErr as Error).message);
      }
    }

    // ── 3. 템플릿 로드 (메모리 내 사본 — 원본 파일 절대 쓰기 금지) ──
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(templatePath);

    // ── 4. 월별 시트 채우기 ───────────────────────────────
    const monthSheet = wb.getWorksheet(sheetName);
    if (!monthSheet) {
      return Response.json(
        { ok: false, error: "sheet_not_found", detail: `'${sheetName}' 시트가 없습니다` },
        { status: 500 }
      );
    }

    // C9: 사전상담 건수 = 영상 + 글(의료진 소견 전달). 2026-08-06 PO 지시로 매체 확대 —
    //     진흥원 증빙 정의가 「HEALO 상담로그·AI/Human 기록」이지 영상통화가 아니다.
    //     상세: docs/government-project/KPI_측정방법_명세.md §3
    monthSheet.getCell("C9").value =
      (kpi.preConsultation ?? 0) + (kpi.writtenOpinion ?? 0);
    // C10: 사후관리 건수
    monthSheet.getCell("C10").value = kpi.followUp;
    // C11: 환자유치 건수
    monthSheet.getCell("C11").value = kpi.attraction;
    // C12: 기타사항 (자동 생성 메모)
    const generatedAt = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    monthSheet.getCell("C12").value =
      `healwith 시스템 자동 생성 (${generatedAt})\n` +
      `만족도 평균: ${kpi.satisfactionAvg ?? "미집계"}점 (응답 ${kpi.satisfactionResponseCount}건, 응답률 ${kpi.satisfactionResponseRate ?? "—"}%)\n` +
      `고유 환자 수: ${kpi.uniquePatients}명`;

    // ── 5. 사전사후관리 현황보고 시트 (환자 명단) ──────────
    const patientSheet = wb.getWorksheet("사전사후관리 현황보고 양식_누적");
    if (patientSheet && patients.length > 0) {
      // 5행부터 데이터 시작 (헤더: 1~4행)
      const startRow = 5;
      patients.forEach((session: any, idx: number) => {
        const inq = session.inquiry || {};

        const rowNum = startRow + idx;
        const row = patientSheet.getRow(rowNum);

        // A: 항목 번호
        row.getCell(1).value = idx + 1;
        // B: 진료유형 (사전상담/사후관리)
        row.getCell(2).value =
          session.session_type === "pre_consultation" ? "사전상담" : "사후관리";
        // C: 환자등록번호 (PII 최소화 — patient_id 없으면 inquiry_id 로 식별)
        row.getCell(3).value = String(session.patient_id ?? session.inquiry_id ?? "")
          .slice(0, 8)
          .toUpperCase();
        // D: 출생연도 — 현재 수집 안 함(데이터 갭) → 빈칸
        row.getCell(4).value = "";
        // E: 성별 — 현재 수집 안 함(데이터 갭) → 빈칸
        row.getCell(5).value = "";
        // F: 국적 (inquiries.nationality)
        row.getCell(6).value = inq.nationality ?? "";
        // G: 진료일자 (KST 기준 — 월 필터도 KST 라 UTC 표기 시 하루 밀림 방지)
        row.getCell(7).value = session.scheduled_at
          ? new Date(new Date(session.scheduled_at).getTime() + 9 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10)
          : "";
        // H: 진료과명 (한방 기본)
        row.getCell(8).value = "한방";
        // I: 주상병명 (inquiries.cancer_type → treatment_type 폴백)
        row.getCell(9).value = inq.cancer_type ?? inq.treatment_type ?? "";
        // J: 사전사후관리 내용
        row.getCell(10).value = readSessionNotes(session) ?? "";

        row.commit();
      });
    }

    // ── 6. xlsx Buffer 생성 → 스트림 반환 ────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const filename = `KHIDI_월간보고_${year}년${month}월_본로이.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDisposition(filename),
        "Content-Length": String((buffer as unknown as Buffer).byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[monthly-report] generation error:", (err as Error).message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
