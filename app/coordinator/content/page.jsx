import ContentEditorClient from "./ContentEditorClient";
import {
  HOME_CONTENT_REGISTRY,
  getDefaultValueObject,
  EDITABLE_LANGS,
} from "@/lib/content/registry";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

// 편집 대상은 공개 홈 문구(비민감). 쓰기는 API 가 권한 게이트. 페이지 접근은 코디 레이아웃이 게이트.
export const dynamic = "force-dynamic";

export default async function ContentEditorPage() {
  const db = supabaseAdmin;
  let overrides = [];
  let logs = [];
  try {
    const [o, l] = await Promise.all([
      db.from("content_overrides").select("content_key, lang, value").like("content_key", "home.%"),
      db.from("content_change_log").select("*").order("changed_at", { ascending: false }).limit(50),
    ]);
    overrides = o.data || [];
    logs = l.data || [];
  } catch {
    // 조회 실패해도 편집기는 기본값으로 뜬다
  }

  const ovMap = {};
  for (const r of overrides) ovMap[`${r.content_key}|${r.lang}`] = r.value;

  const items = HOME_CONTENT_REGISTRY.map((r) => {
    const def = getDefaultValueObject(r.key) || {};
    const values = {};
    let overridden = false;
    for (const lang of EDITABLE_LANGS) {
      const ov = ovMap[`${r.key}|${lang}`];
      values[lang] = ov !== undefined ? ov : def[lang] ?? "";
      if (ov !== undefined) overridden = true;
    }
    return { key: r.key, section: r.section, label: r.label, values, overridden };
  });

  return <ContentEditorClient items={items} logs={logs} langs={EDITABLE_LANGS} />;
}
