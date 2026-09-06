import "server-only";

/**
 * content_overrides 를 «끝까지» 읽는다. PostgREST 는 db-max-rows(기본 1,000)에서 **에러 없이** 잘린다 —
 * `scripts/i18n-backport-overrides.mjs` 가 2026-08 에 같은 함정을 적어 뒀다. 콘텐츠 파일 문구가 편집기에 들어오면서
 * (2026-09-06) 오버라이드가 1,000행을 넘을 수 있게 됐으니 세 조회(홈·사전·파일) 전부 이걸로 읽는다.
 * 실패하면 «그때까지 읽은 것»을 돌려준다 — 화면은 파일 기본값으로 폴백하므로 안 깨진다.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {(q:any)=>any} [applyFilter] 예: (q) => q.like("content_key", "home.%")
 */
export async function fetchOverrideRows(supabase, applyFilter) {
  const PAGE = 500;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("content_overrides")
      .select("content_key, lang, value")
      .order("content_key", { ascending: true })
      .order("lang", { ascending: true })
      .range(from, from + PAGE - 1);
    if (applyFilter) q = applyFilter(q);
    const { data, error } = await q;
    if (error || !Array.isArray(data)) return all;
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}
