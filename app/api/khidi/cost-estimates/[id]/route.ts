/**
 * healwith: Cost Estimate Detail / Update
 *
 * GET   /api/khidi/cost-estimates/[id] — 상세 조회
 * PATCH /api/khidi/cost-estimates/[id] — 견적 항목 업데이트 / 상태 전이 / 환자 동의
 */

export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { requireCostEstimateAccess } from "@/lib/auth/requireCostEstimateAccess";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";
import { supabaseAdmin as _sb } from "@/lib/rag/supabaseAdmin";
const supabaseAdmin: any = _sb;
import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";
import { checkFacilitationFeeCap } from "@/lib/legal/facilitationFeeCap";
import { getClientIp } from "@/lib/rateLimit";

const VALID_STATUSES = [
  "auto_range", "formal_requested", "hospital_pending", "draft",
  "issued", "accepted", "rejected", "expired",
];

const TRANSITIONS: Record<string, string[]> = {
  auto_range: ["formal_requested", "expired"],
  formal_requested: ["hospital_pending", "draft", "expired"],
  hospital_pending: ["draft", "expired"],
  draft: ["issued", "expired"],
  issued: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireCostEstimateAccess(request, id);
  if (!access.success) return access.response;

  const { data, error } = await supabaseAdmin
    .from("cost_estimates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  let coordinatorNotes: string | null = null;
  if (access.role === "admin" || access.role === "coordinator") {
    // 접속기록(법정 의무): «취급자»가 남의 견적을 열어본 경우만 남긴다.
    // 환자가 자기 것을 보는 건 대상이 아니라 이 분기 안에 둔다.
    after(() =>
      logPiiAccess(request, { userId: access.userId }, {
        action: "VIEW_INQUIRY",
        metadata: { screen: "cost_estimate", decrypted: "coordinator_notes" },
      })
    );

    try {
      coordinatorNotes = decryptStringNullable(data.coordinator_notes_encrypted);
    } catch {
      coordinatorNotes = null;
    }
  }

  const { coordinator_notes_encrypted: _drop, ...rest } = data;
  return Response.json({
    ok: true,
    data: { ...rest, coordinator_notes: coordinatorNotes },
    role: access.role,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireCostEstimateAccess(request, id);
  if (!access.success) return access.response;
  const { role, userId, estimate } = access;
  const isStaff = role === "admin" || role === "coordinator";

  try {
    const payload = await request.json();
    const updates: Record<string, any> = {};

    // 환자 동의 서명 (근거: 의료해외진출법 제8조제2항 — §15 아님)
    if (role === "patient" && payload.accept === true) {
      if (estimate.status !== "issued") {
        return Response.json(
          { ok: false, error: "not_issued", detail: "발급된 견적서만 동의할 수 있습니다" },
          { status: 400 }
        );
      }
      updates.status = "accepted";
      updates.patient_accepted_at = new Date().toISOString();
      updates.patient_accepted_ip = getClientIp(request);
    }

    if (role === "patient" && payload.reject === true) {
      if (estimate.status !== "issued") {
        return Response.json(
          { ok: false, error: "not_issued" },
          { status: 400 }
        );
      }
      updates.status = "rejected";
    }

    if (isStaff) {
      // 견적 항목 작성
      if (payload.quotation_items !== undefined) {
        if (!Array.isArray(payload.quotation_items)) {
          return Response.json(
            { ok: false, error: "quotation_items_must_be_array" },
            { status: 400 }
          );
        }
        // payer 는 "patient"(기본) 또는 "hospital" 만 허용. 알 수 없는 값이 들어오면
        // 「환자 부담이 아닌데 환자 부담으로 계산」되는 조용한 사고가 나므로 여기서 막는다.
        for (const item of payload.quotation_items) {
          if (item?.payer !== undefined && item.payer !== "patient" && item.payer !== "hospital") {
            return Response.json(
              { ok: false, error: "invalid_payer" },
              { status: 400 }
            );
          }
        }
        updates.quotation_items = payload.quotation_items;

        // 총액 자동 계산 — **환자 부담분만** 더한다.
        // 유치수수료는 통합고시 제2조1호상 «의료기관이 유치사업자에게 지급»하는 돈이라 환자
        // 청구액이 아니다. 예전엔 모든 항목을 무조건 합산해서, 코디가 수수료를 한 줄 넣으면
        // 환자 서명란 위 합계가 그만큼 부풀었다(2026-08-04 실측 300만원). FAQ 6개 언어의
        // "환자에게 청구되지 않습니다"와 정면으로 어긋나던 것.
        // USD 총액은 '모든 라인에 USD 가 있을 때만' 낸다 — 일부 라인만 USD 면
        // KRW 총액과 안 맞는 USD 총액이 법적 견적서·환자화면에 찍힌다(MONEY-4). 불완전하면 null 로
        // 저장 → 표시 화면들(total_usd truthy 가드)이 자동으로 USD 를 숨긴다(환율 임의계산 안 함).
        const patientItems = payload.quotation_items.filter(
          (item: any) => item?.payer !== "hospital"
        );
        let total_krw = 0;
        let total_usd = 0;
        let allHaveUsd = patientItems.length > 0;
        for (const item of patientItems) {
          total_krw += Number(item.krw) || 0;
          const usd = Number(item.usd) || 0;
          total_usd += usd;
          if (usd <= 0) allHaveUsd = false;
        }
        updates.total_krw = total_krw;
        updates.total_usd = allHaveUsd ? total_usd : null;
      }

      // ── 유치수수료 법정 상한 검증 (항목이 바뀌든 «병원»이 바뀌든 매번) ──────────
      // 통합고시 제3조: 상급종합 15% / 종합병원·병원(한방 포함) 20% / 의원 30%.
      // 초과 = 법 제9조제1항 위반 → 제24조제1항제6호 **등록 취소 사유**.
      // PO 결정(2026-08-04)이 «상한을 꽉 채워 받는다» 라서 여유가 0이다 —
      // 반올림 하나, 항목 분류 하나만 어긋나도 즉시 위반이 되므로 저장 길목에서 막는다.
      //
      // ⚠️ **병원만 바꾸는 요청도 반드시 검사한다.** 예전 판은 항목이 있을 때만 검사해서,
      //    ①20% 병원으로 20% 짜리 견적을 저장 → ②병원만 15% 병원으로 바꾸기
      //    두 번의 요청으로 상한을 그냥 넘길 수 있었다(2026-08-04 독립 리뷰).
      if (payload.quotation_items !== undefined || payload.hospital_id !== undefined) {
        const finalHospitalId =
          payload.hospital_id !== undefined ? payload.hospital_id : estimate.hospital_id;

        // 항목이 이번 요청에 없으면 «이미 저장된 것»을 상대로 검사한다.
        let finalItems = payload.quotation_items;
        if (finalItems === undefined) {
          const { data: cur } = await supabaseAdmin
            .from("cost_estimates")
            .select("quotation_items")
            .eq("id", estimate.id)
            .maybeSingle();
          finalItems = (cur as any)?.quotation_items || [];
        }

        let grade: unknown = null;
        if (finalHospitalId) {
          const { data: h } = await supabaseAdmin
            .from("hospitals")
            .select("medical_institution_grade")
            .eq("id", finalHospitalId)
            .maybeSingle();
          grade = (h as any)?.medical_institution_grade ?? null;
        }

        const capCheck = checkFacilitationFeeCap(finalItems, grade);
        if (!capCheck.ok) {
          // 사유는 «코드와 숫자»로만 내보낸다 — 완성된 문장은 화면이 6개 언어로 만든다
          // (백오피스도 다국어라 서버가 한국어 문장을 내려주면 안 된다).
          return Response.json(
            {
              ok: false,
              error: "facilitation_fee_over_cap",
              detail: {
                reason: capCheck.reason,
                cap: capCheck.cap,
                grade: capCheck.grade,
                grade_known: capCheck.gradeKnown,
                currency: capCheck.currency,
                patient_total_krw: capCheck.patientTotalKrw,
                facilitation_fee_krw: capCheck.facilitationFeeKrw,
                max_allowed_krw: capCheck.maxAllowedKrw,
                patient_total_usd: capCheck.patientTotalUsd,
                facilitation_fee_usd: capCheck.facilitationFeeUsd,
                max_allowed_usd: capCheck.maxAllowedUsd,
              },
            },
            { status: 400 }
          );
        }
      }

      if (payload.hospital_id !== undefined) updates.hospital_id = payload.hospital_id;
      if (payload.coordinator_user_id !== undefined) {
        updates.coordinator_user_id = payload.coordinator_user_id;
      }
      if (payload.coordinator_notes !== undefined) {
        updates.coordinator_notes_encrypted = encryptStringNullable(
          payload.coordinator_notes
        );
      }
      if (payload.expires_at !== undefined) updates.expires_at = payload.expires_at;

      // 상태 전이
      if (payload.status && payload.status !== estimate.status) {
        if (!VALID_STATUSES.includes(payload.status)) {
          return Response.json(
            { ok: false, error: "invalid_status" },
            { status: 400 }
          );
        }
        const allowed = TRANSITIONS[estimate.status] || [];
        if (!allowed.includes(payload.status) && !access.isAdmin) {
          return Response.json(
            {
              ok: false,
              error: "invalid_transition",
              detail: `${estimate.status} → ${payload.status} 불가. 허용: ${allowed.join(", ")}`,
            },
            { status: 400 }
          );
        }
        updates.status = payload.status;
        // 발행으로 바꾸면 발행 시각도 같이 찍는다 (2026-08-30 독립 리뷰 지적).
        // 안 찍으면 «issued 인데 quotation_issued_at 없음» 행이 생기고, 그 견적이 나중에
        // expired 되면 여정 매핑(costEstimateJourney)이 발행 이력을 못 봐 «보낸 적 없는
        // 초안»으로 강등된다 — 환자는 발행 알림까지 받았는데 여정에서 제안이 증발.
        if (payload.status === "issued" && !estimate.quotation_issued_at) {
          updates.quotation_issued_at = new Date().toISOString();
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ ok: false, error: "no_updates" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("cost_estimates")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[cost-estimates/[id]] PATCH error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    if (updates.status) {
      await supabaseAdmin.from("cost_estimate_history").insert({
        estimate_id: id,
        from_status: estimate.status,
        to_status: updates.status,
        changed_by: userId,
        note: payload.status_note || null,
      });
    }

    // 견적 발행 시 환자 인앱 알림 — 환자가 동의/거절하러 들어오게 (지금까지 환자 신호 0이던 통로).
    // best-effort, 절대 업데이트 실패시키지 않음. 언어 컬럼이 없어 주시장 ru 기본(링크는 언어 무관).
    if (updates.status === "issued" && data.patient_user_id) {
      try {
        const { sendInAppNotification } = await import("@/lib/notifications/inApp");
        const lang = (data.language || data.patient_language || "ru") as string;
        const NL: Record<string, { t: string; b: string }> = {
          ru: { t: "Готова смета расходов", b: "Координатор выставил смету. Откройте, чтобы согласовать или отклонить." },
          kz: { t: "Шығындар сметасы дайын", b: "Координатор смета шығарды. Келісу немесе бас тарту үшін ашыңыз." },
          en: { t: "Cost estimate ready", b: "Your coordinator issued a cost estimate. Open to accept or decline." },
          ko: { t: "비용 견적서가 발급되었습니다", b: "코디네이터가 견적서를 발급했습니다. 눌러서 동의/거절하세요." },
        };
        const m = NL[lang] || NL.ru;
        await sendInAppNotification({
          userId: data.patient_user_id,
          type: "cost_estimate_issued",
          title: m.t,
          body: m.b,
          link: `/patient/cost-estimates/${id}`,
          priority: "high",
          payload: { estimate_id: id },
        });
      } catch (notifErr: any) {
        console.warn("[cost-estimates] in-app notify 실패:", notifErr?.message);
      }
    }

    const { coordinator_notes_encrypted: _drop, ...rest } = data;
    return Response.json({ ok: true, data: rest });
  } catch (error: any) {
    console.error("[cost-estimates/[id]] PATCH exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
