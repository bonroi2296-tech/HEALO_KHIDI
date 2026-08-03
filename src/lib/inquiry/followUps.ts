/**
 * 접수 «이후»에 들어온 추가 정보(글) — 읽기·쓰기 한 곳.
 *
 * 왜: 접수가 끝난 뒤에도 환자·에이전시는 계속 정보를 준다(왓츠앱·메신저로 오는 「지금 상태」 같은 것).
 *   서류로는 못 받고, 코디 개인 메모에 적으면 **소견 주는 의료진에게 안 간다.**
 *   그래서 문의에 붙여 두고, 코디 화면·소견 화면·AI 케이스 브리프가 **같은 것을** 본다.
 *
 * 본문은 환자 건강정보라 암호문으로 저장한다(첨부·인테이크와 같은 규칙).
 */
import "server-only";

import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";

export type FollowUp = { at: string; by: string; text: string };
type StoredFollowUp = { at?: string; by?: string; text_encrypted?: string | null };

export const FOLLOWUP_MAX_LEN = 4000;
const MAX_ITEMS = 50;

/** 저장된 것 → 읽을 수 있는 글. 복호화가 안 되는 줄은 조용히 빼지 않고 표시를 남긴다. */
export function readFollowUps(raw: unknown): FollowUp[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x: StoredFollowUp) => ({
      at: String(x.at || ""),
      by: String(x.by || ""),
      text: decryptStringNullable(x.text_encrypted ?? null) ?? "(읽지 못한 내용 — 원본 확인 필요)",
    }));
}

/** 새 글 한 줄을 뒤에 붙인 «저장용» 배열을 만든다(암호화까지). 상한을 넘으면 오래된 것부터 뺀다. */
export function appendFollowUp(raw: unknown, text: string, by: string): StoredFollowUp[] {
  const prev: StoredFollowUp[] = Array.isArray(raw) ? raw.filter((x) => x && typeof x === "object") : [];
  const entry: StoredFollowUp = {
    at: new Date().toISOString(),
    by: by.slice(0, 120),
    text_encrypted: encryptStringNullable(text.slice(0, FOLLOWUP_MAX_LEN)),
  };
  return [...prev, entry].slice(-MAX_ITEMS);
}

/** AI 케이스 브리프 프롬프트에 넣을 텍스트. 없으면 빈 문자열. */
export function followUpsForBrief(raw: unknown): string {
  const list = readFollowUps(raw);
  if (!list.length) return "";
  return list.map((f) => `- (${f.at.slice(0, 10)}) ${f.text}`).join("\n");
}

/**
 * 브리프가 «낡았는지» 판정할 때 쓰는 지문. 첨부 서명과 같은 이유로 내용이 아니라 개수·시각만 쓴다
 * (지문에 환자 글이 들어가면 그게 평문으로 DB 에 남는다).
 */
export function followUpSig(raw: unknown): string {
  if (!Array.isArray(raw)) return "0";
  return `${raw.length}:${raw.map((x: any) => String(x?.at || "")).join("|")}`;
}
