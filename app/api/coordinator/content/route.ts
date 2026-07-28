/**
 * 코디 콘텐츠 편집 — 홈 문구 오버라이드 저장/조회
 *
 * GET  /api/coordinator/content   — 현재 오버라이드 + 변경로그(편집기 로드용)
 * POST /api/coordinator/content   — 저장 { updates: [{ key, lang, value }] }
 *
 * 권한: admin 또는 coordinator(app_metadata.role). 레지스트리에 등록된 키만 허용.
 * 저장 시 변경로그 기록 + 홈 캐시 무효화(즉시 반영).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { REGISTRY_KEYS, EDITABLE_LANGS, HOME_CONTENT_REGISTRY, getDefaultValueObject } from "@/lib/content/registry";
import { invalidateContentCache } from "@/lib/content/overrides";
import { withOldValueDefaults } from "@/lib/content/changeLog";
import { searchI18nKeys, isValidI18nKey, getI18nValues, normalizeForSearch } from "@/lib/i18n";

const db = supabaseAdmin as any;

// 2026-07-24 권한 정비(B, KNOWN_ISSUES 참조): checkAdminAuth 직접 호출은 rate limit·표준 응답이
// 안 걸리는 우회로였음 → 표준 스태프 가드(requirePortalAuth staffOnly = admin+coordinator)로 교체.
async function requireStaff(
  request: NextRequest
): Promise<{ ok: boolean; email: string; response?: Response }> {
  const a = await requirePortalAuth(request, { staffOnly: true });
  if (!a.success) return { ok: false, email: "unknown", response: a.response };
  return { ok: true, email: a.email || "unknown" };
}

export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff.ok) return staff.response ?? NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const q = request.nextUrl.searchParams.get("q");
  const wantLogs = request.nextUrl.searchParams.get("logs");
  try {
    if (wantLogs) {
      const { data: logs } = await db
        .from("content_change_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(50);
      // 2026-07-28: 이력의 「이전 값」이 (없음) 으로만 뜨던 것 수리 — 사유는 changeLog.ts 주석.
      const enriched = withOldValueDefaults(logs || [], {
        isRegistryKey: (k: string) => REGISTRY_KEYS.has(k),
        getDefaultValueObject,
        getI18nValues,
      });
      return NextResponse.json({ ok: true, logs: enriched });
    }
    if (q && q.trim()) {
      const ql = normalizeForSearch(q);

      // 오버라이드 전체를 먼저 읽는다 — ①코디가 고친 값도 검색 대상(고친 문구로 재검색 가능)
      // ②결과 병합용. 테이블은 코디가 손으로 고친 행뿐이라 작다.
      const { data: ovAll } = await db.from("content_overrides").select("content_key, lang, value");
      const ovMap: Record<string, string> = {};
      const ovMatchedKeys = new Set<string>();
      for (const r of ovAll || []) {
        ovMap[`${r.content_key}|${r.lang}`] = r.value;
        if (normalizeForSearch(r.value).includes(ql)) ovMatchedKeys.add(r.content_key);
      }

      // 홈 문구: 기본값·오버라이드·키 중 하나라도 맞으면 매치.
      // 맞은 키가 속한 섹션(같은 화면 블록)을 통째로 반환 — 제목·부제·카드 문구를 한 번에 고치게.
      const homeAll = HOME_CONTENT_REGISTRY.map((r) => ({
        key: r.key,
        section: `홈 · ${r.section}`,
        label: r.label,
        values: getDefaultValueObject(r.key) || {},
      }));
      const homeDirect = new Set<string>();
      const homeSections = new Set<string>();
      for (const r of homeAll) {
        const hit =
          r.key.toLowerCase().includes(ql) ||
          ovMatchedKeys.has(r.key) ||
          EDITABLE_LANGS.some((l) => normalizeForSearch((r.values as any)[l]).includes(ql));
        if (hit) {
          homeDirect.add(r.key);
          homeSections.add(r.section);
        }
      }
      const homeMatches = homeAll.filter((r) => homeSections.has(r.section));

      // 사전 텍스트(전 화면): 기본값 매치 + 오버라이드 값 매치 추가
      const dictMatches = searchI18nKeys(q, 50).map((m: any) => ({
        key: m.key,
        section: "화면 텍스트",
        label: m.key,
        values: m.values,
      }));
      const dictSeen = new Set(dictMatches.map((m) => m.key));
      for (const key of ovMatchedKeys) {
        if (dictSeen.has(key) || REGISTRY_KEYS.has(key)) continue;
        const values = getI18nValues(key);
        if (values) dictMatches.push({ key, section: "화면 텍스트", label: key, values });
      }

      const results = [...homeMatches, ...dictMatches].slice(0, 120);
      const merged = results.map((r) => {
        const values: Record<string, string> = {};
        // editedLangs = 코디가 «직접 고친» 언어 목록. 편집기가 줄마다 언어 배지로 표시한다.
        // 왜 «값이 있는 언어»가 아니라 이것인가: 사실상 모든 문구가 6개 언어를 다 갖고 있어서
        // (실측 205줄·배지 1,230개 중 빈 언어 0개) «내용 있음»으로는 아무것도 구분되지 않는다.
        const editedLangs: string[] = [];
        for (const l of EDITABLE_LANGS) {
          const o = ovMap[`${r.key}|${l}`];
          values[l] = o !== undefined ? o : ((r.values as any)[l] ?? "");
          if (o !== undefined) editedLangs.push(l);
        }
        // matched=false 인 홈 항목은 "직접 맞진 않았지만 같은 블록이라 함께 온" 줄(편집기에서 배지 표시)
        const matched = r.section === "화면 텍스트" ? true : homeDirect.has(r.key);
        return { key: r.key, section: r.section, label: r.label, values, editedLangs, matched };
      });
      return NextResponse.json({ ok: true, results: merged });
    }
    return NextResponse.json({ ok: true, results: [] });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff.ok) return staff.response ?? NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const updates = Array.isArray(body?.updates) ? body.updates : [];
  const valid = updates.filter(
    (u: any) =>
      u &&
      (REGISTRY_KEYS.has(u.key) || isValidI18nKey(u.key)) &&
      EDITABLE_LANGS.includes(u.lang) &&
      typeof u.value === "string"
  );
  if (valid.length === 0) {
    return NextResponse.json({ ok: false, error: "no_valid_updates" }, { status: 400 });
  }

  try {
    const keys = [...new Set(valid.map((u: any) => u.key))];
    const { data: existing } = await db
      .from("content_overrides")
      .select("content_key, lang, value")
      .in("content_key", keys);
    const oldMap = new Map(
      (existing || []).map((r: any) => [`${r.content_key}|${r.lang}`, r.value])
    );

    const now = new Date().toISOString();
    // 빈 값 = "기본값으로 되돌리기" → 오버라이드 행 삭제. dict(t())·home(병합) 동작 일관.
    // (빈 오버라이드를 남기면 t() 는 무시하고 home 은 공란화해 불일치 + 오탐 성공.)
    const toUpsert = valid.filter((u: any) => u.value !== "");
    const toDelete = valid.filter((u: any) => u.value === "");

    if (toUpsert.length > 0) {
      const rows = toUpsert.map((u: any) => ({
        content_key: u.key,
        lang: u.lang,
        value: u.value,
        updated_at: now,
        updated_by: staff.email,
      }));
      const { error: upErr } = await db
        .from("content_overrides")
        .upsert(rows, { onConflict: "content_key,lang" });
      if (upErr) return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    for (const u of toDelete) {
      const { error: delErr } = await db
        .from("content_overrides")
        .delete()
        .eq("content_key", u.key)
        .eq("lang", u.lang);
      if (delErr) return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 쓰기 성공 → 캐시 무효화(즉시 반영). 로그는 best-effort(실패해도 저장은 성공).
    invalidateContentCache();
    try {
      const logRows = valid.map((u: any) => ({
        content_key: u.key,
        lang: u.lang,
        old_value: oldMap.get(`${u.key}|${u.lang}`) ?? null,
        new_value: u.value,
        editor_email: staff.email,
        changed_at: now,
      }));
      await db.from("content_change_log").insert(logRows);
    } catch {
      // 로그 실패는 저장을 되돌리지 않는다(감사로그는 부가).
    }

    return NextResponse.json({ ok: true, saved: valid.length });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
