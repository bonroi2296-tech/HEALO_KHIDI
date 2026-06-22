/**
 * healwith: 공개 챗 라우트 공용 헬퍼
 *
 * /api/public/chat/message (비스트리밍) 와 /api/public/chat/stream (스트리밍) 이 공유.
 * 첨부 검증·접수확인 멘트·핸드오프 멘트·문의서 초안 생성을 한곳에서 관리(드리프트 방지).
 */

import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { getModelName } from "@/lib/chat/generateReply";
import {
  createEmptyIntake,
  computeMissingFields,
  computeExtractionConfidence,
} from "@/lib/intakeSchema";
import {
  bodyPartFromText,
  contraindicationsAndFlagsFromMessage,
  extractTimelineFromQuery,
  extractBudgetFromQuery,
  extractDurationFromQuery,
  extractSeverityFromQuery,
} from "@/lib/intakeExtract";
import { encryptStringNullable } from "@/lib/security/encryptionV2";

export const INTAKE_EVERY_N_TURNS = 3;
export const MAX_ATTACHMENTS = 5;

// 환자가 자료(검사결과지·사진)를 올렸을 때 접수 확인 멘트 (6개 언어).
// ⚠️ AI는 의료자료를 판독/진단하지 않음(의료법·안전규칙) → "접수+의료진 검토"로만 안내.
export const ATTACHMENT_ACK: Record<string, string> = {
  ko: "📎 자료 잘 받았습니다. 안전하게 보관됐고, 의료진·코디네이터가 직접 검토한 뒤 정확히 안내드릴게요. (AI는 검사결과를 판독하지 않습니다.)",
  en: "📎 Got your file — it's safely stored. Our medical team/coordinator will review it personally and follow up. (The AI does not interpret medical results.)",
  ru: "📎 Файл получен и надёжно сохранён. Наш врач/координатор лично изучит его и свяжется с вами. (ИИ не интерпретирует медицинские результаты.)",
  kz: "📎 Файл қабылданып, қауіпсіз сақталды. Дәрігер/үйлестіруші оны жеке қарап, хабарласады. (AI медициналық нәтижелерді оқымайды.)",
  kk: "📎 Файл қабылданып, қауіпсіз сақталды. Дәрігер/үйлестіруші оны жеке қарап, хабарласады. (AI медициналық нәтижелерді оқымайды.)",
  zh: "📎 已收到您的文件并安全保存。我们的医疗团队/协调员会亲自查看并与您联系。（AI 不会解读医疗检查结果。）",
  ja: "📎 ファイルを受け取り安全に保管しました。医療チーム・コーディネーターが直接確認しご連絡します。（AIは検査結果を判読しません。）",
};

// 접수(핸드오프) 연락처 게이트 멘트·로직은 순수 모듈로 분리(단위테스트 가능) — 여기선 재노출만.
export {
  HANDOFF_CONFIRM,
  HANDOFF_NEED_CONTACT,
  hasReachableContact,
  pickHandoffConfirm,
} from "./contactGate";

// 클라이언트가 보낸 첨부 목록 검증·정제. 업로드 라우트가 항상 inquiry/ 접두사로
// 저장하므로 그 외 경로는 거부(경로조작·임의참조 차단). 최대 5개.
export function sanitizeAttachments(
  input: unknown
): Array<{ path: string; name: string | null; type: string | null }> {
  if (!Array.isArray(input)) return [];
  const out: Array<{ path: string; name: string | null; type: string | null }> = [];
  for (const a of input.slice(0, MAX_ATTACHMENTS)) {
    if (!a || typeof a !== "object") continue;
    const path = typeof (a as any).path === "string" ? (a as any).path : "";
    if (!path.startsWith("inquiry/") || path.includes("..") || path.length > 500) continue;
    out.push({
      path,
      name: typeof (a as any).name === "string" ? (a as any).name.slice(0, 300) : null,
      type: typeof (a as any).type === "string" ? (a as any).type.slice(0, 100) : null,
    });
  }
  return out;
}

// 3턴마다 대화에서 normalized_inquiries draft 생성 (PII 암호화 저장).
export async function createDraftIntake(
  thread: any,
  messages: Array<{ actor_type: string; message_text: string }>,
  lang: string
) {
  const patientTexts = messages
    .filter((m) => m.actor_type === "patient")
    .map((m) => m.message_text)
    .join(" ");

  const { intake } = createEmptyIntake("ai_agent");
  intake.chief_complaint = patientTexts.slice(0, 500) || null;
  intake.body_part = bodyPartFromText(patientTexts) ?? null;
  intake.timeline = extractTimelineFromQuery(patientTexts) ?? null;
  intake.budget = extractBudgetFromQuery(patientTexts) ?? null;
  intake.duration = extractDurationFromQuery(patientTexts) ?? null;
  intake.severity = extractSeverityFromQuery(patientTexts) ?? null;
  const { contraindications, allergy, medications } =
    contraindicationsAndFlagsFromMessage(patientTexts);
  intake.contraindications = contraindications.length ? contraindications : null;
  intake.allergy_flag = allergy || null;
  intake.medications_flag = medications || null;

  const missing = computeMissingFields(intake);
  const confidence = computeExtractionConfidence(intake, missing);

  const rawEnc = encryptStringNullable(patientTexts.slice(0, 1000));

  const { data, error } = await (supabaseAdmin as any)
    .from("normalized_inquiries")
    .insert({
      source_type: "ai_agent",
      language: lang,
      raw_message: rawEnc,
      constraints: {
        intake,
        meta: {
          pipeline_version: "v1_chat_thread",
          source_type: "ai_agent",
          model: getModelName(),
          thread_id: thread.id,
        },
      },
      extraction_confidence: confidence,
      missing_fields: missing.length ? missing : null,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (data?.id) {
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ normalized_inquiry_id: data.id })
      .eq("id", thread.id);
  }
}
