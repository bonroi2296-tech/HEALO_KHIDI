/**
 * 완성도 루브릭 (Definition of Done) — "완성이란 무엇인가"의 단일 SoR (기계판독용)
 *
 * 왜 이 파일이 있나 (2026-07-15 — OKKY "Codex 72시간 사이클" 칼럼에서 착안):
 *   우리 가드(check:content 등)는 전부 NEGATIVE("옛 브랜드 넣지 마") 뿐이다.
 *   "화면/기능이 '완성'이려면 만족해야 할 조건"이라는 POSITIVE 판단 기준이 없어,
 *   PO의 눈(스크린샷)이 아직도 유일한 "완성 판정자(Manager)"다.
 *   → 이 루브릭이 그 Manager의 채점표다. 완성도 감사 루프(.claude/skills/completeness-audit)가
 *     이 배열을 읽어 대상(diff·화면)을 평가하고, check:completeness 가 SoR 자체의 부패를 막는다.
 *
 * 사람이 읽는 판(설명·배경)은 docs/DEFINITION_OF_DONE.md. 이 파일과 그 문서는 함께 움직인다.
 *
 * 반복 미완성 7유형 (docs/POSTMORTEMS.md 부류에서 승격):
 *   1 i18n/다국어 · 2 조용한 실패 · 3 문서-현실 드리프트 · 4 stale 콘텐츠
 *   5 죽은 링크 · 6 cron/KPI 조용한 0 · 7 UI 반쪽/시각회귀
 *
 * verify 값:
 *   'auto'     — 기계가 정적으로 판정 가능(대개 이미 있는 check:* 가드가 담당). CI 게이트.
 *   'semantic' — 규칙(regex)으로 못 잡고 "의미"로 봐야 함 → 감사 루프의 Manager subagent 몫.
 *   'manual'   — 실기기·실메일·실통화 등 사람 1회 확인이 불가피(정직하게 표기).
 */

// 유형 카탈로그 (단일 SoR — 라벨은 여기에 맞춘다)
export const TYPES = {
  1: "i18n/다국어 누락 (한글 누출·미동기)",
  2: "조용한 성공으로 위장한 실패 (빌드통과 ≠ 동작)",
  3: "문서-현실 드리프트 (장부가 코드 현실과 어긋남)",
  4: "옛 브랜드/도메인/stale 콘텐츠 잔재",
  5: "죽은 링크 / 없는 라우트 → 404",
  6: "cron/KPI 가 조용히 항상 0건",
  7: "UI 반쪽 구현 / 시각 회귀 (잘림·레이아웃)",
};

/**
 * 각 완성 기준(Definition of Done) 항목.
 * @typedef {Object} DoDItem
 * @property {string} id          - 안정적 식별자 (DoD-<유형>-<슬러그>)
 * @property {number} type        - TYPES 의 키(1~7)
 * @property {string} title       - 한 줄 요약
 * @property {string[]} done      - "완성"의 positive 조건들(모두 참이어야 완성)
 * @property {'auto'|'semantic'|'manual'} verify - 판정 주체
 * @property {string} scope       - 적용 대상(어떤 화면/코드에 이 기준이 걸리나)
 * @property {string[]} guards    - 이 기준을 (부분이라도) 지키는 현존 가드
 * @property {number[]} postmortems - 이 유형이 터진 POSTMORTEMS 번호(근거·재발 사슬)
 * @property {string} [gap]       - 현 가드가 못 막는 구멍(축 C 확장 지점). 있으면 semantic/manual 로 남음
 */

/** @type {DoDItem[]} */
export const RUBRIC = [
  // ── 유형 1 · i18n/다국어 ────────────────────────────────────────────────
  {
    id: "DoD-1-i18n-parity",
    type: 1,
    title: "공개 화면은 6개어 전부에서 완결된다",
    done: [
      "활성 6개 언어(ko·en·ru·kz·zh·ja)가 같은 i18n 키 집합을 가진다(누락 0)",
      "렌더 텍스트에 하드코딩 한글 누출 0 (비-ko 화면에 한국어가 새지 않는다)",
      "**반대 방향도** 0 — ko 화면에 영어 라벨이 하드코딩돼 있지 않다(#108)",
      "렌더 언어는 useLang()(서버 initialLang 주입)로 결정 — SSR이 항상 en으로 굳지 않는다",
    ],
    verify: "auto",
    scope: "app/** 공개 라우트 + src/components/** 공개·환자 컴포넌트 + src/lib/i18n/index.js",
    guards: ["check:content §i18n키패리티", "check:content §한글누출(isPublicFacingFile 판정)", "check:content §환자i18n(공개/환자 전체)", "check:content §27 하드코딩영문라벨(ClientShell)", "check:i18n"],
    postmortems: [3, 67, 81, 2, 30, 38, 39, 108],
    gap: "✅ 축 C(2026-07-15): 폴더 화이트리스트 → isPublicFacingFile(공개 화이트리스트 ∧ ¬백오피스 ∧ ¬api) 판정으로 확장(공개 마케팅/환자 퍼널 전체 스캔, #81식 경계누출 차단). 잔여 사각: 중괄호식 {cond?'한글':…}·객체 label:'한글'은 여전히 정적분석 밖(코드리뷰 몫). ⚠️ **방향 사각(2026-07-22 #108)**: 위 가드는 전부 '비-ko 화면의 한글'만 본다 — 그 반대(ko 화면의 영어)는 3개월간 무검사였고 푸터 사업자 정보 10줄이 그대로 방치됐다. i18n 키 패리티도 못 잡는다(**키가 0개면 0개끼리 일치**). §27이 ClientShell 한 파일에 한해 이 방향을 처음 메웠고, 전 저장소 일반화는 의미 판정이 필요해 감사 루프 몫.",
  },

  // ── 유형 2 · 조용한 실패 ────────────────────────────────────────────────
  {
    id: "DoD-2-no-silent-success",
    type: 2,
    title: "성공 보고는 실제 동작으로 뒷받침된다 (빌드통과 ≠ 동작)",
    done: [
      "핵심 경로의 성공을 상태코드·DB 실측으로 확인했다(화면상 OK 만으로 '됐다' 하지 않는다)",
      "try/catch·service_role 폴백이 실패를 조용히 삼키지 않는다(실패 시 로그/센트리로 드러난다)",
      "'수행했다'고 보고한 변경이 실제 diff/커밋에 존재한다(보고 ↔ 코드 일치)",
    ],
    verify: "semantic",
    scope: "새 API 라우트·마이그레이션·cron·보안수정 등 '동작'이 걸린 모든 변경",
    guards: ["chat-smoke cron", "E2E smoke/full", "check:err-exposure"],
    postmortems: [35, 52, 55, 33, 54, 48, 58, 59, 63],
    gap: "정적 규칙으로 '진짜 동작했나'를 판정 불가 — 감사 루프 Manager가 변경 성격에 맞는 실측(상태코드·DB·재현)을 요구/확인해야 함.",
  },

  // ── 유형 3 · 문서-현실 드리프트 (골격 첫 타깃) ───────────────────────────
  {
    id: "DoD-3-doc-reality-sync",
    type: 3,
    title: "코드를 고치면 장부(문서 SoR)도 같은 변경에서 닫힌다",
    done: [
      "이슈를 해결하면 KNOWN_ISSUES.md의 해당 항목을 같은 작업에서 '종결'로 닫는다",
      "핸드오프(PROJECT_CONTEXT 최상단)의 '보류·검증 못 함'이 실제 코드 현실과 일치한다",
      "문서가 가리키는 파일 경로·npm 스크립트·라우트가 실재한다(죽은 참조 0)",
    ],
    verify: "semantic",
    scope: "docs/KNOWN_ISSUES.md, docs/PROJECT_CONTEXT.md(핸드오프), CLAUDE.md, DESIGN.md, src/lib/manuals/index.js",
    guards: ["/doc-health (주간·수동)"],
    postmortems: [63, 74, 75, 90],
    gap: "자동 감지 없음 — /doc-health가 주간·수동이라 그 사이 드리프트를 후속 세션이 '허위 재발견'. 감사 루프가 doc-health 로직을 상시 루프화하는 것이 이번 골격의 핵심.",
  },

  // ── 유형 4 · stale 콘텐츠 ───────────────────────────────────────────────
  {
    id: "DoD-4-content-freshness",
    type: 4,
    title: "고객이 보는 콘텐츠에 옛 잔재·시효 지난 정보가 없다",
    done: [
      "옛 브랜드/도메인/이메일 잔재 0 (구체 금지목록은 check:content 금지토큰이 관리)",
      "시효가 걸린 문구(비자 규정·'~까지'·재직 명단)가 만료되지 않았다",
      "지어낸 후기·근거 없는 수치(가짜 매출·'정확도 90%')가 라이브에 없다",
    ],
    verify: "auto",
    scope: "app/**, src/**, components/** (고객 노출 텍스트·정적 데이터)",
    guards: ["check:content §금지토큰", "check:content §조작후기", "check:visa-freshness"],
    postmortems: [1, 4, 49, 66, 57, 11, 46, 56],
    gap: "신선도 오너 부재 — 날짜·재직 명단은 '시간이 지나면 자동으로 stale'인데 만료 개념이 개별 가드에만. 새 stale 문구 유형은 사후에 룰 추가하는 구조.",
  },

  // ── 유형 5 · 죽은 링크 ──────────────────────────────────────────────────
  {
    id: "DoD-5-no-dead-links",
    type: 5,
    title: "화면·알림의 모든 링크는 실재하는 라우트로 간다",
    done: [
      "목록→상세 동적 링크(/x/${id})의 [id] 라우트가 실재한다",
      "알림/딥링크(종·인박스·품질경고)가 파라미터까지 읽는 화면으로 간다(막다른길 0)",
      "네비게이션 대상이 존재하는 페이지다(클릭 시 404 0)",
    ],
    verify: "auto",
    scope: "app/** + src/** router.push·href, src/lib/notifications/** link 조립",
    guards: ["check:content §동적링크404(app+src)", "check:content §알림link404", "check:deeplinks (쿼리 딥링크를 그 화면이 실제로 읽는지)"],
    postmortems: [31, 73, 83, 37],
    gap: "✅ 축 C(2026-07-15): 동적링크 404 검사를 app/ → src/(컴포넌트 내부 네비)까지 확장. #73(notifications link)은 이미 §알림link404로 해소. ✅ 2026-08-28: 「파라미터 미해석 화면」이 더는 코드리뷰 몫이 아니다 — check:deeplinks 가 `link:` 의 쿼리 딥링크를 모아 그 화면이 그 이름을 실제로 읽는지 대조한다(삼항식 포함, 자체시험 8가지). 이 사각은 세 번 터졌다(2026-07-13 옛 대시보드 · 2026-08-28 코디 메시지함 · 같은 날 검사가 스스로 잡은 증상경보). **404 가 아니라 «목록»이 떠서 아무도 고장인 줄 몰랐던 것이 이 부류의 본질**이다. 잔여 사각: 변수/절대URL(${baseUrl}…)로 조립한 링크, 그리고 «읽기는 읽는데 목록을 다시 안 불러» 빈 화면이 되는 것(정적분석 밖 — 코드리뷰 몫).",
  },

  // ── 유형 6 · cron/KPI 조용한 0 ──────────────────────────────────────────
  {
    id: "DoD-6-cron-nonzero",
    type: 6,
    title: "cron/KPI는 잘못된 가정으로 조용히 0을 내지 않는다",
    done: [
      "쿼리가 실재하는 테이블·컬럼을 참조한다(없는 컬럼 → 조용한 빈결과 0)",
      "암호화 컬럼은 집계 전 복호화한다(복호화 누락 → 0건)",
      "한 곳의 가정(inquiry_id↔patient_id 등)을 고치면 같은 가정을 쓰는 모든 소비자를 전수 반영한다",
    ],
    verify: "semantic",
    scope: "app/api/cron/**, src/lib/**(KPI·설문·침묵환자 집계)",
    guards: ["check:schema-refs (테이블 + 평문 select 컬럼 레벨)"],
    postmortems: [7, 8, 12, 13, 14, 35],
    gap: "✅ 축 C(2026-07-15): check:schema-refs를 컬럼 레벨로 확장(생성타입 대조, 평문 select만·비차단). 이 과정에 생성타입 stale(inquiries 35 vs 61) 발견→재생성, 실 버그 2건(reminders profiles 5컬럼·crawl name) 수확→KNOWN_ISSUES. 잔여: 필터(.eq 등)·복호화 누락·'같은 가정 쓰는 다른 소비자 전수'는 여전히 미검사(코드리뷰/감사루프 몫).",
  },

  // ── 유형 7 · UI 반쪽/시각회귀 (골격 첫 타깃) ────────────────────────────
  {
    id: "DoD-7-visual-integrity",
    type: 7,
    title: "렌더 결과가 잘림·깨짐 없이 완결된다 (사람 눈 없이 실측)",
    done: [
      "텍스트 잘림 0 ('Full Profile'→'Fu…' 류 없음 — flex min-w-0 등 배선)",
      "백오피스 액션(노드)을 만들면 상태전파 엣지가 전부 배선된다(반쪽 백오피스 금지)",
      "지도·이미지 등 외부 리소스가 CSP/핫링크로 회색박스 되지 않는다",
    ],
    verify: "semantic",
    scope: "공개 화면 + 로그인 뒤편 백오피스(전 계층), 6개 언어 변형",
    guards: ["e2e/content-clip-sweep.spec.ts (공개화면·영어 최장만)", "check:content §반쪽배선(runPostResolve)", "check:content §CSP커버리지"],
    postmortems: [89, 79, 32, 86, 18, 85, 60],
    gap: "content-clip-sweep가 공개 화면·영어(최장) 위주 — 로그인 뒤편 백오피스, ru/kz 언어변형 잘림은 미스캔. 상태전파 엣지 누락은 특정 API에만 가드. TODO(축 C): 백오피스·다국어 변형까지 스윕 확장.",
  },
];

// 감사 루프·정적 게이트가 공유하는 헬퍼 ──────────────────────────────────
/** verify 방식별로 항목을 나눠 반환 */
export function byVerify() {
  return {
    auto: RUBRIC.filter((r) => r.verify === "auto"),
    semantic: RUBRIC.filter((r) => r.verify === "semantic"),
    manual: RUBRIC.filter((r) => r.verify === "manual"),
  };
}

/** 유형 번호로 항목 조회 */
export function byType(type) {
  return RUBRIC.filter((r) => r.type === type);
}
