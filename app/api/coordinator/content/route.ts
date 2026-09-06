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
// 콘텐츠 파일 문구(치료법·5축·암종·FAQ·수술 후 관리·제휴 병원) — 2026-09-06 부터 같은 편집기에서 고친다.
import { CONTENT_FILE_REGISTRY, CONTENT_FILE_KEYS, getContentFileDefault, therapyPagePath } from "@/lib/content/contentFiles";
import { invalidateContentCache } from "@/lib/content/overrides";
import { withOldValueDefaults } from "@/lib/content/changeLog";
import { describeKey } from "@/lib/content/keyLocation";
import { searchI18nKeys, isValidI18nKey, getI18nValues, normalizeForSearch } from "@/lib/i18n";

const db = supabaseAdmin as any;

// 홈 문구의 «사람이 읽는 이름»(예: 「통계 / 항목1 · 문구」) — 레지스트리가 이미 갖고 있다.
const HOME_LABEL = new Map<string, { section: string; label: string }>(
  HOME_CONTENT_REGISTRY.map((r: any) => [r.key, { section: r.section, label: r.label }])
);
const FILE_LABEL = new Map<string, { section: string; label: string }>(
  CONTENT_FILE_REGISTRY.map((r: any) => [r.key, { section: r.section, label: r.label }])
);
const FILE_PARTS = new Map<string, any>(CONTENT_FILE_REGISTRY.map((r: any) => [r.key, r.whereParts]));
// 콘텐츠 파일 문구의 「어느 화면·어느 자리」 — describeKey 위에 ①치료법은 «그 카드를 실제로 그리는 암종 페이지» 주소
// (카드는 암종마다 5개만 그린다) ②코디 언어로 조립할 조각(whereParts)을 얹는다.
function placeOf(key: string) {
  const place: any = describeKey(key, homeLabelOf);
  if (!CONTENT_FILE_KEYS.has(key)) return place;
  const [head, id] = key.split(".");
  if (head === "therapy") {
    const p = therapyPagePath(id);
    place.path = p;
    place.reach = p;
  }
  place.whereParts = FILE_PARTS.get(key) || null;
  return place;
}
// 검색 결과 상한 안에서 층이 통째로 밀리지 않게 — 사전(≤50)·홈(구역째)·파일(≤60) 을 각자 잘라 넣는다(2026-09-06 리뷰:
// 「cancer」 한 단어에 파일 165줄이 사전 50줄을 전부 밀어냈다).
const FILE_MATCH_CAP = 60;
// 홈·콘텐츠 파일 둘 다 사람 이름표가 있다 — 「어느 화면 / 어느 자리」 조립에 같이 쓴다.
const homeLabelOf = (k: string) => HOME_LABEL.get(k) || FILE_LABEL.get(k) || null;
const isLayeredKey = (k: string) => REGISTRY_KEYS.has(k) || CONTENT_FILE_KEYS.has(k);
const layeredDefault = (k: string) =>
  REGISTRY_KEYS.has(k) ? getDefaultValueObject(k) : getContentFileDefault(k);

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
      // 2026-07-29: 50건 고정이라 **그 앞의 이력이 통째로 안 보였다**(실측 247건 중 50건만).
      // offset/limit 으로 「더 보기」를 지원하고, 전체 건수도 같이 준다(«몇 건 중 몇 건»을 보여주려고).
      const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 50, 1), 200);
      const offset = Math.max(Number(request.nextUrl.searchParams.get("offset")) || 0, 0);
      const { data: logs, count } = await db
        .from("content_change_log")
        .select("*", { count: "exact" })
        .order("changed_at", { ascending: false })
        // ⚠️ 2차 정렬 필수: 한 번의 저장이 배치 전체에 **같은 changed_at** 을 박는다
        //    (실측: 같은 시각 묶음 14개, 가장 큰 묶음 37줄 → 50건 경계에 반드시 걸친다).
        //    시각만으로 정렬하면 페이지마다 동률 순서가 달라져 **같은 줄이 두 번 뜨고 다른 줄은 빠진다**
        //    (독립 리뷰 지적). id 는 uuid 라 의미는 없지만 «항상 같은 순서»를 보장한다.
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);
      // 2026-07-28: 이력의 「이전 값」이 (없음) 으로만 뜨던 것 수리 — 사유는 changeLog.ts 주석.
      const enriched = withOldValueDefaults(logs || [], {
        isRegistryKey: isLayeredKey,
        getDefaultValueObject: layeredDefault,
        getI18nValues,
      });
      // 「이게 어느 화면의 무엇인가」를 같이 내려준다 — 코드 이름만으로는 코디가 못 찾는다.
      const withPlace = enriched.map((lg: any) => ({
        ...lg,
        place: placeOf(lg?.content_key),
      }));
      return NextResponse.json({
        ok: true,
        logs: withPlace,
        total: typeof count === "number" ? count : withPlace.length,
        offset,
        limit,
      });
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

      // 콘텐츠 파일 문구: 키·이름표·기본값·오버라이드 중 하나라도 맞으면 매치(줄 단위 — 홈처럼 구역째 안 묶는다,
      // 암종 상세 한 구역이 30줄이 넘어 통째로 오면 눈으로 못 훑는다).
      const fileMatches = CONTENT_FILE_REGISTRY.map((r: any) => ({
        key: r.key,
        section: `콘텐츠 · ${r.section}`,
        label: r.label,
        values: getContentFileDefault(r.key) || {},
      })).filter(
        (r) =>
          r.key.toLowerCase().includes(ql) ||
          ovMatchedKeys.has(r.key) ||
          normalizeForSearch(r.label).includes(ql) ||
          EDITABLE_LANGS.some((l) => normalizeForSearch((r.values as any)[l]).includes(ql))
      );

      // 사전 텍스트(전 화면): 기본값 매치 + 오버라이드 값 매치 추가
      const dictMatches = searchI18nKeys(q, 50).map((m: any) => ({
        key: m.key,
        section: "화면 텍스트",
        label: m.key,
        values: m.values,
      }));
      const dictSeen = new Set(dictMatches.map((m) => m.key));
      for (const key of ovMatchedKeys) {
        if (dictSeen.has(key) || REGISTRY_KEYS.has(key) || CONTENT_FILE_KEYS.has(key)) continue;
        const values = getI18nValues(key);
        if (values) dictMatches.push({ key, section: "화면 텍스트", label: key, values });
      }

      const fileTotal = fileMatches.length;
      const results = [...homeMatches, ...dictMatches, ...fileMatches.slice(0, FILE_MATCH_CAP)].slice(0, 120);
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
        const matched = r.section === "화면 텍스트" || CONTENT_FILE_KEYS.has(r.key) ? true : homeDirect.has(r.key);
        // 2026-07-31 PO 지적: 검색 결과가 «costCalc.disclaimer» 같은 코드 이름만 줘서
        // «각각의 텍스트가 어디에 박혀 있는지 찾기가 어렵다». 변경 이력엔 이미 붙어 있던
        // 「어느 화면인가 + 화면 열기」를 검색 결과에도 준다(같은 describeKey 재사용).
        const place = placeOf(r.key);
        // 묶음 제목도 「화면 텍스트」 한 덩어리 대신 화면별로 — 「stage」처럼 넓게 걸리는 말이
        // 수십 줄 나올 때 화면 단위로 갈라져야 눈으로 훑을 수 있다.
        const section =
          r.section === "화면 텍스트" && place.screen ? place.screen : r.section;
        return { key: r.key, section, label: r.label, values, editedLangs, matched, place };
      });
      // 화면이 같은 줄끼리 붙어 있어야 편집기가 묶음 제목을 한 번만 그린다(원래 순서는 안정 정렬로 보존).
      const grouped = merged
        .map((r, i) => ({ r, i }))
        .sort((a, b) => a.r.section.localeCompare(b.r.section) || a.i - b.i)
        .map(({ r }) => r);
      // truncated = 상한에 걸려 «못 보여준 줄»이 있다(파일 층). 화면은 검색어를 좁히라는 안내에 쓴다.
      return NextResponse.json({ ok: true, results: grouped, truncated: fileTotal > FILE_MATCH_CAP || results.length >= 120 });
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
      (REGISTRY_KEYS.has(u.key) || CONTENT_FILE_KEYS.has(u.key) || isValidI18nKey(u.key)) &&
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
