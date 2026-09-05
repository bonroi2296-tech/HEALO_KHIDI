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

import { randomUUID } from "node:crypto";
import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";

export type FollowUp = { id: string; at: string; by: string; text: string; removedAt: string | null };
type StoredFollowUp = { id?: string; at?: string; by?: string; text_encrypted?: string | null; removed_at?: string | null };

export const FOLLOWUP_MAX_LEN = 4000;

/** 환자 글 표시값의 정본은 patientMessages.ts(순수·클라이언트에서도 씀). 여기선 되내보내기만. */
import { BY_PATIENT_LINK } from "./patientMessages";
export { BY_PATIENT_LINK };
const MAX_ITEMS = 50;

/** 저장된 것 → 읽을 수 있는 글. 복호화가 안 되는 줄은 조용히 빼지 않고 표시를 남긴다. */
export function readFollowUps(raw: unknown): FollowUp[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x: StoredFollowUp) => ({
      // 고치기·지우기의 «대상 지목»에 쓰는 안정적 식별자. 옛 글엔 없으므로 시각으로 갈음한다
      //   (2026-08-14 감사: 시각만으로 지우면 같은 초에 들어온 다른 줄까지 함께 지워질 수 있었다).
      id: String(x.id || x.at || ""),
      at: String(x.at || ""),
      by: String(x.by || ""),
      text: decryptStringNullable(x.text_encrypted ?? null) ?? "(읽지 못한 내용 — 원본 확인 필요)",
      // 환자가 자기 화면에서 치운 것. **여기선 빼지 않고 표시만 붙인다** — 냈다가 지우고
      // «안 냈다»고 하는 걸 막으려면 낸 사실이 남아야 한다(2026-08-06 PO).
      removedAt: x.removed_at ?? null,
    }));
}

/** 새 글 한 줄을 뒤에 붙인 «저장용» 배열을 만든다(암호화까지). 상한을 넘으면 오래된 것부터 뺀다. */
export function appendFollowUp(raw: unknown, text: string, by: string): StoredFollowUp[] {
  const prev: StoredFollowUp[] = Array.isArray(raw) ? raw.filter((x) => x && typeof x === "object") : [];
  const entry: StoredFollowUp = {
    // 시각은 겹칠 수 있다(환자·코디가 같은 초에 쓰면). 대상 지목은 이 id 로 한다.
    id: randomUUID(),
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

/**
 * 대상 한 줄의 위치. **id 우선**, 없으면(옛 글) 시각으로 갈음한다.
 * ⚠️ 항상 «하나»만 돌려준다 — 시각이 겹치는 다른 줄까지 건드리면 안 된다(2026-08-14 감사).
 */
function indexOfTarget(prev: StoredFollowUp[], key: string): number {
  const byId = prev.findIndex((x) => x.id && String(x.id) === key);
  if (byId >= 0) return byId;
  // 옛 글(무id) 폴백 — id 가 «없는» 줄 중에서만 찾는다. id 가 있는 줄은 시각으로 안 잡힌다.
  return prev.findIndex((x) => !x.id && String(x.at || "") === key);
}

/** 한 줄을 «고친» 저장용 배열. 화면이 가진 id(옛 글은 시각)로 찾는다. */
export function editFollowUp(raw: unknown, key: string, text: string): StoredFollowUp[] | null {
  const prev: StoredFollowUp[] = Array.isArray(raw) ? raw.filter((x) => x && typeof x === "object") : [];
  const i = indexOfTarget(prev, key);
  if (i < 0) return null;
  const next = [...prev];
  // 적은 시각은 그대로 둔다 — 언제 들어온 정보인지가 판단 근거라 고쳐 쓰면 안 된다.
  next[i] = { ...next[i], text_encrypted: encryptStringNullable(text.slice(0, FOLLOWUP_MAX_LEN)) };
  return next;
}

/** 한 줄을 «지운» 저장용 배열. 잘못 적은 내용이 의료진에게 그대로 가는 걸 막는 통로다. */
export function removeFollowUp(raw: unknown, key: string): StoredFollowUp[] | null {
  const prev: StoredFollowUp[] = Array.isArray(raw) ? raw.filter((x) => x && typeof x === "object") : [];
  const i = indexOfTarget(prev, key);
  if (i < 0) return null;
  // filter 가 아니라 «그 자리 하나»만 뺀다 — 예전엔 시각이 같은 줄이 전부 지워질 수 있었다.
  return prev.filter((_, idx) => idx !== i);
}
