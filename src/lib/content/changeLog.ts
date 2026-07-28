/**
 * 콘텐츠 변경 이력의 「이전 값」 보정.
 *
 * content_change_log.old_value 는 content_overrides(코디가 손으로 고친 행)에서만 떠 온다.
 * → 그 문구를 **처음** 고치는 순간에는 오버라이드 행이 없어 항상 null 이고,
 *   화면에는 "(없음)" 으로만 떴다(= 원래 문구가 뭐였는지 이력으로 확인 불가).
 * 실제 원문은 사전(t)·홈 레지스트리의 기본값이므로 조회 시점에 그걸 메워 준다.
 * 지난 이력도 같이 복구된다(저장된 null 을 고치는 게 아니라 읽을 때 채우므로).
 */

type LogRow = {
  content_key?: string;
  lang?: string;
  old_value?: string | null;
  [k: string]: unknown;
};

// 두 helper 는 JS 라 반환 타입이 넓다(홈 트리 노드 / 사전 값 객체). 언어 키로 뽑아 쓰기만 하므로
// 느슨하게 받고 문자열 여부는 아래에서 확인한다.
type Defaults = {
  /** 이 키가 홈 레지스트리 소속인가 (아니면 사전 키) */
  isRegistryKey: (key: string) => boolean;
  /** 홈 레지스트리 기본값 { lang: value } (없으면 null) */
  getDefaultValueObject: (key: string) => any;
  /** 사전 기본값 { lang: value } (없으면 null) */
  getI18nValues: (key: string) => any;
};

/** old_value 가 비어 있으면 기본값으로 채우고 from_default 를 단다. 못 찾으면 원본 그대로. */
export function withOldValueDefaults<T extends LogRow>(rows: T[], d: Defaults): T[] {
  return (rows || []).map((lg) => {
    if (!lg) return lg;
    if (lg.old_value != null && lg.old_value !== "") return lg;
    const key = lg.content_key;
    const lang = lg.lang;
    if (!key || !lang) return lg;
    // ⚠️ 층을 «명시»로 고른다 — 순서 폴백(홈 || 사전)은 틀린 값을 준다.
    // 예: `process.title` 은 홈 트리에도 같은 경로가 있어서 홈을 먼저 보면 «Как это работает»
    // 가 잡히지만, 그 키로 실제 화면에 떠 있던 문구는 사전의 «Ваш путь» 다.
    // 잘못된 이전 값에 「기본값」 배지까지 달리면 이 수리가 겨냥한 문제를 되레 악화시킨다.
    const def = d.isRegistryKey(key) ? d.getDefaultValueObject(key) : d.getI18nValues(key);
    const v = def ? def[lang] : "";
    return typeof v === "string" && v ? { ...lg, old_value: v, from_default: true } : lg;
  });
}
