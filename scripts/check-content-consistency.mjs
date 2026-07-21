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
import { join, dirname } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src", "components"];
const EXCLUDE = /node_modules|\.next|\.test\.|\.spec\.|__tests__|\/archive\//;
const CODE_EXT = /\.(js|jsx|ts|tsx)$/;

// ── 공개/환자 화면 판정 (축 C 2026-07-15 — 완성도 루프 DoD-1) ─────────────────
// 왜: 한글누출 가드가 app/patient + 3폴더만 봐서 공개 마케팅/환자 퍼널(app/home·care-journey·
//     treatments·hospitals·inquiry 등)이 통째로 사각이었다. 폴더 배열만 늘리면 새 공개 폴더가
//     또 경계로 샌다(#81 부류 재발). → "공개 화이트리스트 ∧ ¬백오피스 ∧ ¬api" 판정으로
//     경계 누출을 원천 차단하고, 의도적 한국어 백오피스(CLAUDE.md)는 확실히 제외한다.
// 제외(의도적 한국어): app/{admin,coordinator,hospital,agency,clinic,doctor,opinion,dev,
//     design-preview,account,ad-budget,api} + 백오피스 전용 공용 컴포넌트(consultation/marketing/partners).
//     ※ opinion = 계정 없는 '국내 의사'용 세컨드오피니언 소견 화면(한국어 의도) → doctor 계열로 제외.
const BACKOFFICE_FILE_RE =
  /^app\/(admin|coordinator|hospital|agency|clinic|doctor|opinion|dev|design-preview|account|ad-budget|api)\/|^src\/components\/(consultation|marketing|partners)\//;
// 공개/환자 렌더 경로: app 공개 라우트(6개어) + 환자/공개 컴포넌트 폴더 + src/components 루트 공개 파일.
const PUBLIC_FILE_RE =
  /^app\/(patient|home|care-journey|telemedicine|treatments|hospitals|inquiry|intake|consult|consultation|insurance|cost-calculator|faq|about|contact|education|specialties|stories|visa|search|survey|claim|kk|ru)\/|^src\/components\/(patient|costs)\/|^src\/components\/(SocialProofSection|GoogleMap|Modals|CookieConsent)\.jsx$/;
function isPublicFacingFile(file) {
  const f = file.replace(/\\/g, "/");
  if (BACKOFFICE_FILE_RE.test(f)) return false; // 의도적 한국어 백오피스 보호
  return PUBLIC_FILE_RE.test(f);
}

// ── 1) 금지 토큰 (고객/제품 코드에 절대 없어야 함) ──────────────
const FORBIDDEN = [
  // PO 반복 지시(2026-07-06): 얼굴 사진 없는 의료진은 로고가 아니라 "팔짱 낀 가운" 이미지(69cddae60209c3)로.
  { re: /['"`]\/doctors\/69cddae601fbd8/, msg: "의료진 사진에 병원 로고 이미지 사용 금지 — 얼굴 사진 없으면 팔짱 낀 가운 이미지(/doctors/69cddae60209c3….jpg)로 (PO 반복 지시 2026-07-06)" },
  { re: /immunelab/i, msg: "옛 이메일 도메인 immunelab 잔재 (→ admin@healwith.co.kr)" },
  { re: /@healo\.com/i, msg: "옛 이메일 @healo.com 잔재 (→ admin@healwith.co.kr)" },
  { re: /healo\.com/i, msg: "옛 도메인 healo.com 잔재" },
  // ponytail: @healo.kr 이메일만 차단(.com만 막던 구멍). 현 사이트 도메인 khidi.healo.kr(@ 없음)·api 호스트 allowlist는 안 걸림.
  { re: /@healo\.kr/i, msg: "옛 이메일 @healo.kr 잔재 (→ admin@healwith.co.kr)" },
  // 옛 배포 도메인 잔재 — 이메일 푸터·survey·reminder 링크가 죽은 도메인을 가리켜 고객이 404 (2026-06-29 전수조사).
  // 정본 base URL 은 NEXT_PUBLIC_SITE_URL=https://healwith.co.kr. 폴백/리터럴에 옛 도메인 금지.
  { re: /healo-khidi\.vercel\.app/i, msg: "옛 배포 도메인 healo-khidi.vercel.app 잔재 (→ healwith.co.kr) — 이메일/링크가 죽은 도메인을 가리킴" },
  // 죽은 옛 도메인 healo-khidi.com — LiveKit webhook/외부설정 URL 이 이 도메인을 가리키면 이벤트가 안 옴
  // (2026-06-30 C레벨 진단 MKT-08: 검사기 사각지대였음). 정본 = healwith.co.kr.
  { re: /healo-khidi\.com/i, msg: "죽은 옛 도메인 healo-khidi.com 잔재 (→ healwith.co.kr) — webhook/설정 URL 이 죽은 도메인을 가리킴 (MKT-08)" },
  // khidi.healo.kr 은 컷오버 전 옛 도메인. 고객 링크/리터럴엔 금지하되, translate API 의 CORS origin allowlist 만 면제(레거시 호환).
  { re: /khidi\.healo\.kr/i, allow: /translate-text|translate-realtime/, msg: "옛 도메인 khidi.healo.kr 잔재 (→ healwith.co.kr). CORS origin allowlist 만 면제" },
  { re: /HEALO-KHIDI/, msg: "옛 브랜드 HEALO-KHIDI 가 제품 코드에 (코드명은 주석/내부만, 고객 텍스트 금지)" },
  // 면력한방병원 브랜드명 발명 음역 차단 — AI 번역이 지어낸 이름(2026-07-06 /insurance 카피 검증에서 발견).
  // 공식 표기: en/ru/kz "Immune Hospital", ja "免疫病院", zh "免疫(韩方)医院" (seo.immune.* · immuneCancerDetails.js 기준).
  { re: /Myunghyuk|Мённёк|ミョンニョク/i, msg: "면력한방병원 브랜드명 오표기(발명 음역) — 공식: Immune Hospital / 免疫病院" },
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
  // 죽은 딥링크: /admin/agent 는 ?thread= 파라미터를 읽지 않는다 — 품질경고 알림이 여길 가리켜
  // "눌러도 아무것도 안 열리는" 막다른길이 됨(2026-07-13 PO 재현). 대화 딥링크의 정본은
  // /admin/chat?thread= (어드민) · /coordinator/chat?thread= (코디).
  { re: /\/admin\/agent\?thread/, msg: "죽은 딥링크 /admin/agent?thread=… — Human Agent 대시보드는 thread 파라미터를 읽지 않음. 대화 딥링크는 /admin/chat?thread= (어드민) 또는 /coordinator/chat?thread= (코디)로" },
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
  "app/insurance/page.jsx",
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

// ── 1d) 환자앱(6개어 프론트) JSX 텍스트에 하드코딩 한글 차단 ──────────────────
// 왜: /patient 은 러·카 등 외국인 환자용 6개어 화면. 태그 사이 텍스트(>…<)에 한글을 직접
//     박으면 비한국어 환자에게 한국어가 그대로 노출된다(2026-07-07 비자 허브 통짜 한글·
//     증상분석 누출 — check:content 사각지대였음). i18n(useLang()+{ko,en,…})로 감쌀 것.
// ponytail: '>텍스트<' 형태(가장 흔하고 제일 위험한 통짜 누출)만 잡는다. 중괄호 표현식
//     {cond?'한글':…} 안이나 객체 label:'한글' 은 못 잡음 — 그건 코드리뷰 몫(정직하게 명시).
const HANGUL_JSX_TEXT = />[^<>{}]*[가-힣][^<>{}]*</;
// allow: 국가선택 드롭다운의 '자국어 / English' 라벨(대한민국 / Korea)은 의도적 자국명 표기.
//   guard 가 한글(가-힣)만 봐서 中国/日本/Қазақстан 등과 달리 한국만 오탐으로 걸림(축 C 2026-07-15).
const NATIVE_COUNTRY_OPTION = /<option[^>]*>\s*대한민국\s*\/\s*Korea\s*<\/option>/;

for (const file of SCAN_DIRS.flatMap(walk)) {
  const content = readFileSync(join(ROOT, file), "utf8");
  const lines = content.split("\n");
  const isPatientApp = isPublicFacingFile(file); // 축 C 2026-07-15: app/patient → 공개/환자 전체로 확장
  // ── 1f) 반쪽 배선 방지: chat_threads 를 'resolved' 로 바꾸는 API 는 자동 패턴 추출 배선 필수 ──
  // 왜: runPostResolve(응대 패턴 자동 추출→playbook_patterns)가 어드민 resolve 라우트에만 배선되고
  //     코디가 실제 쓰는 완료 경로(portal PATCH)에 빠져 playbook_patterns 가 영영 0건이었음
  //     (POSTMORTEMS #85, 🔁 #18 반쪽 부류). fire-and-forget이라 무발화도 무증상 → 기계가 잡는다.
  // 판별: status 를 resolved 로 "쓰는" 파일만(리터럴 payload `status: "resolved"` 또는
  // resolved_at 기록). status === "resolved" 읽기 전용 게이트(public stream 등)는 오탐 제외.
  if (
    /^app\/api\//.test(file.replace(/\\/g, "/")) &&
    /\.from\(\s*["']chat_threads["']\s*\)/.test(content) &&
    /\.update\(/.test(content) &&
    (/status:\s*["']resolved["']/.test(content) || /resolved_at/.test(content)) &&
    !/runPostResolve/.test(content)
  ) {
    errors.push(`[반쪽배선] ${file} — chat_threads 를 'resolved' 로 바꾸는데 runPostResolve(자동 패턴 추출) 배선이 없음. 새 resolve 경로에도 fire-and-forget 호출을 붙일 것 (POSTMORTEMS #85, 🔁 #18 부류)`);
  }
  lines.forEach((line, i) => {
    if (isPatientApp && HANGUL_JSX_TEXT.test(line) && !NATIVE_COUNTRY_OPTION.test(line)) {
      errors.push(`[한글누출] ${file}:${i + 1} — 환자앱 JSX 텍스트에 하드코딩 한글. useLang()+{ko,en,ru,kz,zh,ja}로 감쌀 것(비한국어 환자에게 한글 노출)\n    ${line.trim().slice(0, 120)}`);
    }
    // ── 1e) scheduled_at 을 timeZone 없이 화면표시 차단 (#45·#69 부류: UTC로 샘) ──────
    // scheduled_at 을 toLocale*String 으로 찍는데 Asia/Seoul 이 없으면 뷰어 tz(서버=UTC)로 렌더돼
    // 알마티 환자가 예약시각을 4시간 밀려 보고 상담을 놓친다. 예약시각은 항상 KST 표시가 계약.
    // → src/lib/datetime/kst.js 의 kstDate/kstTime/kstDateTime 를 쓸 것(또는 timeZone:"Asia/Seoul" 명시).
    // 한 줄 패턴만 잡는다(대부분 `new Date(x.scheduled_at).toLocale…`). 변수에 담아 여러 줄로 쓰면 리뷰 몫.
    if (
      /scheduled_at/.test(line) &&
      /\.toLocale(?:Date|Time)?String\s*\(/.test(line) &&
      !/Asia\/Seoul/.test(line)
    ) {
      errors.push(`[시간대] ${file}:${i + 1} — scheduled_at 을 timeZone 없이 표시(UTC로 샘). kstDate/kstTime/kstDateTime(@/lib/datetime/kst) 사용 또는 timeZone:"Asia/Seoul" 명시 (#45·#69)\n    ${line.trim().slice(0, 120)}`);
    }
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
// 축 C 2026-07-15: app/ 만 보던 것을 src/ 까지 확장 — src/components 의 컴포넌트가 내부
//   동적 네비게이션(router.push(`/x/${id}`))을 가지면 그동안 사각이었음(대상 [id] 라우트는 app/ 에 존재).
for (const file of ["app", "src"].flatMap(walk)) {
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

// ── 7) 환자/공개 화면용 컴포넌트 클라이언트 컴포넌트 하드코딩 한국어 가드 ──────
// 왜: /patient 는 6개 언어 환자 화면인데 consultations·cost-estimates·visa 등 5개가
//     한국어로 완전 하드코딩(useLang 미사용)돼 ru/kz 환자가 못 읽던 사고(2026-06-29 전수조사).
//     키 패리티검사는 글로벌 DICTIONARY만 봐서 파일 *내부* 인라인 한국어를 못 잡음(사람이 스샷으로 찾던 부류).
//     → 환자/공개용 클라이언트 컴포넌트가 '한국어를 코드에 쓰는데 useLang/t() 다국어 처리를 안 하면' 실패.
//     정상 패턴: COPY={en,ko,ru,kz,zh,ja}+useLang() (한국어가 ko 블록에만 → useLang 쓰므로 통과).
//     allow: 한국어를 useLang() 또는 글로벌 t("키") 로 처리하는 파일은 통과(주석 속 한국어는 무시).
// 🔁 2026-07-09 확장: app/patient 안에서만 보던 검사가 src/components/costs/CostEstimateCard.jsx
//     (환자용이지만 app/patient 밖에 위치)를 놓쳤음(PO 질문 계기 발견 — 아직 어디서도 안 쓰이던 컴포넌트라
//     리뷰도 자동검사도 안 거침). 컴포넌트 위치가 아니라 "환자에게 보여줄 의도"가 기준이어야 하므로
//     환자용 공용 컴포넌트 디렉토리(src/components/patient, src/components/costs)도 같이 스캔.
//     동시에 stripComments 를 줄 단위(→ 여러 줄 /** */ 블록 못 거름)에서 파일 전체 기준으로 교체 —
//     이 확장판을 돌려보니 줄 단위 버전이 여러 줄 JSDoc 코멘트 속 한글을 오탐으로 잡아냄(§12와 동일한 함정).
const HANGUL_RE = /[가-힣]/;
function stripCommentsWholeFile(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p1) => p1);
}
// 축 C 2026-07-15: 폴더 배열(app/patient+3폴더) → isPublicFacingFile() 판정으로 확장.
//   공개 마케팅/환자 퍼널(app/home·treatments·hospitals·inquiry…)+루트 공개 컴포넌트까지 스캔.
//   "use client 인데 다국어 처리 전무" 파일만 실패하므로 정상 파일엔 무해(오탐 적음).
// allow: 표시 텍스트가 아니라 '한국 주소 매칭 리터럴'(location.includes('강남'))로 한글이
//   정당하게 필요한 파일 — GoogleMap 은 화면 표시문구가 전부 영어이고 한글은 지오코딩 비교용.
const I18N_HARDCODE_ALLOW = /^src\/components\/GoogleMap\.jsx$/;
for (const file of SCAN_DIRS.flatMap(walk)) {
  {
    if (!/\.jsx?$/.test(file) || EXCLUDE.test(file)) continue;
    if (!isPublicFacingFile(file)) continue;
    if (I18N_HARDCODE_ALLOW.test(file.replace(/\\/g, "/"))) continue;
    const text = readFileSync(join(ROOT, file), "utf8");
    if (!/["']use client["']/.test(text)) continue;          // 클라이언트 렌더 컴포넌트만
    // 다국어 처리 중이면 통과: useLang() 사용 · 글로벌 t("키") 호출 · 또는 인라인 다국어 객체(kz:/ru: 키 제공).
    // 깨진 파일은 ko: 라벨만 있고 ru:/kz: 가 전혀 없던 게 특징 → 그 부류만 정확히 잡는다.
    if (/\buseLang\b/.test(text) || /\bt\(\s*["']/.test(text) || /\bkz\s*:/.test(text) || /\bru\s*:/.test(text)) continue;
    const rawLines = text.split("\n");
    const strippedLines = stripCommentsWholeFile(text).split("\n");
    const hit = strippedLines.findIndex((l) => HANGUL_RE.test(l));
    if (hit !== -1) {
      errors.push(`[환자i18n] ${file.replace(/\\/g, "/")}:${hit + 1} — 환자/공개용 화면에 한국어가 하드코딩됨(useLang/t() 미사용) → ru/kz 등 다른 언어 환자에게 한국어로 노출. COPY={en,ko,ru,kz,zh,ja}+useLang() 패턴으로 다국어화할 것(전수조사 2026-06-29, 확장 2026-07-09).\n    ${rawLines[hit].trim().slice(0, 120)}`);
    }
  }
}

// ── 8) 이메일 템플릿 premium 톤 누수 가드 (DESIGN.md premium_drift, POSTMORTEMS #55) ──
// 왜: 사이트는 legacy(teal+시스템폰트)인데 상담초대·리마인더·설문 이메일이 옛 premium 톤
//     (검정 #0a0a0a + 골드 #c8a96a + 크림 #f5f0e8 + Playfair 세리프)으로 살아있어, 환자가
//     받는 메일만 딴 브랜드처럼 보이던 사고. DESIGN.md forbidden.premium_drift 를 정면으로 어김.
//     UI 코드 검사(위)는 이메일 순수-HTML 문자열을 안 봐서 사각지대였음. → 라이브 이메일 템플릿에
//     premium 토큰이 다시 들어오면 CI 가 차단. 정답 톤 레퍼런스 = infoRequest.ts.
//     범위: src/lib/email/templates/** + surveyEmailTemplate.ts (legacy 전환 완료 파일).
//     제외: src/emails/*.jsx(React Email premium 시스템 — 실사용 확인 후 별도 전환 예정).
const EMAIL_TEMPLATE_FILES = [
  ...walk("src/lib/email/templates"),
  "src/lib/surveys/surveyEmailTemplate.ts",
];
const EMAIL_PREMIUM_TOKENS = [
  { re: /Playfair Display/i, name: "Playfair Display 세리프 폰트" },
  { re: /#c8a96a/i, name: "골드 #c8a96a" },
  { re: /#c7c2b8/i, name: "premium 회백 #c7c2b8" },
  { re: /#f5f0e8/i, name: "크림 배경 #f5f0e8" },
  { re: /#0a0a0a/i, name: "잉크(검정) #0a0a0a" },
];
for (const file of EMAIL_TEMPLATE_FILES) {
  let lines;
  try { lines = readFileSync(join(ROOT, file), "utf8").split("\n"); } catch { continue; }
  lines.forEach((line, i) => {
    for (const t of EMAIL_PREMIUM_TOKENS) {
      if (t.re.test(line)) {
        errors.push(`[이메일premium] ${file.replace(/\\/g, "/")}:${i + 1} — 라이브 이메일 템플릿에 premium 토큰(${t.name}). 사이트는 legacy(teal #0d9488 + 시스템폰트)인데 메일만 옛 브랜드로 보임(DESIGN.md premium_drift, POSTMORTEMS #55). 정답 톤 = src/lib/email/templates/infoRequest.ts 참고.\n    ${line.trim().slice(0, 120)}`);
      }
    }
  });
}

// ── 9) 글로벌 t() 미정의 키 가드 (2026-07-02 전수 감사) ──
// 왜: t()는 미정의 키에 키 원문("chat.back")을 그대로 반환(truthy) → `t(...) || "폴백"` 의
//     폴백이 절대 실행되지 않는 착시가 코드에 깔림. 미정의 키를 쓰는 컴포넌트가 노출되는 순간
//     사용자 화면에 키 원문이 그대로 보임. 기존 패리티 검사는 '사전 안 언어 간 누락'만 봐서
//     '코드가 쓰는 키가 사전에 아예 없음'은 사각지대였음.
// 방법: 사전 소스에서 따옴표 dotted 키 전수 추출 → 글로벌 t 를 import 하는 파일의
//     t("a.b") 리터럴 호출이 전부 사전에 존재하는지 대조. 동적 키(t(변수))는 검사 밖(의도).
{
  const dictSrc = readFileSync(join(ROOT, "src/lib/i18n/index.js"), "utf8");
  const KNOWN_KEYS = new Set(
    [...dictSrc.matchAll(/"([a-z0-9]+(?:\.[A-Za-z0-9_]+)+)"\s*:/g)].map((m) => m[1])
  );
  // 글로벌 t import 감지: `import { ..., t, ... } from ".../i18n"` (별칭 @/lib/i18n · 상대경로 모두)
  const T_IMPORT_RE = /import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*["'][^"']*\/i18n["']/;
  for (const dir of SCAN_DIRS) {
    for (const file of walk(dir)) {
      if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
      const text = readFileSync(join(ROOT, file), "utf8");
      if (!T_IMPORT_RE.test(text)) continue;
      for (const m of text.matchAll(/\bt\(\s*["']([a-z0-9]+(?:\.[A-Za-z0-9_]+)+)["']/g)) {
        if (!KNOWN_KEYS.has(m[1])) {
          errors.push(
            `[t미정의키] ${file.replace(/\\/g, "/")} — t("${m[1]}") 키가 i18n 사전에 없음. ` +
              `t()는 미정의 키에 키 원문을 반환하므로 사용자 화면에 "${m[1]}" 가 그대로 노출됨. ` +
              `사전(src/lib/i18n/index.js) 6개 언어에 키를 추가하거나 호출을 제거할 것.`
          );
        }
      }
    }
  }
}

// ── 10) 발급 PDF 내장(Base-14) 폰트 가드 (POSTMORTEMS #62) ─────────────────────
// 왜: @react-pdf 내장 Helvetica/Times/Courier 는 WinAnsi 인코딩이라 한글·키릴이 전부
//     깨진 글자로 렌더됨(2026-07-02 견적서·동의서 3종·비자초청장 전부 — 견적서는
//     의료해외진출법 §15 서면고지 문서라 치명). 발급 PDF 는 src/lib/pdf/fonts/ 의
//     셀프호스팅 Noto Sans(라틴+키릴)·Noto Sans KR(한글)만 사용(styles.js SANS).
//     camelCase `fontFamily:` 만 잡음 — 이메일 HTML 의 CSS `font-family:` 스택(시스템
//     폰트 fallback 있어 안전)은 오탐 안 됨.
const PDF_CODE_FILES = walk("src/lib/pdf");
for (const file of PDF_CODE_FILES) {
  let lines;
  try { lines = readFileSync(join(ROOT, file), "utf8").split("\n"); } catch { continue; }
  lines.forEach((line, i) => {
    if (/fontFamily:\s*["'](Helvetica|Times|Courier|Symbol|ZapfDingbats)/.test(line)) {
      errors.push(`[PDF폰트] ${file.replace(/\\/g, "/")}:${i + 1} — 발급 PDF 에 내장(Base-14) 폰트 사용 → 한글·키릴 깨짐(POSTMORTEMS #62). styles.js 의 SANS(셀프호스팅 Noto Sans/KR)를 쓸 것.\n    ${line.trim().slice(0, 120)}`);
    }
  });
}
// 폰트 파일이 지워지면 PDF 렌더 자체가 실패 → 존재도 확인.
for (const f of ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf", "NotoSansKR-Regular.ttf", "NotoSansKR-Bold.ttf"]) {
  try { statSync(join(ROOT, "src/lib/pdf/fonts", f)); } catch {
    errors.push(`[PDF폰트] src/lib/pdf/fonts/${f} 없음 — 발급 PDF(견적서·동의서·초청장) 렌더가 통째로 실패함. 셀프호스팅 폰트 4개 필수(POSTMORTEMS #62).`);
  }
}

// ── 11) PDF 렌더 React 정합 가드 (POSTMORTEMS #64) ────────────────────────────
// 왜: Next(App Router)는 앱 코드를 내장(vendored) React 19 로 컴파일한다. 설치 react 가
//     18 이거나 @react-pdf/renderer 가 웹팩 서버 번들에 말려 들어가면, PDF 렌더 트리에
//     서로 다른 React 의 요소가 섞여 renderToBuffer 가 React error #31 로 즉사 →
//     발급 PDF API 전부 500. 빌드·lint·dev(Turbopack)·E2E(dev서버) 전부 통과하는
//     "배포 전용" 사고라 기계 가드 없이는 재발을 못 막는다.
try {
  const nextCfg = readFileSync(join(ROOT, "next.config.js"), "utf8");
  const extBlock = nextCfg.match(/serverExternalPackages\s*:\s*\[[\s\S]*?\]/);
  if (!extBlock || !extBlock[0].includes("@react-pdf/renderer")) {
    errors.push(`[PDF React정합] next.config.js serverExternalPackages 에 "@react-pdf/renderer" 없음 — 웹팩이 react-pdf 를 번들하면 내장 React 와 인스턴스가 갈려 발급 PDF 가 전부 500 (React #31, POSTMORTEMS #64).`);
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const reactMajor = parseInt(String(pkg.dependencies?.react || "0").replace(/^[^\d]*/, ""), 10);
  if (reactMajor < 19) {
    errors.push(`[PDF React정합] package.json react "${pkg.dependencies?.react}" — Next 16(내장 React 19)과 요소 규격이 갈려 외부화된 react-pdf 렌더가 React #31 로 죽음. react/react-dom ^19 유지할 것 (POSTMORTEMS #64).`);
  }
} catch { /* next.config.js 없으면 다른 검사가 이미 실패 */ }

// ── 12) 정규식 \b + 비ASCII 함정 (반성문 #65 부류 영구 차단) ──────────────
// 왜: JS 의 \b 는 \w=[A-Za-z0-9_] 기준(ASCII 전용)이라 키릴·한글·CJK·가나 글자 뒤 \b 는
//     항상 실패한다. 그래서 /...|밀리그램|毫克)\b/ 처럼 비ASCII 대안 뒤에 \b 를 붙이면 그 대안이
//     통째로 죽어(dead code) 매칭이 안 된다. 실제로 두 번 물렸다: #633(가격 게이트 키워드 오탐),
//     #636(PRICE_LINE 통화 접미사), 2026-07-05 safetyGuard 약물 용량 단위. → 기계가 매번 차단.
// 탐지: 비ASCII 글자 뒤 (정규식 닫기토큰 )]|?:*+ 공백)* 다음에 리터럴 \b 가 오고, 그 \b 가 ASCII
//       글자/숫자로 이어지지 않을 때(=후행 경계 오용). 선행경계 \bto\b 같은 정상 용법은 제외.
//       주석(블록 /* */ · 라인 //)은 제거 후 검사 → 설명문에 적힌 \b 는 오탐 안 냄.
{
  const NONASCII_B = /[Ѐ-ӿ぀-ヿ㐀-鿿가-힣][)\]|?:*+\s]*\\b(?![A-Za-z0-9])/;
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
       .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p1) => p1);
  for (const file of SCAN_DIRS.flatMap(walk)) {
    if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
    let text;
    try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    const lines = stripComments(text).split("\n");
    lines.forEach((line, i) => {
      if (NONASCII_B.test(line)) {
        errors.push(`[정규식\\b함정] ${file.replace(/\\/g, "/")}:${i + 1} — 정규식에서 비ASCII(키릴·한글·CJK·가나) 뒤에 \\b 사용 → JS \\b 는 ASCII 전용이라 그 대안이 통째로 미매칭(dead code, 반성문 #65 부류). ASCII 단위만 \\b 유지하고 비ASCII 는 \\b 없이(숫자/문맥 선행으로 구분)로 나눌 것.\n    ${line.trim().slice(0, 120)}`);
      }
    });
  }
}

// ── 13) 홈 하드코딩 의료진 ↔ 라이브 소스 드리프트 (반성문 #66 영구 차단) ──────────────
// 왜: 홈 화면 DOCTORS_DATA 는 별도 스냅샷이라, 병원 인사변동 때 라이브 소스
//     (src/lib/data/immuneHospitalInfo.js doctors[])만 갱신되고 홈에 퇴사 원장이 계속
//     노출되는 사고가 남(#66: 정유진 신촌 퇴사 후에도 홈 카드 잔존). → 홈에 실린 이름이
//     라이브 소스에 없으면 CI 실패(외부 사이트 대조는 못 하지만, 사본 간 드리프트는 기계가 잡음).
{
  try {
    const home = readFileSync(join(ROOT, "app/home/HomeClient.jsx"), "utf8");
    const live = readFileSync(join(ROOT, "src/lib/data/immuneHospitalInfo.js"), "utf8");
    const block = home.split("const DOCTORS_DATA")[1]?.split("];")[0] || "";
    const names = [...block.matchAll(/name: \{ ko: "([가-힣]{2,5})[ "]/g)].map((m) => m[1]);
    if (!names.length) {
      errors.push(`[의료진드리프트] app/home/HomeClient.jsx 의 DOCTORS_DATA 에서 이름을 못 읽음 — 구조를 바꿨으면 이 검사(§13)도 같이 갱신할 것 (POSTMORTEMS #66)`);
    }
    for (const n of names) {
      if (!live.includes(`"${n}"`)) {
        errors.push(`[의료진드리프트] 홈 DOCTORS_DATA 의 "${n}" 이 라이브 소스(src/lib/data/immuneHospitalInfo.js doctors[])에 없음 — 퇴사·개명 가능성. 병원 공식 사이트(각 지점 doctor.php) 대조 후 두 파일을 같이 갱신할 것 (POSTMORTEMS #66)`);
      }
    }
  } catch (e) {
    errors.push(`[의료진드리프트] 검사 실패: ${e.message}`);
  }
  // /hospitals 목록 페이지의 하드코딩 DOCTORS(작은따옴표 표기)도 같은 부류 — 동일 검사
  try {
    const listPage = readFileSync(join(ROOT, "app/hospitals/HospitalsClient.jsx"), "utf8");
    const live = readFileSync(join(ROOT, "src/lib/data/immuneHospitalInfo.js"), "utf8");
    const block = listPage.split("const DOCTORS = [")[1]?.split("Branch Config")[0] || "";
    const names = [...block.matchAll(/name: \{ ko: '([가-힣]{2,5})'/g)].map((m) => m[1]);
    if (!names.length) {
      errors.push(`[의료진드리프트] app/hospitals/HospitalsClient.jsx 의 DOCTORS 에서 이름을 못 읽음 — 구조를 바꿨으면 이 검사(§13)도 같이 갱신할 것 (POSTMORTEMS #66)`);
    }
    for (const n of names) {
      if (!live.includes(`"${n}"`)) {
        errors.push(`[의료진드리프트] /hospitals DOCTORS 의 "${n}" 이 라이브 소스(immuneHospitalInfo.js)에 없음 — 퇴사·개명 가능성. 공식 사이트 대조 후 갱신할 것 (POSTMORTEMS #66)`);
      }
    }
  } catch (e) {
    errors.push(`[의료진드리프트] /hospitals 검사 실패: ${e.message}`);
  }
}

// ── 14) 알림(in-app) link 가 실제 app 라우트로 존재하는지 (404 방지, 🔁 #31 부류 재발) ──────
// 왜: 새 문의 종(bell) 알림의 어드민 link 가 /admin/inquiries/${id} 인데 그 [id] 상세 라우트가
//     없어 클릭 시 404 (2026-07-07 첫 실고객 #37 — 어드민 2명에게 죽은 링크 발송, POSTMORTEMS).
//     이메일 알림(adminNotifier.ts)은 목록으로 고쳤는데 종 알림만 누락된 "한 곳만 적용된 표류".
//     §4(동적링크)는 app/ 의 router.push·href 만 봐서 src/lib/notifications 의 link 문자열은
//     사각지대였음 → 알림 link 가 가리키는 라우트 존재를 매번 자동 대조.
// ponytail: 값이 "/" 로 시작하는 link 리터럴만 검사(가장 흔한 in-app 알림 링크). ${baseUrl}…
//     처럼 절대 URL 로 조립되는 링크는 범위 밖(정적 분석 불가) — 그건 코드리뷰 몫.
// Next.js 라우트 그룹 (group) 은 URL 세그먼트를 만들지 않음 → 각 레벨에서 투명하게 통과.
// (그룹은 중첩 가능하므로 재귀 확장. 이게 없으면 app/(portal)/coordinator/… 같은 라우트를
//  가리키는 정상 link 를 "없는 라우트"로 오탐한다 — App Router 리팩터에서 흔한 함정.)
function expandRouteGroups(dirs) {
  const out = [];
  const stack = [...dirs];
  while (stack.length) {
    const d = stack.pop();
    out.push(d);
    let entries;
    try { entries = readdirSync(d); } catch { continue; }
    for (const e of entries) if (/^\(.+\)$/.test(e)) stack.push(join(d, e));
  }
  return out;
}
function notifRouteExists(segments) {
  // segments: 경로 세그먼트 배열. `${…}` 를 포함한 세그먼트는 "*"(동적)로 표시.
  let dirs = [join(ROOT, "app")];
  for (const seg of segments) {
    const next = [];
    for (const dir of expandRouteGroups(dirs)) {
      let entries;
      try { entries = readdirSync(dir); } catch { continue; }
      if (seg === "*") {
        for (const e of entries) if (/^\[.+\]$/.test(e)) next.push(join(dir, e)); // 동적 → [param]/[...param]
      } else {
        if (entries.includes(seg)) next.push(join(dir, seg));
        for (const e of entries) if (/^\[.+\]$/.test(e)) next.push(join(dir, e)); // 리터럴을 동적 라우트가 받을 수도
      }
    }
    if (!next.length) return false;
    dirs = next;
  }
  for (const dir of expandRouteGroups(dirs)) {
    for (const f of ["page.jsx", "page.tsx", "page.js", "page.ts"]) {
      try { statSync(join(dir, f)); return true; } catch { /* 다음 */ }
    }
  }
  return false;
}
const NOTIF_LINK_RE = /\blink\s*[:=]\s*[`"'](\/[^`"'\n]*)[`"']/g;
const notifLinkSeen = new Set();
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
    const text = readFileSync(join(ROOT, file), "utf8");
    let m;
    while ((m = NOTIF_LINK_RE.exec(text)) !== null) {
      const raw = m[1];
      if (raw.startsWith("/api")) continue;                 // API 경로는 페이지 아님
      const path = raw.split("?")[0].split("#")[0];          // 쿼리·해시 제거
      const segs = path.split("/").filter(Boolean).map((s) => (/\$\{[^}]*\}/.test(s) ? "*" : s));
      if (!segs.length) continue;                            // 루트 "/" 는 항상 존재
      const key = file + "|" + path;
      if (notifLinkSeen.has(key)) continue;
      notifLinkSeen.add(key);
      if (!notifRouteExists(segs)) {
        errors.push(`[알림링크404] ${file.replace(/\\/g, "/")} — 알림 link "${raw}" 가 가리키는 app 라우트가 없음 → 클릭 시 404 (🔁 #31 부류 재발, #37 사고). 존재하는 라우트로 고치거나 상세 페이지를 만들 것.`);
      }
    }
  }
}

// ── 15) 백오피스 raw h1/h2/h3 에 글자크기 클래스 누락 (마케팅 히어로 크기 유출) ──────
// 왜: app/styles/healo-tokens.css 는 공개 마케팅 페이지용 h1~h3 를 전역 태그 선택자로 정의한다
//     (예: h2 { font-size: clamp(36px, 4.5vw, 64px) }). 백오피스(coordinator/admin/agency/
//     hospital/clinic) 화면에서 <h2 className="font-bold ...">처럼 명시적 text-size 유틸리티
//     없이 raw 헤딩 태그를 쓰면 이 마케팅 히어로 크기가 그대로 새어 들어와 화면이 깨진다
//     (2026-07-08 코디 "AI 상담 리드" — "검토 대기 22건"이 히어로 크기로 렌더, PO 리포트).
//     같은 패턴이 admin 등 12곳에서 동시 발견됨 — 개별 수정이 아니라 검사기로 부류 자체를 차단.
const BACKOFFICE_DIRS = ["app/coordinator", "app/admin", "app/agency", "app/hospital", "app/clinic"];
const HEADING_RE = /<h[123]\s+className="([^"]*)"/g;
const HEADING_SIZE_RE = /text-(xs|sm|base|lg|\d?xl|\[)/;
for (const dir of BACKOFFICE_DIRS) {
  for (const file of walk(dir)) {
    if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
    const text = readFileSync(join(ROOT, file), "utf8");
    let m;
    while ((m = HEADING_RE.exec(text)) !== null) {
      if (!HEADING_SIZE_RE.test(m[1])) {
        errors.push(`[헤딩크기누락] ${file.replace(/\\/g, "/")} — raw <h1/h2/h3 className="${m[1]}">에 text-size 유틸 없음 → 마케팅 히어로 크기(h2 최대 64px) 유출 위험. text-base/text-lg/text-xl 등을 명시할 것 (2026-07-08 부류).`);
      }
    }
  }
}

// ── 16) 스태프 백오피스가 공개용 useLang()(healo_lang, 쿠키 없으면 en 기본) 써서
//        기본 언어가 영어로 새는 회귀 차단 (2026-07-09, PR #727 CI 적발) ──────
// 왜: app/admin·coordinator·hospital 은 스태프(기본 한국 운영)용이라 기본언어가 ko 여야 하는데,
//     공개/에이전시·의료기관용 useLang()(@/lib/i18n/LangContext, 쿠키 없으면 en 기본)을 쓰면
//     로그인 직후(쿠키 없는 새 세션)에 화면이 영어로 뜬다. 정답은 useBackofficeLang()
//     (@/lib/i18n/coordinator, healo_bo_lang 쿠키·기본 ko). 이번 섹션1 다국어화(PR #727)에서
//     4개 파일이 이 실수를 해 E2E Smoke(consultation-create-modal.spec.ts)가 3연속 실패했음
//     (새 세션 기본언어가 en으로 바뀌어 한국어 텍스트 어설션이 깨짐).
// 범위: app/admin, app/coordinator, app/hospital 내부 파일만(도메인 확정). 이 세 디렉토리
//     밖의 공용 컴포넌트(예: src/components/consultation/CreateConsultationModal.jsx — admin·
//     coordinator 공용)는 정적 스캔으로 못 잡음 — 새 백오피스 공용 컴포넌트를 만들 때 이 점을
//     코드리뷰에서 챙길 것(회귀는 여기서 났었음, 커밋 0c41e94f 로 수정).
{
  const BACKOFFICE_ONLY_DIRS = ["app/admin", "app/coordinator", "app/hospital"];
  const PUBLIC_USELANG_IMPORT_RE = /import\s*\{[^}]*\buseLang\b[^}]*\}\s*from\s*["'][^"']*\/i18n\/LangContext["']/;
  for (const dir of BACKOFFICE_ONLY_DIRS) {
    for (const file of walk(dir)) {
      if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
      const text = readFileSync(join(ROOT, file), "utf8");
      if (PUBLIC_USELANG_IMPORT_RE.test(text)) {
        errors.push(`[백오피스언어훅] ${file.replace(/\\/g, "/")} — 공개용 useLang()(@/lib/i18n/LangContext, 쿠키 없으면 en 기본)을 스태프 백오피스에서 사용 중 → 로그인 직후 화면이 영어로 뜸. useBackofficeLang()(@/lib/i18n/coordinator, healo_bo_lang·기본 ko)으로 교체할 것 (PR #727 회귀, 커밋 0c41e94f).`);
      }
    }
  }
}

// ── 17) 외부 스크립트 도메인 ↔ CSP script-src 커버리지 (🔁 #43 부류 재발 — Google Maps) ──
// 왜: next.config.js 의 CSP script-src 에 없는 외부 도메인 스크립트는 브라우저가 조용히 차단한다.
//     #43(Turnstile 캡차 빈 박스)에서 "외부 스크립트 추가 즉시 CSP 확인" 교훈을 얻었지만 습관에만
//     의존해 또 물림(2026-07-14: 병원 상세 지도 — maps.googleapis.com 이 script-src 에 없어
//     Google Maps JS 가 차단, 전 병원·암종 상세가 회색 fallback). → 기계가 매번 차단.
// 탐지: ①알려진 로더 라이브러리 사용 여부 → 필요한 도메인이 script-src(필요 시 connect-src)에
//     있는지. ②next/script <Script src="https://..."> 리터럴의 호스트가 script-src 에 있는지.
{
  try {
    const cfg = readFileSync(join(ROOT, "next.config.js"), "utf8");
    const scriptSrc = cfg.match(/script-src[^,]*/)?.[0] || "";
    const connectSrc = cfg.match(/["'`]connect-src[^,]*/)?.[0] || "";
    const KNOWN_LOADERS = [
      { lib: "@react-google-maps/api (Google Maps JS)", needle: /@react-google-maps\/api|maps\.googleapis\.com\/maps\/api\/js/, domain: "maps.googleapis.com", alsoConnect: true },
    ];
    const usedBy = new Map(); // domain → 최초 발견 파일 + 로더 정보
    const scriptTagHosts = new Map(); // host → 최초 발견 파일
    for (const file of SCAN_DIRS.flatMap(walk)) {
      if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
      let text;
      try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
      for (const l of KNOWN_LOADERS) {
        if (l.needle.test(text) && !usedBy.has(l.domain)) usedBy.set(l.domain, { file, ...l });
      }
      for (const m of text.matchAll(/<Script[^>]+src=["'`]https:\/\/([^/"'`]+)/g)) {
        if (!scriptTagHosts.has(m[1])) scriptTagHosts.set(m[1], file);
      }
    }
    for (const [domain, info] of usedBy) {
      if (!scriptSrc.includes(domain)) {
        errors.push(`[CSP누락] ${info.file.replace(/\\/g, "/")} — ${info.lib} 사용 중인데 next.config.js CSP script-src 에 ${domain} 없음 → 브라우저가 스크립트를 조용히 차단(기능이 fallback 으로 죽음, 🔁 #43 부류). script-src 에 https://${domain} 추가할 것.`);
      }
      if (info.alsoConnect && !connectSrc.includes(domain)) {
        errors.push(`[CSP누락] next.config.js — ${info.lib} 은 런타임 fetch 도 하므로 connect-src 에도 https://${domain} 필요.`);
      }
    }
    for (const [host, file] of scriptTagHosts) {
      if (!scriptSrc.includes(host)) {
        errors.push(`[CSP누락] ${file.replace(/\\/g, "/")} — <Script src="https://${host}/..."> 가 CSP script-src 에 없음 → 프로덕션에서 조용히 차단(🔁 #43 부류). script-src 에 추가할 것.`);
      }
    }
  } catch { /* next.config.js 없는 환경(테스트 등)은 통과 */ }
}

// ── 18) metadata.title 브랜드 중복 차단 (2026-07-14, GSC 색인 실사 → 리뷰 게이트에서 3회 보강) ──
// 왜: 루트 layout.jsx 의 title.template("%s | healwith")가 하위 페이지 title 문자열에
//     자동으로 브랜드를 붙이므로, 템플릿 적용 대상 title 에 "| healwith"가 이미 들어 있으면
//     실제 <title>에 브랜드가 두 번 나간다(privacy 등 27+3파일에서 실발생, 구글 색인 품질 저하).
// 규칙: 템플릿이 적용되는 title 문자열(최상위 metadata·generateMetadata 반환 객체)에는
//     "| healwith"가 꼬리든 중간이든 들어가면 안 됨. 브랜드를 직접 쓰려면 title: { absolute: "…" }.
// 검사 방식: 줄 단위 스캔 + openGraph/twitter 블록 추적(그 안의 title 은 템플릿 미적용이라 허용).
//     따옴표는 ' " ` 전부, 브랜드 위치는 문자열 어디든 잡는다(리뷰 게이트가 찾은 우회 3종:
//     작은따옴표·"FAQ | healwith — …" 중간형·generateMetadata 4칸 들여쓰기 반환 객체).
// 한계(정직하게): openGraph: { title: "… | healwith" } 처럼 한 줄로 접힌 og/tw 는 블록 추적이
//     못 들어가 문자열 리터럴이면 오탐 가능(현재 저장소엔 변수만 씀). 변수로 조립한 title 은 못 잡음.
{
  const TITLE_BRAND_RE = /^\s{2,8}title:\s*['"`][^'"`\n]*\|\s*healwith/;
  const OGTW_OPEN_RE = /(openGraph|twitter)\s*:\s*(\S.*)?\{/;
  const braceDelta = (s) => (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
  for (const file of walk("app")) {
    if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
    if (/layout\.(jsx?|tsx?)$/.test(file)) continue; // 템플릿 정의 자체는 제외
    const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
    let ogDepth = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (ogDepth > 0) {
        ogDepth += braceDelta(line);
        continue; // og/twitter 블록 안 title 은 템플릿 미적용 — 허용
      }
      const m = line.match(OGTW_OPEN_RE);
      if (m) {
        const after = line.slice(line.indexOf(m[0]));
        const d = braceDelta(after);
        if (d > 0) ogDepth = d; // 여러 줄 블록 진입 (한 줄로 닫히면 d=0 → 통과)
        continue;
      }
      if (TITLE_BRAND_RE.test(line)) {
        errors.push(`[제목중복] ${file.replace(/\\/g, "/")}:${i + 1} — 템플릿 적용 title 에 "| healwith" 포함 → 루트 template 이 또 붙여 브랜드가 두 번 나감. 브랜드를 빼거나 title: { absolute: "…" } 를 쓸 것 (2026-07-14 GSC 실사 부류).`);
      }
    }
  }
}

// ── 19) 소프트 404 차단: notFound() 쓰는 공개 동적 라우트 위에 loading 파일 금지 (2026-07-14, #87) ──
// 왜: loading.jsx(Suspense 경계)가 라우트 위에 하나라도 있으면 스트리밍이 먼저 열려,
//     없는 slug에 notFound()를 불러도 HTTP 상태코드가 200으로 굳는다(화면만 404).
//     구글은 이런 "소프트 404"를 살아있는 페이지로 발견해 색인 대기열이 쓰레기 URL로 오염됨.
//     실측: 메타/페이지 어디서 notFound()를 불러도 loading 경계가 있으면 200 (POSTMORTEMS #87).
// 규칙: 공개(비로그인) 영역의 동적 세그먼트([slug]·[id]) page 가 notFound() 를 쓰면,
//     그 라우트의 조상 디렉토리(app 루트 포함)에 loading.(js|jsx|ts|tsx) 가 없어야 한다.
// 한계(정직하게): ①로그인 뒤편(admin·coordinator·patient 등 noindex 구역)은 SEO 무관이라 제외
//     — 라우트그룹 (group) 세그먼트는 괄호를 벗겨 어느 깊이에 있어도 인식. ②notFound() 를
//     page 파일이 아니라 import 한 하위 컴포넌트/헬퍼 안에서만 부르는 라우트는 이 정적 스캔이
//     못 잡음(page 본문만 grep) — 공개 상세 라우트를 만들 땐 notFound() 를 page 에서 부르는 게 관례.
{
  const PRIVATE_SEGS = new Set(["admin", "coordinator", "patient", "hospital", "agency", "clinic", "doctor", "api", "auth", "dev", "design-preview", "account"]);
  const isPrivateRoute = (norm) =>
    norm.split("/").some((seg) => PRIVATE_SEGS.has(seg.replace(/^\((.+)\)$/, "$1")));
  const LOADING_RE = /^loading\.(jsx?|tsx?)$/;
  const findLoadingAncestor = (relDir) => {
    let dir = relDir;
    while (dir.startsWith("app")) {
      const entries = readdirSync(join(ROOT, dir), { withFileTypes: true });
      const hit = entries.find((e) => e.isFile() && LOADING_RE.test(e.name));
      if (hit) return join(dir, hit.name).replace(/\\/g, "/");
      if (dir === "app") break;
      dir = dirname(dir);
    }
    return null;
  };
  for (const file of walk("app")) {
    if (!/page\.(jsx?|tsx?)$/.test(file) || EXCLUDE.test(file)) continue;
    const norm = file.replace(/\\/g, "/");
    if (!/\/\[[^\]]+\]\//.test(norm)) continue; // 동적 세그먼트만
    if (isPrivateRoute(norm)) continue; // 로그인 뒤편 = SEO 무관 (라우트그룹 안이어도 인식)
    const text = readFileSync(join(ROOT, file), "utf8");
    if (!/\bnotFound\s*\(/.test(text)) continue;
    const loadingFile = findLoadingAncestor(dirname(norm));
    if (loadingFile) {
      errors.push(`[소프트404] ${norm} — notFound() 쓰는 공개 동적 라우트인데 조상에 ${loadingFile} 존재 → 스트리밍 경계 때문에 없는 slug 도 HTTP 200(소프트 404)이 됨. 해당 loading 파일을 제거하거나 라우트를 옮길 것 (POSTMORTEMS #87).`);
    }
  }
}

// ── 20) POSTMORTEMS 반성문 번호 중복 차단 (반성문 #90 — #89를 #66으로 잘못 발번한 사고) ──
// 왜: 반성문은 파일 상단이 최신인데, 아래쪽(옛 항목)만 보고 다음 번호를 이어붙이면 중복 발번.
//     번호가 겹치면 "🔁 #NN 부류 재발" 추적·재발률 집계(grep 기반)가 다른 사건을 가리켜 오염됨.
// 과거 충돌 12쌍은 재번호 안 하고 허용목록(🔁 참조·가드 주석이 옛 번호를 가리켜 전면 재번호는
//     참조를 깨는 대수술 — KNOWN_ISSUES 등재, /doc-health 몫). 새 중복만 차단한다.
{
  const HISTORICAL_DUPS = new Set(["31", "32", "39", "42", "55", "56", "57", "58", "59", "60", "61", "62"]);
  try {
    const pm = readFileSync(join(ROOT, "docs/POSTMORTEMS.md"), "utf8");
    const seen = new Map(); // 번호 → 등장 행 목록
    pm.split("\n").forEach((line, i) => {
      const m = line.match(/^##+ #(\d+)\b/);
      if (!m) return;
      const rows = seen.get(m[1]) || [];
      rows.push(i + 1);
      seen.set(m[1], rows);
    });
    for (const [num, rows] of seen) {
      // 허용목록 번호도 '이미 알려진 2회'까지만 — 3회째부터는 새 발번 사고 (독립 리뷰 지적)
      const limit = HISTORICAL_DUPS.has(num) ? 2 : 1;
      if (rows.length > limit) {
        errors.push(`[반성문중복] docs/POSTMORTEMS.md — 반성문 번호 #${num} 이 ${rows.length}회 발번됨 (${rows.join("행 · ")}행, 허용 ${limit}회). 최신 번호는 파일 '상단'에서 확인할 것 — 아래쪽은 옛 항목이라 tail 로 보면 낮은 번호가 나옴 (반성문 #90).`);
      }
    }
  } catch (e) {
    errors.push(`[반성문중복] 검사 실패: ${e.message}`);
  }
}

// ── 21) 문의 입력 라우트 인코딩(U+FFFD) 가드 필수 (반성문 #92 — 알림메일 한글 깨짐) ──
// 왜: CP949 콘솔(curl/PowerShell 등 비브라우저 클라이언트)에서 만든 한글 본문이 UTF-8로
//     디코딩되며 U+FFFD("�")로 깨진 채 inquiries 에 저장 → 관리자 알림 메일·어드민 화면에
//     "���ϸ�ũ" 그대로 노출(테스트 문의 #27·#30·#35·#36, 반성문 #92). 메일 파이프라인은
//     무죄 — 저장 전 입구에서 막는 게 유일한 차단점. inquiries 에 insert 하는 라우트(동적
//     탐지)와 intake 패치 라우트(고정)는 hasMojibake(@/lib/inquiry/noMojibake) 가드 필수.
{
  // intake·step2 는 insert 가 아니라 기존 행 patch/update 라 동적 탐지에 안 걸림 → 고정 지정
  // (step2 는 실제 퍼널 Step2 가 호출하는 라우트 — 독립 리뷰가 누락 적발)
  // 2026-07-15 확장(PO 승인): 자유텍스트를 다른 테이블에 쓰는 공개/포털 경로 + AI챗(승격 시
  // inquiries 로 흘러감 — src/lib/chat/publicChatHelpers.ts 는 app/api 밖이라 입구에서 차단).
  const MUST_GUARD = new Set([
    "app/api/inquiries/intake/route.ts",
    "app/api/inquiries/step2/route.ts",
    "app/api/portal/symptoms/route.ts",
    "app/api/opinions/[token]/route.ts",
    "app/api/public/chat/start/route.ts",
    "app/api/public/chat/message/route.ts",
    "app/api/public/chat/stream/route.ts",
  ]);
  const INSERTS_INQUIRY_RE = /from\(\s*["']inquiries["']\s*\)\s*[\r\n\s]*\.insert\(/;
  for (const file of walk("app/api")) {
    if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
    const norm = file.replace(/\\/g, "/");
    let text;
    try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    if ((INSERTS_INQUIRY_RE.test(text) || MUST_GUARD.has(norm)) && !/\bhasMojibake\b/.test(text)) {
      errors.push(`[인코딩가드누락] ${norm} — inquiries 에 요청 본문을 쓰는 라우트인데 hasMojibake(U+FFFD 거부) 가드 없음 → 깨진 한글이 DB·알림메일에 그대로 박힘 (반성문 #92). request.json() 직후 hasMojibake(body) 면 400 broken_encoding 으로 거부할 것.`);
    }
  }
}

// ── 22) chat_messages.actor_type 코드 리터럴 ↔ DB CHECK 허용집합 (🔁 #94/#62 부류 — enum→CHECK 누락) ──
// 왜: 코드가 actor_type:"X" 로 chat_messages 에 insert 하는데 chat_messages_actor_type_check CHECK 에
//     X 가 없으면 insert 가 조용히 실패(500/internal_error) — 화면엔 "그냥 안 나옴"으로 무증상.
//     이 부류가 agency→hospital 로 반복(반성문 #95). #94 의 방지책은 consultation_messages(상담방)용
//     런타임 E2E 였고 chat_messages(코디·에이전시·병원 메신저)는 정적으로 안 막혀 또 뚫림.
//     → 여기서 정적 차단: enum 값을 코드에 추가하면 같은 PR에 CHECK 확장 마이그레이션이 없으면 빨간불.
// 방식: migrations/*.sql 에서 chat_messages_actor_type_check 최신 정의(파일명=날짜 최대)를 파싱해
//     허용집합을 만들고, app/·src/ 의 actor_type:"…" 리터럴이 전부 그 집합 안인지 검사.
{
  try {
    const allowed = new Set();
    let latestFile = "";
    // walk() 는 CODE_EXT(js/ts)만 반환하므로 .sql 은 readdirSync 로 직접 읽는다.
    let sqlFiles = [];
    try { sqlFiles = readdirSync(join(ROOT, "migrations")).filter((f) => /\.sql$/.test(f)); } catch { sqlFiles = []; }
    for (const f of sqlFiles) {
      let sql;
      try { sql = readFileSync(join(ROOT, "migrations", f), "utf8"); } catch { continue; }
      const m = sql.match(/chat_messages_actor_type_check[\s\S]*?array\s*\[([^\]]*)\]/i);
      if (!m) continue;
      if (f < latestFile) continue; // 파일명(날짜) 순서상 가장 나중에 적용되는 정의만 채택
      latestFile = f;
      allowed.clear();
      for (const v of m[1].matchAll(/'([^']+)'/g)) allowed.add(v[1]);
    }
    if (allowed.size > 0) {
      const ACTOR_LITERAL_RE = /actor_type:\s*["'`]([a-z_]+)["'`]/g;
      for (const file of ["app", "src"].flatMap(walk)) {
        if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
        let text;
        try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
        for (const mm of text.matchAll(ACTOR_LITERAL_RE)) {
          if (!allowed.has(mm[1])) {
            errors.push(`[actor_type-CHECK] ${file.replace(/\\/g, "/")} — 코드가 actor_type:"${mm[1]}" 로 chat_messages 에 쓰는데 DB CHECK 허용집합(${[...allowed].join("/")})에 없음 → insert 가 조용히 실패(무증상, 🔁 #94/#62 부류). 같은 PR에 CHECK 확장 마이그레이션을 추가할 것(예: migrations/20260716_chat_messages_actor_type_hospital.sql).`);
          }
        }
      }
    }
  } catch (e) {
    errors.push(`[actor_type-CHECK] 검사 실패: ${e.message}`);
  }
}

// ── 23) 폐기된 공개 라우트는 영구(308) 리다이렉트 (반성문 #104 — GSC "색인 안 됨" 잔재) ──
// 왜: Next.js 의 redirect() 는 307(임시) 이다. 임시는 구글에 "원본이 곧 돌아온다"는 신호라
//     폐기한 옛 URL 이 색인에 계속 남는다(그래서 GSC 에 몇 달째 유령 항목). permanentRedirect()
//     = 308 이어야 구글이 옛 URL 을 새 URL 로 교체하고 색인에서 뺀다.
// 규칙: 공개(비로그인) 영역에서 **본문이 리다이렉트뿐인** page(= 라우트 폐기용 껍데기)는
//     redirect() 대신 permanentRedirect() 를 써야 한다.
// 판정 방식: "화면이 없나"(부정 제외)가 아니라 **"폐기용 껍데기 모양인가"**(긍정 식별)로 본다.
//     껍데기 = 기본 export 함수의 **본문이 리다이렉트 한 줄뿐인** 것. 살아있는 페이지는 본문이
//     길어서 절대 안 걸린다. 로그인 뒤편(PRIVATE_SEGS)은 SEO 무관 → 제외. proxy.ts 의
//     /partner·/doctor 는 파일이 아니라 미들웨어 분기라 이 검사 밖 — 거긴 코드에서 직접 308.
// ⚠️ 이 형태에 도달하기까지 초안 2개가 독립 리뷰·실측에 깨졌다(둘 다 부정 제외 방식이라 깨진 것):
//     ①`text.includes("<")` → 주석의 `<StoriesClient />` 부등호 하나로 검사가 통째로 꺼짐(fail-open
//       실증). .tsx 제네릭(Array<string>)·비교연산자(<=)·JSDoc 링크도 같은 구멍.
//     ②주석 제거 후 "JSX 를 반환하나(`return <`)" → **오탐**. app/treatments/[slug]/page.jsx 는
//       JSX 를 변수에 담아 `return content;` 로 반환해서 껍데기로 오인됨(실측으로 잡음).
//     한계(정직): 껍데기를 화살표 함수 등 다른 형태로 쓰면 이 검사가 그냥 안 돈다(오탐 대신 미탐).
//     오탐으로 CI 를 막는 것보다 낫다고 보고 이 쪽을 택함.
{
  const PRIVATE_SEGS = new Set(["admin", "coordinator", "patient", "hospital", "agency", "clinic", "doctor", "api", "auth", "dev", "design-preview", "account"]);
  // 주석(줄·블록) 제거 — 주석 내용이 판정에 끼어들면 안 된다.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // 폐기용 껍데기: `export default function X() { redirect("/어디"); }` — 본문이 리다이렉트뿐.
  const SHELL_RE = /export\s+default\s+(?:async\s+)?function\s+\w*\s*\([^)]*\)\s*\{\s*(redirect|permanentRedirect)\s*\(\s*["'`][^"'`]*["'`]\s*\)\s*;?\s*\}/;
  for (const file of walk("app")) {
    if (!/page\.(jsx?|tsx?)$/.test(file) || EXCLUDE.test(file)) continue;
    const norm = file.replace(/\\/g, "/");
    if (norm.split("/").some((seg) => PRIVATE_SEGS.has(seg.replace(/^\((.+)\)$/, "$1")))) continue;
    let text;
    try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    const m = stripComments(text).match(SHELL_RE);
    if (!m || m[1] === "permanentRedirect") continue; // 껍데기가 아니거나 이미 영구
    errors.push(`[임시리다이렉트] ${norm} — 폐기된 공개 라우트인데 redirect()(307 임시) 사용 → 구글이 옛 URL 을 색인에 계속 붙들어 둠. permanentRedirect()(308 영구) 로 바꿀 것 (POSTMORTEMS #104).`);
  }
}


// ── §21 멱등 가드에 .maybeSingle() 금지 (POSTMORTEMS #105) ──────────────
// 왜: 중복 방지용 "이미 있나?" 검사에 maybeSingle() 을 쓰면, **중복이 실제로 생긴 순간**
// PGRST116 에러가 나고 data 가 null 이 된다 → "없음"으로 오인 → 매 실행마다 새로 만드는
// 무한 루프. 즉 가드가 스스로를 무력화한다. limit(1) + 명시적 error 검사로 써야 한다.
// 실제로 설문 발송 cron 이 이 구조였고(2026-07-21 독립 리뷰 적발), 그대로 갔으면 환자에게
// 매일 설문 메일이 나가고 K-03 만족도 응답률이 망가졌다.
//
// 유예 목록(GRANDFATHERED)은 2026-07-21 에 비었다 — 룰 신설 당시 유예했던 8곳(7파일)을
// 전부 수리하고 목록·경고를 삭제했다. 이제 이 부류는 예외 없이 빌드 실패다. 되살리지 마라.
//
// 판정 방식(2026-07-21 독립 리뷰로 2차 보강): "앞 300자에 error 가 보이면 통과" 였던 초판은
// 두 가지로 샜다 — ①바로 앞 문장이 error 를 받으면 바로 뒤 나쁜 자리가 묻어서 통과(실제로
// 이 PR 의 crawl 수정이 그 모양을 만들었다) ②주석에 "{ data, error" 만 있어도 통과.
// 그래서 **그 statement 의 구조분해만** 본다.
//
// ⚠️ 알려진 사각(의도적으로 안 넓힘): 이 룰은 `.select("id")` 로 **id 만** 고르는 자리만 본다.
// `.select("id, status")` 처럼 컬럼을 더 고르는 find-or-create 가드는 못 잡는다. 넓혀서
// 돌려보니 20건이 걸리는데 그 대부분이 **유니크 키로 한 행 읽는 정상 조회**(토큰 조회 등)라
// 오탐이 진짜를 덮는다 — 시끄러운 게이트는 결국 꺼진다. 넓히려면 "존재검사"를 컬럼 수가
// 아니라 용도로 가려내야 하고, 그건 이 정규식의 일이 아니다. 남은 자리 목록은 KNOWN_ISSUES 참고.
{
  // 유예: 아래 라우트는 호출부 0건인 고아 코드라 **삭제 결정**(PO 2026-07-21)이 나 있고
  // 별도 세션이 처리 중이다. 곧 사라질 파일 때문에 CI 를 막지 않으려고 한시적으로만 예외.
  // ⚠️ 파일이 지워지면 이 Set 과 grandfatheredSeen 경고도 같이 삭제할 것(목록은 늘리지 마라).
  const GRANDFATHERED = new Set(["app/api/portal/emergency/route.ts"]);
  let grandfatheredSeen = 0;

  // 존재검사 후보: .select("id") 로 시작해 .maybeSingle() 로 끝나는 체인.
  // ⚠️ 간격을 [^;] 로 묶는다 — [\s\S] 로 두면 매칭이 **세미콜론을 넘어 다음 문장까지** 뻗어서,
  // 앞 문장이 error 를 받았다는 이유로 뒤의 진짜 위반이 묻힌다(아래 자기시험 fixture #1 이 그 모양).
  const idSelectThenMaybeSingle = /\.select\(\s*["'`]id["'`]\s*\)[^;]{0,300}?\.maybeSingle\(\)/g;
  // 같은 statement 에서 error 를 실제로 구조분해로 받는 형태만 통과.
  const destructuredWithError =
    /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*await[^;]{0,300}?\.select\(\s*["'`]id["'`]\s*\)[^;]{0,300}?\.maybeSingle\(\)/g;

  // 주어진 소스에서 "위반"으로 판정되는 자리 수. 본 검사와 자기시험이 같은 로직을 쓴다.
  const violationsIn = (src) => {
    const okEnds = new Set();
    let d;
    destructuredWithError.lastIndex = 0;
    while ((d = destructuredWithError.exec(src))) {
      if (/\berror\b/.test(d[1])) okEnds.add(d.index + d[0].length);
    }
    let n = 0, m;
    idSelectThenMaybeSingle.lastIndex = 0;
    while ((m = idSelectThenMaybeSingle.exec(src))) {
      if (!okEnds.has(m.index + m[0].length)) n++;
    }
    return n;
  };

  // ── 자기시험: 룰이 실제로 잡는지/안 잡을 것은 안 잡는지 매 실행 확인 ──────────────
  // 왜: 가드를 만들어놓고 **정작 뚫린 채 초록불**이던 사고가 있었다(POSTMORTEMS #103).
  // 아래는 독립 리뷰가 실제로 찾아낸 실패 모양이다. 룰을 손대다 깨지면 CI 가 즉시 실패한다.
  {
    const fixtures = [
      // 잡아야 함 — 앞 문장이 error 를 받았다고 뒤의 위반이 묻어 통과되면 안 된다(초판의 구멍)
      [1, `const { data: rows, error: e } = await db.from("x").select("a,b").eq("id", id);\nif (e) throw e;\nconst { data: existing } = await db.from("s").select("id").eq("inquiry_id", id).maybeSingle();`],
      // 잡아야 함 — 가장 단순한 위반
      [1, `const { data: existing } = await db.from("s").select("id").eq("inquiry_id", id).maybeSingle();`],
      // 잡으면 안 됨 — error 를 먼저 구조분해한 정상 코드(순서 무관해야 한다)
      [0, `const { error: e, data: existing } = await db.from("s").select("id").eq("inquiry_id", id).maybeSingle();`],
    ];
    fixtures.forEach(([expected, src], i) => {
      const got = violationsIn(src);
      if (got !== expected) {
        errors.push(
          `[멱등가드-자기시험] §21 룰이 깨졌다 — fixture #${i + 1} 기대 ${expected}건, 실제 ${got}건. ` +
          `룰을 고쳤으면 자기시험도 같이 맞출 것 (POSTMORTEMS #103·#105).`
        );
      }
    });
  }
  for (const file of [...walk("app"), ...walk("src")]) {
    if (!/\.(ts|tsx|jsx|js)$/.test(file)) continue;
    let text;
    try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    if (!text.includes("maybeSingle")) continue;
    const norm = file.split("\\").join("/");

    // error 를 제대로 받은 자리의 끝 위치를 모아둔다(체인 끝 = .maybeSingle() 위치로 대조).
    const okEnds = new Set();
    let d;
    destructuredWithError.lastIndex = 0;
    while ((d = destructuredWithError.exec(text))) {
      if (/\berror\b/.test(d[1])) okEnds.add(d.index + d[0].length);
    }

    let m;
    idSelectThenMaybeSingle.lastIndex = 0;
    while ((m = idSelectThenMaybeSingle.exec(text))) {
      if (okEnds.has(m.index + m[0].length)) continue;
      if (GRANDFATHERED.has(norm)) { grandfatheredSeen++; continue; }
      const line = text.slice(0, m.index).split("\n").length;
      errors.push(
        `[멱등가드] ${norm}:${line} — 존재검사에 .maybeSingle() 을 쓰면서 error 를 안 받는다. ` +
        `행이 2개가 되는 순간 에러가 "없음"으로 둔갑해 무한 재생성이 된다. .limit(1) + error 명시 검사로 바꿀 것 (POSTMORTEMS #105).`
      );
    }
  }
  // 유예분은 막지 않되 **반드시 말은 한다** — 카운터만 올리고 침묵하면 유예가 영구화된다
  // (침묵 = "유예 없음"과 구별 불가. 이 검사기가 잡으려는 조용한 실패와 같은 부류다).
  if (grandfatheredSeen > 0) {
    console.warn(
      `⚠️  [멱등가드] 유예 중 ${grandfatheredSeen}건 — 삭제 예정 파일이라 통과시킴. ` +
      `파일이 지워지면 §21 의 GRANDFATHERED Set 도 같이 지울 것.`
    );
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
