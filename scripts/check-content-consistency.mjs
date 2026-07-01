#!/usr/bin/env node
/**
 * 콘텐츠 일관성 자동 검사 (CI 매 PR 실행 — 사람이 스크린샷으로 찾지 않게)
 *
 * 왜: 리브랜딩/콘텐츠 변경 때 "옛 모델 잔재"(옛 브랜드·옛 이메일·일부 언어만 적힌 목록·
 *     일부 언어에 키 누락)가 사람이 발견할 때까지 남는 사고가 반복됨. → 기계가 매번 차단.
 *
 * 검사:
 *  1) 금지 토큰: 고객/제품 코드(app·src·components)에 옛 이메일/도메인 잔재 있으면 실패.
 *  2) i18n 키 패리티: 활성 6개 언어(ko·en·ru·kz·zh·ja)가 같은 키 집합을 갖는지(영어 기준 누락 검출).
 *
 * 실행: node scripts/check-content-consistency.mjs   (npm run check:content)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src", "components"];
const EXCLUDE = /node_modules|\.next|\.test\.|\.spec\.|__tests__|\/archive\//;
const CODE_EXT = /\.(js|jsx|ts|tsx)$/;

// ── 1) 금지 토큰 (고객/제품 코드에 절대 없어야 함) ──────────────
const FORBIDDEN = [
  { re: /immunelab/i, msg: "옛 이메일 도메인 immunelab 잔재 (→ admin@healwith.co.kr)" },
  { re: /@healo\.com/i, msg: "옛 이메일 @healo.com 잔재 (→ admin@healwith.co.kr)" },
  { re: /healo\.com/i, msg: "옛 도메인 healo.com 잔재" },
  // ponytail: @healo.kr 이메일만 차단(.com만 막던 구멍). 현 사이트 도메인 khidi.healo.kr(@ 없음)·api 호스트 allowlist는 안 걸림.
  { re: /@healo\.kr/i, msg: "옛 이메일 @healo.kr 잔재 (→ admin@healwith.co.kr)" },
  // 옛 배포 도메인 잔재 — 이메일 푸터·survey·reminder 링크가 죽은 도메인을 가리켜 고객이 404 (2026-06-29 전수조사).
  // 정본 base URL 은 NEXT_PUBLIC_SITE_URL=https://healwith.co.kr. 폴백/리터럴에 옛 도메인 금지.
  { re: /healo-khidi\.vercel\.app/i, msg: "옛 배포 도메인 healo-khidi.vercel.app 잔재 (→ healwith.co.kr) — 이메일/링크가 죽은 도메인을 가리킴" },
  // khidi.healo.kr 은 컷오버 전 옛 도메인. 고객 링크/리터럴엔 금지하되, translate API 의 CORS origin allowlist 만 면제(레거시 호환).
  { re: /khidi\.healo\.kr/i, allow: /translate-text|translate-realtime/, msg: "옛 도메인 khidi.healo.kr 잔재 (→ healwith.co.kr). CORS origin allowlist 만 면제" },
  { re: /HEALO-KHIDI/, msg: "옛 브랜드 HEALO-KHIDI 가 제품 코드에 (코드명은 주석/내부만, 고객 텍스트 금지)" },
  // 보안: 비밀키를 NEXT_PUBLIC_ 접두사로 두면 클라이언트 번들에 그대로 박혀 노출된다
  // (2026-06-20 NEXT_PUBLIC_CRON_SECRET 누출 사고). 공개돼도 되는 값만 NEXT_PUBLIC_ 사용.
  { re: /NEXT_PUBLIC_[A-Z0-9_]*SECRET/, msg: "비밀키가 NEXT_PUBLIC_ 접두사로 클라이언트에 노출됨 — 서버 전용(CRON_SECRET 등)으로 옮기고 관리자 인증 라우트로 감쌀 것" },
  // 조작된 환자 후기 시그니처 차단 (2026-06-20 홈에 가짜 후기 라이브 사고, POSTMORTEMS #11).
  // "이니셜 / 국가 / 암종" 형식(예: "A.K. / Kazakhstan / Stomach Cancer", "A.K. / 카자흐스탄 / 위암").
  // 실제 후기는 동의받은 것만, 출처표시 또는 외부 플랫폼 링크로.
  { re: /[A-Z]\.\s?[A-Z]\.\s*\/\s*[^/\n]+\/\s*(?:[Cc]ancer|암|[Рр]ак|がん|癌)/, msg: "조작된 환자 후기 의심(이니셜/국가/암종 형식) — 가짜 후기 금지. 동의받은 실후기만 출처표시하거나 외부 플랫폼 링크로" },
  // 존재하지 않는 테이블을 쿼리하면 결과가 조용히 비어 KHIDI 지표가 0이 된다(POSTMORTEMS #7·#15).
  // khidi_intakes 는 실재하지 않음 — 실제 연결고리는 consultation_sessions.inquiry_id → inquiries.
  // 실제 쿼리 사용(.from("khidi_intakes") / PostgREST 임베드 khidi_intakes!inner)만 차단(설명 주석은 통과).
  { re: /from\(\s*["']khidi_intakes["']|khidi_intakes\s*!/, msg: "존재하지 않는 테이블 khidi_intakes 쿼리 — 실제 연결고리는 inquiry_id→inquiries (POSTMORTEMS #19)" },
  // 리드 상태 converted 의 화면 라벨을 "치료 확정" 하나로 통일(2026-06-22, POSTMORTEMS #21).
  // 같은 상태를 화면마다 "진료 전환"(액션버튼)·"전환됨"(뱃지)·"치료 확정"(문서)으로 다르게 불러 PO가 혼란.
  // "진료 전환"은 "진료를 옮긴다"처럼 읽혀 의미까지 헷갈림 → 두 잔재 표기를 영구 차단.
  { re: /진료\s*전환|전환됨/, msg: "converted 리드 상태 라벨 잔재 — '치료 확정' 으로 통일(화면별 라벨 불일치 방지, POSTMORTEMS #21)" },
  // SSR 언어 누락 안티패턴: useState('en') + useEffect에서 setLang(getLangCodeFromCookie()) 으로 늦게 읽으면
  // 서버 렌더는 항상 'en' → 비영어 페이지가 영어로 색인됨(구글봇은 SSR HTML을 봄, POSTMORTEMS #30).
  // 렌더용 언어는 반드시 useLang()(LangContext, 서버 initialLang 주입)으로. 쿠키 직접 읽기는 이벤트 시점(폼 제출 등)만.
  // allow: Toast.jsx 만 면제 — ToastProvider 는 LangProvider 보다 상위(providers.jsx)라 useLang() 불가.
  // 토스트는 클릭 이후에만 뜨는 클라이언트 UI(SSR 렌더 0)라 SSR 언어와 무관해 안티패턴이 무해.
  { re: /set[A-Za-z]*[Ll]ang(?:Code)?\(\s*getLangCodeFromCookie\(\)\s*\)/, allow: /Toast\.jsx$/, msg: "SSR 언어 누락 안티패턴(setLang(getLangCodeFromCookie())) — 렌더 언어는 useLang() 쓸 것(서버가 영어로 렌더→비영어 SEO 손해, POSTMORTEMS #30)" },
  // ── 의료광고 금지문구(완치·결과 보장) — HEALwith_keywords 광고시트 §"ЗАПРЕЩЕНО".
  //    의료법·Google/Yandex 광고정책상 "완치·보장·100% 결과"는 광고 거부 + 법적 리스크.
  //    ⚠️ 오탐 제외: ① 면책문구("완치를 보장하지 않습니다"·"не гарантирует излечения")는
  //    긍정형만 잡는 부정 lookahead/어미로 통과. ② AI 안전가드 소스(lib/chat)·ai-status·
  //    playbook 은 이 문구를 '탐지 패턴/라벨'로 정당하게 보유 → allow 로 면제.
  { re: /완치\s*(?:를|은|는)?\s*보장(?!\s*(?:하지\s*않|안|못|없|불가))/, allow: /[\\/]lib[\\/]chat[\\/]|ai-status|playbook/, msg: "의료광고 금지문구 '완치 보장' — 결과 보장 금지(광고 거부 + 법적 리스크). 면책이면 '…보장하지 않습니다' 형태로." },
  { re: /100\s*%\s*(?:완치|치료|회복|결과\s*보장|성공)/, allow: /[\\/]lib[\\/]chat[\\/]|ai-status|playbook/, msg: "의료광고 금지문구 '100% 완치/결과 보장' — 결과 보장 금지(광고 거부 + 법적 리스크)." },
  { re: /(?:반드시|무조건|틀림없이|확실히)\s*(?:완치|낫습니다|낫는다)/, allow: /[\\/]lib[\\/]chat[\\/]|ai-status|playbook/, msg: "의료광고 금지문구 '반드시 완치' — 결과 단정 금지." },
  { re: /вылечим\s+(?:рак|вас|онколог)/i, msg: "RU 의료광고 금지문구 'вылечим рак'(완치 약속) — 결과 보장 금지." },
  { re: /гаранти(?:я|руем|рованн\w*)\s+(?:излечени|выздоровлени)/i, allow: /[\\/]lib[\\/]chat[\\/]/, msg: "RU 의료광고 금지문구 'гарантия излечения'(완치 보장) — 결과 보장 금지. 면책은 'не гарантирует излечения'." },
  { re: /(?:100\s*%|стопроцентн\w*)\s+(?:результат|излечени|выздоровлени)/i, msg: "RU 의료광고 금지문구 '100% результат' — 결과 보장 금지." },
  { re: /(?<!\b(?:not|no|never|cannot|can't|doesn't|don't|won't)\s)\bguarantee[ds]?\s+(?:a\s+)?(?:cure|recovery|to\s+cure)\b/i, msg: "EN 의료광고 금지문구 'guaranteed cure' — 결과 보장 금지(광고 거부 + 법적 리스크). 면책이면 'does not guarantee…' 형태로." },
  { re: /\b100\s*%\s+cure\b/i, msg: "EN 의료광고 금지문구 '100% cure' — 결과 보장 금지." },
  // 외부 이미지 핫링크 금지 ①: immunehospital.com/resource/images (암종 카드/합병증 이미지).
  // 원본이 바뀌면/삭제되면 고객 화면 이미지가 깨진다. 자체호스팅: public/immune/cancer/ 에
  // 내려받고 로컬 경로(/immune/cancer/…)로 참조(다운로드: scripts/fetch-cancer-card-images.mjs).
  { re: /immunehospital\.com\/resource\/images/i, msg: "외부 이미지 핫링크 immunehospital.com/resource/images — public/immune/cancer/ 로 자체호스팅하고 로컬 경로로 참조할 것(scripts/fetch-cancer-card-images.mjs). 원본 변경 시 이미지 깨짐 방지." },
  // 외부 이미지 핫링크 금지 ②: immunehospital.com/uploads/* (의사 사진). 원본이 파일명 변경/삭제
  // 시 화면에서 깨진다(2026-07-01 병원 페이지 의사사진 다수 404 사고, POSTMORTEMS). public/doctors/
  // 에 자체 호스팅하고 로컬 경로(/doctors/…)로 참조. /resource/images·/uploads/ 만 정밀 차단해
  // 파트너 사이트 URL·출처 주석(/pages/…) 등 정당한 immunehospital.com 참조는 통과.
  { re: /immunehospital\.com\/uploads\//, msg: "의사 사진 핫링크(immunehospital.com/uploads/…) 금지 — public/doctors/ 에 내려받아 로컬 경로(/doctors/…)로 참조. 새 사진은 scripts/fetch-doctor-photos.mjs 로 받을 것" },
];

function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
  for (const e of entries) {
    const rel = join(dir, e);
    if (EXCLUDE.test("/" + rel.replace(/\\/g, "/") + "/")) continue;
    let st;
    try { st = statSync(join(ROOT, rel)); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(rel));
    else if (CODE_EXT.test(e) && !EXCLUDE.test(rel)) out.push(rel);
  }
  return out;
}

// ── 1b) zod 언어 검증(z.enum)에 'kk'(BCP47)만 있고 'kz'(활성코드) 누락 차단 ──────
// 왜: 문의 퍼널 드롭다운·i18n·DB 는 활성코드 'kz' 를 쓰는데, 입력 검증 enum 이 'kk' 만
//     받아 카자흐어('kz') 문의가 400 거부되던 버그(POSTMORTEMS #23 — 핵심 타겟 카자흐스탄
//     퍼널 차단). **검증(z.enum)** 만 정밀 타겟 — 이메일/설문 템플릿은 일부러 내부키 'kk' 를
//     쓰고 경계에서 kz→kk 정규화하므로(resolveRecipient.normalizeSurveyLang) 오탐 제외.
//     hreflang 맵({ kz: "kk" })도 kk 가 ISO 정답이라 제외.
function isLangValidationEnum(line) {
  return /z\.enum\(/.test(line) && /["'](ko|ru|zh|ja)["']/.test(line);
}

// ── 1c) XSS: 무단 dangerouslySetInnerHTML 추가 차단 ─────────────────────────
// 왜: dangerouslySetInnerHTML 로 '사용자 입력'을 렌더하면 XSS(세션탈취→PII) 직결.
//     2026-06-30 C레벨 진단(CISO-4) 시 전수 감사 결과 현재 15곳은 전부 안전
//     (JSON-LD 구조화데이터 = JSON.stringify(서버/어드민 객체), 또는 layout.jsx 의
//     정적 부트스트랩 스크립트 — 공개 사용자 입력 렌더 0). 그 '감사된' 파일만 아래
//     allowlist 에 둔다. 새 파일이 innerHTML 을 추가하면 CI 가 막아, 추가자가
//     "사용자입력 아닌지" 감사 후 의식적으로 allowlist 에 올리게 강제한다(기계가 잡는다).
//     매칭은 실제 JSX 사용(`dangerouslySetInnerHTML=`)만 — 단어가 든 주석은 오탐 제외.
const XSS_INNERHTML_ALLOWLIST = new Set([
  "app/page.jsx",
  "app/layout.jsx",
  "app/care-journey/page.jsx",
  "app/cost-calculator/page.jsx",
  "app/faq/page.jsx",
  "app/kk/for-kazakh-patients/page.jsx",
  "app/ru/for-russian-patients/page.jsx",
  "app/treatments/[slug]/page.jsx",
  "app/hospitals/[slug]/page.jsx",
  "app/hospitals/immune/page.jsx",
  "app/specialties/plastic-surgery/page.jsx",
  "app/specialties/korean-medicine/KoreanMedicineClient.jsx",
  "app/specialties/dermatology/page.jsx",
  "app/specialties/dental/page.jsx",
]);

const errors = [];

for (const file of SCAN_DIRS.flatMap(walk)) {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const f of FORBIDDEN) {
      if (f.re.test(line) && !(f.allow && f.allow.test(file))) errors.push(`[금지토큰] ${file}:${i + 1} — ${f.msg}\n    ${line.trim().slice(0, 120)}`);
    }
    if (isLangValidationEnum(line) && /["']kk["']/.test(line) && !/["']kz["']/.test(line)) {
      errors.push(`[언어검증] ${file}:${i + 1} — z.enum 언어검증에 'kk' 만 있고 활성코드 'kz' 누락 → 카자흐어 문의 거부 (POSTMORTEMS #23). 'kz' 추가할 것(입력은 'kz', 이메일 템플릿만 경계에서 kz→kk)\n    ${line.trim().slice(0, 120)}`);
    }
    if (/dangerouslySetInnerHTML\s*=/.test(line) && !XSS_INNERHTML_ALLOWLIST.has(file.replace(/\\/g, "/"))) {
      errors.push(`[XSS가드] ${file}:${i + 1} — 새 dangerouslySetInnerHTML. '사용자 입력'을 렌더하면 XSS 위험. JSON-LD/정적이라 안전함을 확인했으면 scripts/check-content-consistency.mjs 의 XSS_INNERHTML_ALLOWLIST 에 이 파일을 추가(=감사 완료 표시)하라. 사용자입력이면 React 노드/이스케이프로 바꿀 것.\n    ${line.trim().slice(0, 120)}`);
    }
  });
}

// ── 2) i18n 활성 6개 언어 키 패리티 ─────────────────────────────
const ACTIVE = ["ko", "en", "ru", "kz", "zh", "ja"];
const I18N = "src/lib/i18n/index.js";
try {
  const text = readFileSync(join(ROOT, I18N), "utf8").split("\n");
  // 최상위 언어 블록 시작: "  xx: {"
  const blocks = {}; // lang -> {start, keys:Set}
  let cur = null;
  text.forEach((line, idx) => {
    const m = line.match(/^ {2}([a-z]{2}): \{\s*$/);
    if (m) { cur = m[1]; blocks[cur] = new Set(); return; }
    if (/^ {2}\};?\s*$/.test(line)) { cur = null; return; } // 블록 종료(최상위 객체 닫힘 등)
    if (cur) {
      const k = line.match(/^\s{3,}"([^"]+)":/);
      if (k) blocks[cur].add(k[1]);
    }
  });
  const ref = blocks.en;
  if (!ref || ref.size === 0) {
    errors.push(`[i18n] 기준(en) 블록을 못 읽음 — 검사 스크립트 점검 필요`);
  } else {
    for (const lang of ACTIVE) {
      if (lang === "en") continue;
      const b = blocks[lang];
      if (!b) { errors.push(`[i18n] 활성 언어 '${lang}' 블록이 없음`); continue; }
      const missing = [...ref].filter((k) => !b.has(k));
      if (missing.length) {
        errors.push(`[i18n] '${lang}' 에 키 ${missing.length}개 누락 (en 기준): ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
      }
    }
  }
} catch (e) {
  errors.push(`[i18n] ${I18N} 읽기 실패: ${e.message}`);
}

// ── 3) 화상 상담방 카피(_roomCopy.js) 6개 언어 키 패리티 ─────────────
// 화상방은 별도 COPY 객체(_roomCopy.js)를 쓰는데 위 i18n 검사(index.js)가 안 본다.
// 한 언어에만 키가 빠지면 그 언어 환자 화면에 undefined/빈칸이 뜬다(화상방=KHIDI 시연 핵심).
const ROOMCOPY = "app/consultation/[id]/_roomCopy.js";
try {
  const text = readFileSync(join(ROOT, ROOMCOPY), "utf8").split("\n");
  const blocks = {}; // lang -> Set(keys)
  let cur = null;
  for (const line of text) {
    const m = line.match(/^ {2}([a-z]{2}): \{\s*$/); // "  ko: {"
    if (m) { cur = m[1]; blocks[cur] = new Set(); continue; }
    if (/^ {2}\},?\s*$/.test(line)) { cur = null; continue; } // 언어 블록 종료 "  },"
    if (cur) {
      const k = line.match(/^ {4}([A-Za-z0-9_]+):/); // 4칸 들여쓰기 키(따옴표 없음)
      if (k) blocks[cur].add(k[1]);
    }
  }
  const ref = blocks.en;
  if (!ref || ref.size === 0) {
    errors.push(`[roomCopy] 기준(en) 블록을 못 읽음 — 검사 스크립트 점검 필요`);
  } else {
    for (const lang of ACTIVE) {
      if (lang === "en") continue;
      const b = blocks[lang];
      if (!b) { errors.push(`[roomCopy] 활성 언어 '${lang}' 블록이 없음`); continue; }
      const missing = [...ref].filter((k) => !b.has(k));
      const extra = [...b].filter((k) => !ref.has(k));
      if (missing.length) errors.push(`[roomCopy] '${lang}' 에 키 ${missing.length}개 누락 (en 기준): ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
      if (extra.length) errors.push(`[roomCopy] '${lang}' 에 en 에 없는 키 ${extra.length}개: ${extra.slice(0, 8).join(", ")}`);
    }
  }
} catch (e) {
  errors.push(`[roomCopy] ${ROOMCOPY} 읽기 실패: ${e.message}`);
}

// ── 4) 목록→상세 동적 링크가 실제 라우트로 연결되는지 (404 방지) ──────────
// 왜: 목록 화면이 router.push(`/coordinator/inbox/${id}`)·href={`/...${id}`} 처럼 동적 상세로
//     보내는데 그 [id] 라우트가 없으면 클릭 시 404 (2026-06-23 코디 인박스 사고, POSTMORTEMS #31).
//     사람이 클릭해봐야만 보이던 부류 → 내부 동적 네비게이션의 대상 라우트 존재를 매번 자동 확인.
function hasDynamicRoute(prefixSegs) {
  const dir = join(ROOT, "app", ...prefixSegs);
  let entries;
  try { entries = readdirSync(dir); } catch { return false; }
  for (const e of entries) {
    if (/^\[.+\]$/.test(e)) {
      for (const f of ["page.jsx", "page.tsx", "page.js", "page.ts"]) {
        try { statSync(join(dir, e, f)); return true; } catch { /* 다음 */ }
      }
    }
  }
  return false;
}
// 캡처: (1)정적 접두 경로, (2)`${…}` 직후 1글자. 2번이 영숫자/.-_ 면 같은 세그먼트에
// 리터럴이 더 붙는 것(예: `/templates/${x}-import.csv` = 정적 파일) → 라우트 아님, 제외.
const NAV_RE = /(?:router\.(?:push|replace)\(|href=\{)`(\/[A-Za-z0-9/_-]+)\/\$\{[^}]*\}([^`]?)/g;
const navSeen = new Set();
for (const file of walk("app")) {
  const text = readFileSync(join(ROOT, file), "utf8");
  let m;
  while ((m = NAV_RE.exec(text)) !== null) {
    const prefix = m[1]; // 예: "/coordinator/inbox"
    const after = m[2];  // `${…}` 직후 글자
    if (prefix.startsWith("/api")) continue;
    if (after && /[A-Za-z0-9._-]/.test(after)) continue; // 세그먼트 일부(파일명 등) → 라우트 아님
    if (navSeen.has(prefix)) continue;
    navSeen.add(prefix);
    if (!hasDynamicRoute(prefix.split("/").filter(Boolean))) {
      errors.push(`[동적링크] '${prefix}/\${…}' 로 보내는 화면이 있는데 app${prefix}/[*]/page 라우트가 없음 → 클릭 시 404 (POSTMORTEMS #31). 상세 페이지를 만들거나 링크를 고칠 것`);
    }
  }
}

// ── 5) 직원/포털 화면이 환자용 공개 퍼널(/inquiry·/intake)로 보내지 않는지 ──────
// 왜: 코디 '새 상담 생성'이 /intake(→/inquiry 리다이렉트)로 보내 코디가 환자처럼 문의를
//     접수하는 꼴이었음(2026-06-23, POSTMORTEMS #33). 직원은 자기 도구(상담 생성 모달 등)로 작업해야 함.
const STAFF_DIRS_RE = /^app[\\/](admin|coordinator|hospital|agency|clinic|doctor)[\\/]/;
const FUNNEL_NAV_RE = /(?:router\.(?:push|replace)\(|href=\{?)[`'"]\/(intake|inquiry)\b/;
for (const file of walk("app")) {
  const norm = file.replace(/\\/g, "/");
  if (!STAFF_DIRS_RE.test(file)) continue;
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    if (FUNNEL_NAV_RE.test(line)) {
      errors.push(`[직원→퍼널] ${norm}:${i + 1} — 직원/포털 화면이 환자용 공개 퍼널(/inquiry·/intake)로 보냄. 직원은 자기 도구(상담 생성 모달 등)로 작업해야 함(POSTMORTEMS #33).\n    ${line.trim().slice(0, 120)}`);
    }
  });
}

// ── 6) tt("키") 존재 검사 — 로컬 TR 패턴 파일 한정 ───────────────────
// 왜: 에이전시 포털 secContact 키가 6개 언어 *전부* 누락 → 패리티검사(언어간 불일치)는
//     통과했지만 화면엔 빈칸 출력(2026-06-24). 전-언어 동일누락은 패리티로 못 잡힘.
//     → 코드가 tt("키")로 부르는 문자열 키가 같은 파일 TR 객체에 실제 정의돼 있는지 확인.
//     (템플릿리터럴 tt(`a_${x}`)·변수 tt(s.k)는 정적분석 불가라 제외 — 문자열 키만.)
const TT_KEY_RE = /\btt\(\s*["']([A-Za-z0-9_]+)["']/g;
for (const file of SCAN_DIRS.flatMap(walk)) {
  const text = readFileSync(join(ROOT, file), "utf8");
  if (!/const\s+tt\s*=\s*\(k\)/.test(text)) continue; // 로컬 TR tt 헬퍼가 있는 파일만
  const used = new Set();
  let m;
  while ((m = TT_KEY_RE.exec(text))) used.add(m[1]);
  const missing = [...used].filter((k) => !new RegExp(`\\b${k}\\s*:`).test(text));
  if (missing.length) {
    errors.push(`[i18n-tt] ${file} — tt("키")로 부르는데 TR에 정의 없는 키 ${missing.length}개: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? " …" : ""} → 화면에 빈칸 출력(전 언어 동일누락은 패리티검사로 못 잡음). 6개 언어에 키 추가할 것`);
  }
}

// ── 7) 환자 포털(app/patient) 클라이언트 컴포넌트 하드코딩 한국어 가드 ──────
// 왜: /patient 는 6개 언어 환자 화면인데 consultations·cost-estimates·visa 등 5개가
//     한국어로 완전 하드코딩(useLang 미사용)돼 ru/kz 환자가 못 읽던 사고(2026-06-29 전수조사).
//     키 패리티검사는 글로벌 DICTIONARY만 봐서 파일 *내부* 인라인 한국어를 못 잡음(사람이 스샷으로 찾던 부류).
//     → app/patient 클라이언트 컴포넌트가 '한국어를 코드에 쓰는데 useLang/t() 다국어 처리를 안 하면' 실패.
//     정상 패턴: COPY={en,ko,ru,kz,zh,ja}+useLang() (한국어가 ko 블록에만 → useLang 쓰므로 통과).
//     allow: 한국어를 useLang() 또는 글로벌 t("키") 로 처리하는 파일은 통과(주석 속 한국어는 무시).
const HANGUL_RE = /[가-힣]/;
const stripComments = (line) => line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
for (const file of walk("app/patient")) {
  if (!/\.jsx?$/.test(file) || EXCLUDE.test(file)) continue;
  const text = readFileSync(join(ROOT, file), "utf8");
  if (!/["']use client["']/.test(text)) continue;          // 클라이언트 렌더 컴포넌트만
  // 다국어 처리 중이면 통과: useLang() 사용 · 글로벌 t("키") 호출 · 또는 인라인 다국어 객체(kz:/ru: 키 제공).
  // 깨진 파일은 ko: 라벨만 있고 ru:/kz: 가 전혀 없던 게 특징 → 그 부류만 정확히 잡는다.
  if (/\buseLang\b/.test(text) || /\bt\(\s*["']/.test(text) || /\bkz\s*:/.test(text) || /\bru\s*:/.test(text)) continue;
  const lines = text.split("\n");
  const hit = lines.findIndex((l) => HANGUL_RE.test(stripComments(l)));
  if (hit !== -1) {
    errors.push(`[환자i18n] ${file.replace(/\\/g, "/")}:${hit + 1} — /patient 화면에 한국어가 하드코딩됨(useLang/t() 미사용) → ru/kz 등 다른 언어 환자에게 한국어로 노출. COPY={en,ko,ru,kz,zh,ja}+useLang() 패턴으로 다국어화할 것(전수조사 2026-06-29).\n    ${lines[hit].trim().slice(0, 120)}`);
  }
}

// ── 결과 ────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n❌ 콘텐츠 일관성 검사 실패 (${errors.length}건)\n`);
  errors.forEach((e) => console.error("  " + e + "\n"));
  console.error("→ 고친 뒤 다시 커밋하세요. (옛 브랜드/이메일 잔재·언어별 키 누락 방지)\n");
  process.exit(1);
}
console.log("✓ 콘텐츠 일관성 검사 통과 (금지토큰 0 · i18n+화상방 활성6 키 패리티 OK)");
