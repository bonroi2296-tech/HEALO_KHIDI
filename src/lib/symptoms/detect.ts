/**
 * healwith: 사후 관리 이상치 자동 감지 모듈 (FR-16)
 *
 * ⚠️ 의료 면책 고지:
 * 본 모듈은 "이상치 감지" 기능만 수행합니다. 의학적 진단·처방·치료 행위를
 * 대체하지 않으며, 감지 결과는 코디네이터에게 확인을 요청하는 참고 정보입니다.
 * 실제 의료적 판단은 반드시 면허를 가진 의료 전문가가 수행해야 합니다.
 *
 * 감지 규칙 (5종):
 *   1. fever_high   — 체온 ≥ 38.5℃ (critical: ≥ 39.0℃)
 *   2. pain_critical — 통증 점수 ≥ 8/10
 *   3. silence_long  — 마지막 입력 후 3일 이상 무입력 (cron에서 호출)
 *   4. symptom_worsening — 직전 대비 통증 2점 이상 급상승
 *   5. ai_risk      — Gemini 자유 텍스트 위험도 평가 (fallback: rule)
 */

import "server-only";

export type AlertType =
  | "fever_high"
  | "pain_critical"
  | "silence_long"
  | "symptom_worsening"
  | "ai_risk";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface SymptomEntry {
  id?: string;
  patient_id: string;
  /** 체온 (°C) — 있으면 fever 규칙 적용 */
  temperature?: number;
  /** 통증 점수 1~10 */
  pain_score?: number;
  /** 자유 텍스트 증상 기술 */
  notes?: string;
  /** 증상 입력 시각 */
  created_at?: string;
}

export interface DetectedAlert {
  patient_id: string;
  symptom_entry_id?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  detected_by: "rule" | "ai";
  data: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// 규칙 1: 발열
// ─────────────────────────────────────────────
function detectFever(entry: SymptomEntry): DetectedAlert | null {
  const temp = entry.temperature;
  if (temp == null) return null;
  if (temp >= 39.0) {
    return {
      patient_id: entry.patient_id,
      symptom_entry_id: entry.id,
      alert_type: "fever_high",
      severity: "critical",
      detected_by: "rule",
      data: { temperature: temp, threshold: 39.0, rule: "fever_critical" },
    };
  }
  if (temp >= 38.5) {
    return {
      patient_id: entry.patient_id,
      symptom_entry_id: entry.id,
      alert_type: "fever_high",
      severity: "high",
      detected_by: "rule",
      data: { temperature: temp, threshold: 38.5, rule: "fever_high" },
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 규칙 2: 통증 위험
// ─────────────────────────────────────────────
function detectPain(entry: SymptomEntry): DetectedAlert | null {
  const pain = entry.pain_score;
  if (pain == null) return null;
  if (pain >= 8) {
    return {
      patient_id: entry.patient_id,
      symptom_entry_id: entry.id,
      alert_type: "pain_critical",
      severity: pain >= 9 ? "critical" : "high",
      detected_by: "rule",
      data: { pain_score: pain, threshold: 8, rule: "pain_critical" },
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 규칙 3: 침묵 감지 (cron에서 호출)
// — 마지막 입력 후 N일 이상 무입력
// ─────────────────────────────────────────────
export function detectSilence(
  patientId: string,
  lastEntryAt: Date | null,
  silenceDays = 3
): DetectedAlert | null {
  if (!lastEntryAt) {
    // 한 번도 입력 없으면 무시 (처음 가입한 환자 포함)
    return null;
  }
  const diffMs = Date.now() - lastEntryAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays >= silenceDays) {
    return {
      patient_id: patientId,
      alert_type: "silence_long",
      severity: diffDays >= 7 ? "high" : "medium",
      detected_by: "rule",
      data: {
        last_entry_at: lastEntryAt.toISOString(),
        silence_days: Math.floor(diffDays),
        threshold_days: silenceDays,
        rule: "silence_long",
      },
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 규칙 4: 급격한 악화 (직전 대비)
// ─────────────────────────────────────────────
function detectWorsening(
  current: SymptomEntry,
  previous: SymptomEntry | null
): DetectedAlert | null {
  if (!previous) return null;
  const curPain = current.pain_score;
  const prevPain = previous.pain_score;
  if (curPain == null || prevPain == null) return null;
  const delta = curPain - prevPain;
  if (delta >= 2) {
    return {
      patient_id: current.patient_id,
      symptom_entry_id: current.id,
      alert_type: "symptom_worsening",
      severity: delta >= 4 ? "critical" : delta >= 3 ? "high" : "medium",
      detected_by: "rule",
      data: {
        current_pain: curPain,
        previous_pain: prevPain,
        delta,
        previous_entry_id: previous.id,
        rule: "symptom_worsening",
      },
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 규칙 5: AI 자유 텍스트 위험도 평가 (Gemini)
// fallback: 키워드 규칙 기반
// ─────────────────────────────────────────────
const HIGH_RISK_KEYWORDS = [
  // 한국어
  "피를 토", "각혈", "의식 잃", "호흡 곤란", "극심한", "마비", "경련", "수술 부위 벌어",
  "응급", "못 참", "너무 심해",
  // 러시아어
  "кровотечение", "потеря сознания", "не могу дышать", "сильная боль",
  // 영어
  "vomiting blood", "can't breathe", "unconscious", "severe pain", "emergency",
];

export interface AiRiskResult {
  severity: AlertSeverity;
  reasoning: string;
  method: "ai" | "keyword_fallback";
}

export async function assessSymptomTextRisk(
  text: string,
  language = "ko"
): Promise<AiRiskResult> {
  // ── AI 호출 시도 ─────────────────────────
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (apiKey) {
    try {
      const { google } = await import("@ai-sdk/google");
      const { generateText } = await import("ai");
      const { text: aiResponse } = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt: `당신은 의료 코디네이터 보조 시스템입니다.
아래 환자의 증상 텍스트를 읽고 위험도를 평가하세요.
응답은 반드시 JSON 형식: { "severity": "low"|"medium"|"high"|"critical", "reasoning": "한 줄 근거" }

⚠️ 중요: 이것은 의학적 진단이 아닌 "주의 필요 여부" 판단입니다.

언어: ${language}
증상 텍스트: "${text}"

JSON만 반환하세요. 다른 텍스트 금지.`,
        maxOutputTokens: 200,
      });
      const cleaned = aiResponse.trim().replace(/^```json?\n?|```$/g, "");
      const parsed = JSON.parse(cleaned);
      if (parsed.severity && parsed.reasoning) {
        return {
          severity: parsed.severity as AlertSeverity,
          reasoning: parsed.reasoning,
          method: "ai",
        };
      }
    } catch (err) {
      console.warn("[detect] AI 평가 실패, 키워드 폴백:", (err as Error).message);
    }
  }

  // ── 키워드 폴백 ──────────────────────────
  const lower = text.toLowerCase();
  const matched = HIGH_RISK_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase()));
  if (matched.length >= 2) {
    return {
      severity: "critical",
      reasoning: `위험 키워드 감지: ${matched.slice(0, 3).join(", ")}`,
      method: "keyword_fallback",
    };
  }
  if (matched.length === 1) {
    return {
      severity: "high",
      reasoning: `위험 키워드 감지: ${matched[0]}`,
      method: "keyword_fallback",
    };
  }
  return {
    severity: "low",
    reasoning: "특이 위험 키워드 없음",
    method: "keyword_fallback",
  };
}

// ─────────────────────────────────────────────
// 메인: 증상 입력 시 호출하는 감지 함수
// ─────────────────────────────────────────────
export async function detectAlerts(
  entry: SymptomEntry,
  previousEntry: SymptomEntry | null = null
): Promise<DetectedAlert[]> {
  const alerts: DetectedAlert[] = [];

  // 규칙 1: 발열
  const fever = detectFever(entry);
  if (fever) alerts.push(fever);

  // 규칙 2: 통증
  const pain = detectPain(entry);
  if (pain) alerts.push(pain);

  // 규칙 4: 급격한 악화
  const worsening = detectWorsening(entry, previousEntry);
  if (worsening) alerts.push(worsening);

  // 규칙 5: AI 자유 텍스트 (notes가 있을 때만)
  if (entry.notes && entry.notes.trim().length > 10) {
    const aiResult = await assessSymptomTextRisk(entry.notes);
    if (aiResult.severity === "high" || aiResult.severity === "critical") {
      alerts.push({
        patient_id: entry.patient_id,
        symptom_entry_id: entry.id,
        alert_type: "ai_risk",
        severity: aiResult.severity,
        detected_by: aiResult.method === "ai" ? "ai" : "rule",
        data: {
          text_preview: entry.notes.slice(0, 200),
          severity: aiResult.severity,
          reasoning: aiResult.reasoning,
          method: aiResult.method,
        },
      });
    }
  }

  return alerts;
}
