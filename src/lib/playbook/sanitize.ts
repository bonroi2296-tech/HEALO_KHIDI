/**
 * healwith: Playbook PII/정책 정제 유틸
 *
 * 최소 규칙: 이메일, 전화, 메신저ID, URL, 여권번호 마스킹
 * + "확정" 류 단정적 표현 완화
 */

import "server-only";

export interface SanitizeResult {
  sanitized: string;
  flags: string[];
}

interface Rule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const PII_RULES: Rule[] = [
  {
    name: "email",
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  {
    name: "phone_intl",
    pattern: /\+?\d{1,4}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{2,4}[\s\-]?\d{3,4}[\s\-]?\d{0,4}/g,
    replacement: "[PHONE]",
  },
  {
    name: "phone_kr",
    pattern: /0\d{1,2}[\-.\s]?\d{3,4}[\-.\s]?\d{4}/g,
    replacement: "[PHONE]",
  },
  {
    name: "passport",
    pattern: /[A-Z]{1,2}\d{7,8}/g,
    replacement: "[PASSPORT]",
  },
  {
    name: "messenger_id",
    pattern: /@[a-zA-Z0-9_]{3,30}/g,
    replacement: "[MESSENGER_ID]",
  },
  {
    name: "url",
    pattern: /https?:\/\/[^\s,)]+/gi,
    replacement: "[URL]",
  },
];

const POLICY_SOFTENERS: { name: string; pattern: RegExp; replacement: string }[] = [
  {
    name: "definitive_price_ko",
    pattern: /(?:가격|비용|수술비)(?:이|가|는|은)?\s*(?:확정|보장|약속)/g,
    replacement: "비용은 상담 후 안내",
  },
  {
    name: "definitive_price_en",
    pattern: /(?:price|cost|fee)\s+(?:is\s+)?(?:guaranteed|confirmed|fixed|promised)/gi,
    replacement: "pricing is provided after consultation",
  },
  {
    name: "ranking_ko",
    pattern: /(?:1위|최고|최상|가장\s*좋은|넘버원|No\.?\s*1)/g,
    replacement: "우수한",
  },
  {
    name: "ranking_en",
    pattern: /(?:(?:the\s+)?(?:best|top|#1|number\s*one|number\s*1)\s+(?:hospital|clinic|doctor|surgeon))/gi,
    replacement: "highly regarded provider",
  },
  {
    name: "guarantee_ko",
    pattern: /(?:결과를?\s*)?(?:보장|확정|100%|확실)/g,
    replacement: "기대할 수 있는",
  },
  {
    name: "guarantee_en",
    pattern: /(?:guarantee[ds]?\s+(?:results?|outcomes?|success))/gi,
    replacement: "expected outcomes based on typical cases",
  },
];

export function sanitizeResponse(rawText: string): SanitizeResult {
  let text = rawText;
  const flags: string[] = [];

  for (const rule of PII_RULES) {
    if (rule.pattern.test(text)) {
      flags.push(rule.name);
      rule.pattern.lastIndex = 0;
      text = text.replace(rule.pattern, rule.replacement);
    }
  }

  for (const rule of POLICY_SOFTENERS) {
    if (rule.pattern.test(text)) {
      flags.push(`policy:${rule.name}`);
      rule.pattern.lastIndex = 0;
      text = text.replace(rule.pattern, rule.replacement);
    }
  }

  return { sanitized: text.trim(), flags };
}

/**
 * quality_score 계산 (v1 간단 규칙)
 * 기본 80점, PII 플래그 1개당 -10, 정책 플래그 1개당 -5
 * 최소 0, 최대 100
 */
export function computeQualityScore(flags: string[]): number {
  let score = 80;
  for (const f of flags) {
    if (f.startsWith("policy:")) {
      score -= 5;
    } else {
      score -= 10;
    }
  }
  const lengthBonus = flags.length === 0 ? 20 : 0;
  return Math.max(0, Math.min(100, score + lengthBonus));
}
