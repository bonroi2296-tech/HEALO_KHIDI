/**
 * HEALO: 병원 전달용 리드 요약 생성
 * 
 * 목적:
 * - inquiries 데이터를 병원이 이해하기 쉬운 형태로 변환
 * - 이메일/카톡/수동 전달용 구조화된 데이터
 * - 개인정보는 복호화하여 포함
 * 
 * 사용 시나리오:
 * 1. 운영자가 우선순위 높은 문의 확인
 * 2. 적합한 병원 선택
 * 3. 리드 요약 생성 → 이메일/카톡으로 전송
 * 4. 병원 응답 수동 입력
 */

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { decryptAuto } from "../security/encryptionV2";

/**
 * 병원 전달용 리드 요약
 */
export interface HospitalLeadSummary {
  // 리드 기본 정보
  leadId: number;
  receivedAt: string;
  priority: 'high' | 'medium' | 'low';
  
  // 환자 정보 (병원이 필요한 것만)
  patient: {
    nationality: string;
    spokenLanguage: string;
    contactMethod?: string; // email, kakao, whatsapp 등
  };
  
  // 시술 정보
  treatment: {
    type: string;
    bodyPart?: string;
    severity?: number; // 1-10
    duration?: string; // 얼마나 앓았는지
  };
  
  // 의료 이력 (간략)
  medicalHistory?: {
    hasDiagnosis: boolean;
    diagnosisText?: string;
    medications: boolean;
    medicationsText?: string;
    allergies?: string;
  };
  
  // 일정
  schedule: {
    preferredDate?: string;
    flexible: boolean;
  };
  
  // 메모 (운영자가 판단한 것)
  notes?: string;
  
  // 품질 지표 (병원이 판단에 참고)
  qualityIndicators: {
    completeness: number; // 0-100 (정보 완성도)
    responseTime: string; // "빠른 응답 필요" 등
    confidence: number; // 0-100 (진지도)
  };
}

/**
 * 병원 전달용 이메일/문자 텍스트
 */
export interface HospitalLeadMessage {
  subject: string;
  body: string;
  plainText: string;
}

/**
 * ✅ 리드 요약 생성
 * 
 * @param inquiryId 문의 ID
 * @returns 병원 전달용 리드 요약
 */
export async function generateHospitalLeadSummary(
  inquiryId: number
): Promise<HospitalLeadSummary | null> {
  try {
    // 1. inquiries 데이터 조회
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from("inquiries")
      .select("*")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      console.error("[hospitalLeadSummary] Inquiry not found:", inquiryError);
      return null;
    }

    // 2. normalized_inquiries 데이터 조회 (추가 정보)
    const { data: normalized } = await supabaseAdmin
      .from("normalized_inquiries")
      .select("*")
      .eq("source_inquiry_id", inquiryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. 개인정보 복호화 (필요한 경우)
    // 주의: 병원에게 전달할 때만 복호화, 저장은 암호화된 상태 유지
    // decryptAuto: V2(AES-256-GCM) 또는 RPC(pgcrypto) 자동 감지
    let decryptedEmail: string | null = null;
    const contactJson = normalized?.contact as any;
    if (contactJson?.email) {
      try {
        decryptedEmail = await decryptAuto(String(contactJson.email));
      } catch (error) {
        console.error("[hospitalLeadSummary] Email decryption failed:", error);
      }
    }

    // 4. 우선순위 결정
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (inquiry.lead_quality === 'hot') {
      priority = 'high';
    } else if (inquiry.lead_quality === 'cold' || inquiry.lead_quality === 'spam') {
      priority = 'low';
    }

    // 5. intake 데이터 파싱 (jsonb 컬럼 → any 로 인덱싱)
    const intakeJson = (inquiry as any).intake;
    const intake: any = (intakeJson && typeof intakeJson === 'object' && !Array.isArray(intakeJson)) ? intakeJson : {};
    const complaint: any = intake.complaint || {};
    const history: any = intake.history || {};

    // 6. 리드 요약 생성
    const summary: HospitalLeadSummary = {
      leadId: inquiry.id,
      receivedAt: inquiry.created_at,
      priority,

      patient: {
        nationality: inquiry.nationality || 'Unknown',
        spokenLanguage: inquiry.spoken_language || 'en',
        contactMethod: inquiry.contact_method || (decryptedEmail ? 'email' : undefined),
      },

      treatment: {
        type: inquiry.treatment_type || 'Not specified',
        bodyPart: Array.isArray(complaint.body_part) 
          ? complaint.body_part[0] 
          : complaint.body_part || undefined,
        severity: complaint.severity || undefined,
        duration: complaint.duration || undefined,
      },

      medicalHistory: history ? {
        hasDiagnosis: history.diagnosis?.has || false,
        diagnosisText: history.diagnosis?.text || undefined,
        medications: history.meds?.has || false,
        medicationsText: history.meds?.text || undefined,
        allergies: intake.allergy_flag || undefined,
      } : undefined,

      schedule: {
        preferredDate: inquiry.preferred_date || undefined,
        flexible: inquiry.preferred_date_flex || false,
      },

      qualityIndicators: {
        completeness: inquiry.priority_score || 50,
        responseTime: priority === 'high' ? '24시간 내 응답 권장' : '48시간 내 응답',
        confidence: normalized?.extraction_confidence 
          ? Math.round(normalized.extraction_confidence * 100) 
          : 50,
      },
    };

    return summary;

  } catch (error) {
    console.error("[hospitalLeadSummary] Error generating summary:", error);
    return null;
  }
}

/**
 * ✅ 병원 전달용 이메일 메시지 생성
 * 
 * @param summary 리드 요약
 * @param hospitalName 병원 이름
 * @returns 이메일 제목 + 본문
 */
export function generateHospitalLeadEmail(
  summary: HospitalLeadSummary,
  hospitalName: string
): HospitalLeadMessage {
  const priorityEmoji = summary.priority === 'high' ? '🔥 ' : '';
  
  const subject = `${priorityEmoji}새로운 환자 문의 - ${summary.treatment.type} (리드 #${summary.leadId})`;

  const plainText = `
안녕하세요, ${hospitalName} 담당자님

새로운 환자 문의가 접수되었습니다.

=== 기본 정보 ===
리드 번호: #${summary.leadId}
우선순위: ${summary.priority === 'high' ? '높음 ⭐' : summary.priority === 'medium' ? '보통' : '낮음'}
접수 시각: ${new Date(summary.receivedAt).toLocaleString('ko-KR')}

=== 환자 정보 ===
국적: ${summary.patient.nationality}
사용 언어: ${summary.patient.spokenLanguage}
연락 방법: ${summary.patient.contactMethod || '미제공'}

=== 시술 정보 ===
시술 타입: ${summary.treatment.type}
${summary.treatment.bodyPart ? `부위: ${summary.treatment.bodyPart}` : ''}
${summary.treatment.severity ? `심각도: ${summary.treatment.severity}/10` : ''}
${summary.treatment.duration ? `증상 기간: ${summary.treatment.duration}` : ''}

${summary.medicalHistory ? `
=== 의료 이력 ===
진단 이력: ${summary.medicalHistory.hasDiagnosis ? '있음' : '없음'}
${summary.medicalHistory.diagnosisText ? `  - 내용: ${summary.medicalHistory.diagnosisText}` : ''}
복용 약물: ${summary.medicalHistory.medications ? '있음' : '없음'}
${summary.medicalHistory.medicationsText ? `  - 내용: ${summary.medicalHistory.medicationsText}` : ''}
${summary.medicalHistory.allergies ? `알레르기: ${summary.medicalHistory.allergies}` : ''}
` : ''}

=== 일정 ===
희망 시술일: ${summary.schedule.preferredDate || '미정'}
일정 조율 가능: ${summary.schedule.flexible ? '예' : '아니오'}

=== 품질 지표 ===
정보 완성도: ${summary.qualityIndicators.completeness}%
응답 권장 시간: ${summary.qualityIndicators.responseTime}
진지도: ${summary.qualityIndicators.confidence}%

${summary.notes ? `
=== 운영 메모 ===
${summary.notes}
` : ''}

---
이 리드에 관심이 있으시면 답장 부탁드립니다.
- 관심 있음 / 관심 없음
- 추가 필요 정보
- 예상 상담 가능 일정

감사합니다.
HEALO 팀
  `.trim();

  const body = plainText.replace(/\n/g, '<br>');

  return {
    subject,
    body,
    plainText,
  };
}

/**
 * ✅ 여러 리드를 한 번에 조회 (배치 전송용)
 * 
 * @param inquiryIds 문의 ID 배열
 * @returns 리드 요약 배열
 */
export async function generateBatchLeadSummaries(
  inquiryIds: number[]
): Promise<HospitalLeadSummary[]> {
  const summaries: HospitalLeadSummary[] = [];

  for (const id of inquiryIds) {
    const summary = await generateHospitalLeadSummary(id);
    if (summary) {
      summaries.push(summary);
    }
  }

  return summaries;
}

/**
 * ✅ 운영자용 간단 조회 쿼리
 * 
 * 병원에게 전달할 리드 찾기:
 * - 우선순위 높은 것
 * - 아직 병원에 전달 안 된 것
 * - 특정 시술 타입
 */
export const HOSPITAL_LEAD_QUERIES = {
  // 전달 대기 중인 high priority 리드
  PENDING_HIGH_PRIORITY: `
    SELECT 
      i.id,
      i.created_at,
      i.lead_quality,
      i.priority_score,
      i.nationality,
      i.treatment_type,
      i.email
    FROM inquiries i
    LEFT JOIN hospital_responses hr ON hr.inquiry_id = i.id
    WHERE i.lead_quality = 'hot'
      AND i.status = 'received'
      AND hr.id IS NULL  -- 아직 병원에 전달 안 됨
    ORDER BY i.priority_score DESC, i.created_at DESC
    LIMIT 20;
  `,

  // 특정 시술 타입의 리드
  BY_TREATMENT_TYPE: `
    SELECT 
      i.id,
      i.created_at,
      i.lead_quality,
      i.nationality,
      i.treatment_type
    FROM inquiries i
    LEFT JOIN hospital_responses hr ON hr.inquiry_id = i.id
    WHERE i.treatment_type = $1
      AND i.status = 'received'
      AND hr.id IS NULL
    ORDER BY i.priority_score DESC
    LIMIT 50;
  `,
} as const;
