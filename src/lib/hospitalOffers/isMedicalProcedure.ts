/**
 * Stage 2 filter: rule-based first, then batch LLM (one call, max 20).
 * Cache 24h by normalized name. Timeout/error → rule-based fallback.
 */

import { classifyMedicalProcedures, type LabelResult } from "./classifyMedicalProcedures";

const MAX_CANDIDATES_TO_LLM = 20;
const MAX_REJECTED_DEBUG = 5;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Reject (partial match): marketing, noise, pain description */
const REJECT_PATTERN =
  /궁금|QR|검색|로그인|이용약관|공지|FAQ|문의|밤마다|아픈|통증|\.\.\.|입니다|해결|후기/i;

/** Accept (partial match): procedure-like terms */
const ACCEPT_PATTERN =
  /검사|치료|시술|수술|주사|처치|프로그램|입원|항암|면역|재활|도수/i;

function normalizeCacheKey(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").trim();
}

const procedureCache = new Map<
  string,
  { value: boolean; ts: number }
>();

function getCached(key: string): boolean | undefined {
  const entry = procedureCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    procedureCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: boolean): void {
  procedureCache.set(key, { value, ts: Date.now() });
}

/** Rule-based: reject pattern → false; else true only if accept pattern (otherwise we let LLM decide for uncached). */
function ruleBasedAccept(name: string): boolean {
  if (REJECT_PATTERN.test(name)) return false;
  return ACCEPT_PATTERN.test(name);
}

/**
 * 규칙만 적용 (LLM 호출 없음). preview 등 3초 내 응답이 필요한 경로용.
 */
export function filterCandidatesByMedicalProcedureRuleOnly<T extends { name: string }>(
  candidates: T[]
): MedicalClassifierFilterResult<T> {
  const kept: T[] = [];
  const rejected: string[] = [];
  const rejectedSamples: Array<{ name: string; reason: string }> = [];

  for (const c of candidates) {
    const name = (c.name || "").trim();
    if (!name) continue;
    if (REJECT_PATTERN.test(name)) {
      rejected.push(name);
      if (rejectedSamples.length < MAX_REJECTED_DEBUG) rejectedSamples.push({ name, reason: "rule_reject" });
      continue;
    }
    if (ruleBasedAccept(name)) {
      kept.push(c);
    } else {
      rejected.push(name);
      if (rejectedSamples.length < MAX_REJECTED_DEBUG) rejectedSamples.push({ name, reason: "rule_no_accept" });
    }
  }

  const debug: MedicalClassifierDebug = {
    total_in: candidates.length,
    after_rule: kept.length,
    sent_to_llm: 0,
    kept: kept.length,
    rejected_samples: rejectedSamples,
  };
  return { kept, rejected, debug };
}

export interface MedicalClassifierDebug {
  total_in: number;
  after_rule: number;
  sent_to_llm: number;
  kept: number;
  rejected_samples: Array<{ name: string; reason: string }>;
}

export interface MedicalClassifierFilterResult<T> {
  kept: T[];
  rejected: string[];
  debug: MedicalClassifierDebug;
}

/**
 * Filter candidates: rule-based first, then batch LLM (max 20). Cache 24h. On timeout/error use rule-based fallback.
 */
export async function filterCandidatesByMedicalProcedure<T extends { name: string }>(
  candidates: T[]
): Promise<MedicalClassifierFilterResult<T>> {
  const totalIn = candidates.length;
  const ruleKept: T[] = [];
  const ruleRejected: Array<{ name: string; reason: string }> = [];

  for (const c of candidates) {
    const name = (c.name || "").trim();
    if (!name) continue;
    if (REJECT_PATTERN.test(name)) {
      if (ruleRejected.length < MAX_REJECTED_DEBUG) ruleRejected.push({ name, reason: "rule_reject" });
      continue;
    }
    ruleKept.push(c);
  }

  const afterRule = ruleKept.length;
  const toProcess = ruleKept.slice(0, MAX_CANDIDATES_TO_LLM);
  const namesToProcess = toProcess.map((c) => (c.name || "").trim());

  const cacheHits = new Map<string, boolean>();
  const uncachedNames: string[] = [];
  const uncachedIndices: number[] = [];
  namesToProcess.forEach((name, i) => {
    const key = normalizeCacheKey(name);
    const hit = getCached(key);
    if (hit !== undefined) {
      cacheHits.set(name, hit);
    } else {
      uncachedNames.push(name);
      uncachedIndices.push(i);
    }
  });

  let llmLabels: Array<LabelResult> | null = null;
  const sentToLlm = uncachedNames.length;
  if (uncachedNames.length > 0) {
    llmLabels = await classifyMedicalProcedures(uncachedNames);
    if (llmLabels) {
      uncachedNames.forEach((name, idx) => {
        const label = llmLabels![idx];
        const val = label?.is_procedure ?? false;
        setCached(normalizeCacheKey(name), val);
      });
    }
  }

  const rejectedSamples: Array<{ name: string; reason: string }> = [];
  const kept: T[] = [];
  const rejected: string[] = [];

  toProcess.forEach((c, i) => {
    const name = (c.name || "").trim();
    let ok = false;
    let reason = "";
    const uncachedIdx = uncachedIndices.indexOf(i);
    if (uncachedIdx >= 0) {
      if (llmLabels && llmLabels[uncachedIdx]) {
        const lab = llmLabels[uncachedIdx];
        ok = lab.is_procedure;
        reason = (lab.reason || "").trim() || (ok ? "" : "llm_reject");
      } else {
        ok = ruleBasedAccept(name);
        reason = ok ? "rule_fallback_accept" : "rule_fallback_reject";
      }
    } else {
      ok = cacheHits.get(name) ?? false;
      reason = ok ? "" : "cached_reject";
    }
    if (ok) {
      kept.push(c);
    } else {
      rejected.push(name);
      if (rejectedSamples.length < MAX_REJECTED_DEBUG) {
        rejectedSamples.push({ name, reason: reason || "reject" });
      }
    }
  });

  const debug: MedicalClassifierDebug = {
    total_in: totalIn,
    after_rule: afterRule,
    sent_to_llm: sentToLlm,
    kept: kept.length,
    rejected_samples: rejectedSamples,
  };

  return { kept, rejected, debug };
}

export function isMedicalProcedureAvailable(): boolean {
  return typeof process !== "undefined" && !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}
