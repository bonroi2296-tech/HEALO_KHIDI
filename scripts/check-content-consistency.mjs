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
import { execSync } from "node:child_process";
import { join, dirname, sep } from "node:path";
import { pathToFileURL } from "node:url";
// §32(산출물 .docx 검사)용 — .docx 는 zip 이라 내장 zlib 만으로 본문을 꺼낸다(의존성 0).
import { inflateRawSync } from "node:zlib";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src", "components"];
// glossary.js 는 «피할 말» 목록을 일부러 담는 규칙 파일이라 금지토큰 검사 대상에서 뺀다(2026-09-06).
const EXCLUDE = /node_modules|\.next|\.test\.|\.spec\.|__tests__|\/archive\/|src\/lib\/i18n\/glossary\.js/;
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
  // khidi.healo.kr 은 컷오버 전 옛 도메인 — 이제 «없는 주소»고 healo.kr 자체가 남의 사이트다.
  // 2026-08-20: translate API 의 origin 허용목록에서도 뺐으므로 면제(allow) 자체를 없앴다.
  //   → 누가 다시 넣으면 이 검사가 잡는다(시험 파일은 EXCLUDE 로 애초에 안 훑는다).
  { re: /khidi\.healo\.kr/i, msg: "옛 도메인 khidi.healo.kr 잔재 (→ healwith.co.kr) — 없는 주소이고 healo.kr 은 남의 도메인" },
  { re: /HEALO-KHIDI/, msg: "옛 브랜드 HEALO-KHIDI 가 제품 코드에 (코드명은 주석/내부만, 고객 텍스트 금지)" },
  // 면력한방병원 외국어 표기는 «Immune Hospital» 하나 — PO 결정 2026-09-06(«외국어는 Immune Hospital 로 통일»).
  // 그 전엔 한 사이트에 5가지(Иммунная Клиника / Иммуногоспиталь / Клиника Мёнрёк / 免疫医院·免疫病院 / 발명 음역)가 섞여
  // 환자가 서로 다른 병원으로 읽었다. 한국어 «면력한방병원» 만 예외. 지점은 뒤에 현지 표기(Immune Hospital Кансо / Immune Hospital 江西院).
  // 용어집(src/lib/i18n/glossary.js)은 «피할 말»을 일부러 담으므로 EXCLUDE 로 뺀다.
  { re: /Myunghyuk|Мённёк|ミョンニョク|Иммуногоспитал|Иммунн\S* [Кк]линик|Иммундық клиника|Myeonryeok|Myeonlyeok|Мёнрёк|免疫医院|免疫病院|免力韩方|免力韓方|面力韩方|面力韓方|ミョンリョク/i, msg: "면력한방병원 외국어 표기는 «Immune Hospital» 하나 (PO 2026-09-06) — 옛 표기·발명 음역 금지" },
  // 보안: 비밀키를 NEXT_PUBLIC_ 접두사로 두면 클라이언트 번들에 그대로 박혀 노출된다
  // (2026-06-20 NEXT_PUBLIC_CRON_SECRET 누출 사고). 공개돼도 되는 값만 NEXT_PUBLIC_ 사용.
  { re: /NEXT_PUBLIC_[A-Z0-9_]*SECRET/, msg: "비밀키가 NEXT_PUBLIC_ 접두사로 클라이언트에 노출됨 — 서버 전용(CRON_SECRET 등)으로 옮기고 관리자 인증 라우트로 감쌀 것" },
  // 「보이지 않는데 눌리는 버튼」 차단 (2026-07-28 발견).
  // opacity-0 은 «안 보이게»만 할 뿐 «못 누르게» 하지 않는다. 마우스가 없는 모바일에선
  // group-hover 가 영영 안 걸려 버튼이 계속 투명한 채로 남는데, 클릭은 그대로 먹는다.
  // 실제 피해: 병원·치료 사진 썸네일(약 70px) 위에 44px 투명 삭제 버튼이 얹혀 있어
  // 폰으로 사진을 누르면 사진이 목록에서 빠졌다(의료진 사진은 inset-0 이라 전체가 삭제 버튼).
  // → opacity-0 으로 감출 거면 pointer-events-none 을 같이 걸어라.
  { re: /^(?=.*<button)(?=.*\bopacity-0\b)(?=.*group-hover:opacity-100)(?!.*pointer-events-none).*$/, msg: "투명한데 눌리는 버튼 — `opacity-0` 은 클릭을 막지 않는다(모바일엔 hover 가 없어 영영 투명). `pointer-events-none group-hover:pointer-events-auto` 를 같이 걸 것" },
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
  // 「중입자(탄소이온) 치료」 소재 금지 — PO 결정으로 세 번 취소된 변경이다(2026-07-29 PR #1189 닫음:
  // "자료조사만 요청했는데 코드까지 손댔음" → 2026-07-30 재확인: 손대지 않는다 → 같은 날 재지시 "지워라").
  // 그런데도 미합류 작업본 2개(feat/advanced-treatments · docs/handoff-0729-auth)에 살아 있어서
  // 그게 합쳐지는 순간 본판에 되돌아온다. 사람이 매번 막는 대신 기계가 막는다(CLAUDE.md 규칙 7).
  // ※ 세브란스 소개의 기존 「양성자치료센터」 표기는 PO 결정으로 그대로 둔다 — 여기서 막는 건 중입자 표기뿐.
  { re: /중입자|углеродно-ионн|тяжелоионн|heavyIon/i, msg: "「중입자(탄소이온·углеродно-ионная) 치료」 표기 금지 — PO 가 세 번 취소한 변경이다. 병원 정보·치료 목록에 다시 넣지 말 것. 되살리려면 PO 재확인 먼저(2026-07-30 결정)" },
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
//     baseline 에 «개수»로 둔다. 새 파일이든 «기존 파일의 새 줄»이든 늘면 CI 가 막아, 추가자가
//     "사용자입력 아닌지" 감사 후 의식적으로 allowlist 에 올리게 강제한다(기계가 잡는다).
//     매칭은 실제 JSX 사용(`dangerouslySetInnerHTML=`)만 — 단어가 든 주석은 오탐 제외.
//
// ⚠️ 2026-08-03 전수감사에서 «구멍»을 찾아 고쳤다. 예전엔 «파일 단위 면제»(Set)였다:
//      if (... && !XSS_INNERHTML_ALLOWLIST.has(file))
//    → 감사된 15개 파일 «안»에 새 dangerouslySetInnerHTML 을 추가하면 그냥 통과했다(시험으로 확인).
//      위 주석은 「새 파일이 추가하면 막는다」고 했는데, 실제로 막던 건 «새 파일»뿐이었다.
//    → «개수 동결». 늘린 사람이 그 줄을 직접 감사하고 아래 숫자를 올려야 통과한다(= 감사 완료 서명).
const XSS_INNERHTML_BASELINE = {
  // 0 → 1 (2026-08-05): 환자가 받은 워드(.docx) 서류를 화면에서 보여주는 미리보기.
  // 감사 결과 안전 — 이 HTML 은 **서버가 허용 목록으로 정제한 것**이다
  // (src/lib/documents/docxHtml.ts): 남기는 태그는 문단·목록·제목·표뿐이고 **속성은 전부 버린다**
  // (표 병합 colspan/rowspan 만, 그것도 값이 숫자일 때만). 그래서 onerror·href·style 같은
  // 실행 경로가 애초에 남지 않는다. script·style·iframe·object·embed 는 내용까지 지운다.
  // 파일을 올리는 사람도 우리 코디다(직원 전용 창구).
  "app/claim/[token]/ClaimClient.jsx": 1,
  // 0 → 1 (2026-09-04): 병원 의뢰서 미리보기 — 병원이 준 워드 양식을 «그 구조 그대로» 그린다.
  // 감사 결과 안전 — 이 HTML 은 **서버가 통째로 지어낸 것**이다(src/lib/inquiry/docxTableToHtml.ts):
  //   · 나가는 태그는 그 파일이 만드는 table·colgroup·col·tbody·tr·td·br 뿐이고,
  //     원본 XML 의 태그는 **한 개도 통과시키지 않는다**(정규식으로 «글자만» 꺼낸다).
  //   · 속성은 colspan·rowspan·class="sh"·style="width:NN%" 넷뿐이고 전부 «숫자·고정 문자열»이다.
  //   · 칸 글자는 전부 esc() 를 거친다(& < > "). 그래서 onerror·href·onclick 이 들어갈 자리가 없다.
  // 값의 출처가 환자 서류(AI 판독)라 «사용자 입력»이 맞다. 그래서 두 겹으로 막혀 있다 —
  // 값이 XML 에 들어갈 때 한 번(referral-docx 의 xmlText), 화면에 나올 때 한 번(esc).
  // `<script>` 를 넣어 보면 화면에 «글자로» 보인다.
  "app/coordinator/inbox/[id]/HospitalReferralSection.jsx": 1,
  "app/page.jsx": 1,
  // 5 → 6 (2026-08-03): 늘어난 1건은 head 의 「스토어 앱 웹뷰인가」 표식 스크립트.
  // 감사 결과 안전 — 통짜 문자열 상수 하나이고 변수·요청값·사용자 입력이 **한 글자도 안 섞인다**
  // (읽는 건 navigator.userAgent 뿐이고, 쓰는 건 고정값 "1" 한 개). 나머지 5건은 기존 감사분.
  "app/layout.jsx": 6,
  "app/care-journey/page.jsx": 1,
  "app/insurance/page.jsx": 1,
  "app/cost-calculator/page.jsx": 1,
  "app/faq/page.jsx": 1,
  "app/kk/for-kazakh-patients/page.jsx": 1,
  "app/ru/for-russian-patients/page.jsx": 1,
  "app/treatments/[slug]/page.jsx": 2,
  "app/hospitals/[slug]/page.jsx": 2,
  "app/hospitals/immune/page.jsx": 1,
  "app/specialties/plastic-surgery/page.jsx": 1,
  "app/specialties/korean-medicine/KoreanMedicineClient.jsx": 1,
  "app/specialties/dermatology/page.jsx": 1,
  "app/specialties/dental/page.jsx": 1,
};

const errors = [];

// ── 1c) 안전영역(노치·상태표시줄·시스템 버튼줄) 여백은 «변수를 거쳐야» 한다 ────────────
// 왜 (2026-08-03): `env(safe-area-inset-*)` 를 그대로 쓰면 카톡 등 «앱 안 브라우저»에서
//   빈 칸이 생긴다 — 안드로이드 15 부터 웹뷰가 시스템 막대 높이를 «피할 게 없는데도» 알려준다.
//   실측: 상단바 57px 자리에 94px(로고 위 37px 빈 칸), 하단 탭바 65px 자리에 112px(탭 밑 47px).
//   그래서 「어디서 열었나(브라우저/설치 앱/스토어 앱)」에 따라 켜지는 스위치를 변수에 넣었다.
//   → 새로 `env(safe-area-inset-*)` 를 직접 쓰면 그 스위치를 우회해 같은 빈 칸이 되살아난다.
// 쓸 것: var(--healo-safe-top) / --healo-safe-bottom / --healo-safe-left / --healo-safe-right
//        (정의는 src/index.css 안전영역 절 — 거기만 env() 를 직접 쓴다)
// ponytail: 주석 줄은 뺀다(설명에 env(...) 를 적는 건 정상). 독립 파일 public/offline.html 은
//   우리 CSS 를 안 쓰므로 애초에 검사 대상 밖이다.
// ⚠️ 공용 walk() 는 js/jsx/ts/tsx 만 돌려준다(CODE_EXT) — **CSS 는 안 본다.**
//    처음 이 검사를 넣었을 때 그걸 몰라서, 일부러 넣은 위반(.css)을 못 잡는 «죽은 검사»였다.
//    그래서 여기서만 CSS 까지 훑는 작은 걸음마를 따로 쓴다(공용 CODE_EXT 는 안 건드린다 —
//    다른 규칙들이 그 값에 기대고 있어 같이 바뀌면 엉뚱한 데가 터진다).
const walkCss = (dir) => {
  const out = [];
  let entries;
  try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
  for (const e of entries) {
    const rel = join(dir, e);
    if (EXCLUDE.test("/" + rel.replace(/\\/g, "/") + "/")) continue;
    let st;
    try { st = statSync(join(ROOT, rel)); } catch { continue; }
    if (st.isDirectory()) out.push(...walkCss(rel));
    else if (/\.css$/.test(e)) out.push(rel);
  }
  return out;
};
const SAFE_AREA_ENV_RE = /env\(\s*safe-area-inset-(top|bottom|left|right)/;
const SAFE_AREA_DEF_FILE = "src/index.css"; // 유일하게 env() 를 직접 쓰는 «정의» 파일
const SAFE_AREA_FILES = [...["app", "src"].flatMap(walk), ...["app", "src"].flatMap(walkCss)];
for (const file of SAFE_AREA_FILES) {
  // ⚠️ 경로 구분자를 맞춘 뒤 비교한다. join() 은 윈도우에서 `src\index.css` 를 주는데
  //    비교 대상은 `src/index.css` 라, 정의 파일이 스스로에게 걸려 **윈도우에서만 12건 실패**했다
  //    (2026-08-04 실측 — CI(리눅스)는 초록, PO PC 는 빨강). 검사기가 자기 PC 에서만 틀리면
  //    사람이 검사기를 믿지 않게 된다.
  if (file.replace(/\\/g, "/") === SAFE_AREA_DEF_FILE) continue;
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    const bare = line.trim();
    if (bare.startsWith("*") || bare.startsWith("//") || bare.startsWith("/*")) return; // 주석
    if (!SAFE_AREA_ENV_RE.test(line)) return;
    errors.push(
      `[안전영역] ${file}:${i + 1} — env(safe-area-inset-*) 를 직접 쓰지 마라. ` +
        `앱 안 브라우저가 시스템 막대 높이를 잘못 알려줘 «빈 칸»이 생긴다(2026-08-03 실측 상단 37px·하단 47px). ` +
        `var(--healo-safe-top|bottom|left|right) 를 써라 — 「어디서 열었나」에 따라 켜지는 스위치가 그 안에 있다. ` +
        `(정의는 ${SAFE_AREA_DEF_FILE})\n    ${bare.slice(0, 120)}`
    );
  });
}

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
    if (/dangerouslySetInnerHTML\s*=/.test(line)) {
      const relX = file.replace(/\\/g, "/");
      const allowedX = XSS_INNERHTML_BASELINE[relX] ?? 0;
      const countX = (content.match(/dangerouslySetInnerHTML\s*=/g) || []).length;
      if (countX > allowedX) {
        errors.push(
          `[XSS가드] ${file}:${i + 1} — dangerouslySetInnerHTML 이 이 파일에 ${countX}건 (감사된 기준선 ${allowedX}건 → ${countX - allowedX}건 늘었다). ` +
            `'사용자 입력'을 렌더하면 XSS(세션탈취→개인정보) 직결이다. JSON-LD/정적이라 안전함을 «새로 늘어난 것까지» 확인했으면 ` +
            `scripts/check-content-consistency.mjs 의 XSS_INNERHTML_BASELINE 에서 이 파일 숫자를 ${countX} 로 올려라(= 감사 완료 표시). ` +
            `사용자입력이면 React 노드/이스케이프로 바꿀 것.\n    ${line.trim().slice(0, 120)}`
        );
      }
    }
  });
}

// ── 2) i18n 활성 6개 언어 키 패리티 ─────────────────────────────
const ACTIVE = ["ko", "en", "ru", "kz", "zh", "ja"];
const I18N = "src/lib/i18n/dictionary.js";
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

// ── 2b) 사전 값 언어-스크립트 불일치(가짜 번역 유입 차단) ─────────────
// 왜: km(크메르)·my(미얀마) 섹션이 통째로 인도네시아어 복사본이었음(2026-07-24 발견 —
//     언어 선택기에서 고르면 그 언어 사용자에게 남의 언어가 노출). 값에 해당 언어 문자가
//     하나도 없이 라틴 알파벳만 길게 있으면 "그 언어가 아님"으로 판정해 재유입을 차단.
//     라틴 문자권 언어(en·vi·id·ms 등)끼리는 스크립트로 구분 불가 → 검사 대상 아님.
const SCRIPT_EXPECT = {
  ko: /[가-힣]/, ja: /[぀-ヿ一-鿿]/, zh: /[一-鿿]/,
  ru: /[Ѐ-ӿ]/, kz: /[Ѐ-ӿ]/, mn: /[Ѐ-ӿ]/,
  th: /[฀-๿]/, ar: /[؀-ۿ]/, hi: /[ऀ-ॿ]/,
  km: /[ក-៿]/, my: /[က-႟]/,
};
// 라틴 표기가 정상인 키(이메일 예시·브랜드/제품명을 그대로 쓰는 값)
// 라틴 표기가 정상이거나(이메일 예시·파일 포맷), 원본부터 전 언어 공통 영어 라벨이던 키.
// 2026-07-24 인라인→중앙사전 이관(#974)으로 드러남 — 값은 원본 그대로 옮겼고(창작 번역 금지),
// 이제 코디 콘텐츠 편집기에서 언어별로 고칠 수 있다.
const SCRIPT_ALLOW = new Set([
  "login.emailPlaceholder",
  "inquiry.messenger",
  "inquiryFunnel.emailPlaceholder", // 이메일 예시
  "patientDocs.formats", // "PDF, JPEG, PNG, WebP"
  "patientProgress.allowed", // "PDF·JPG·PNG·DICOM" — 파일 형식 이름은 전 언어 공통
  "inquiryFunnel.aiAgent", // 원본부터 전 언어 "AI Agent"
  "inquiryFunnel.humanAgent",
  "inquiryFunnel.inquiryForm",
  "visaHub.myAppsKicker",
  "patientMessages.ai", // "healwith AI" 브랜드명
  "hospitalsPage.consortium.name", // 면력한방병원 외국어 표기 = 라틴 «Immune Hospital» 하나(PO 2026-09-06)
  // 원격협진 소개의 "상담 화면 목업" — 의사가 한국어로 말하고 AI가 영어로 옮기는 시연이라
  // 한국어 화면에서도 번역줄이 영어인 게 원문 의도(원본 그대로).
  "telemedicine.mockup.transLine",
]);
try {
  const text = readFileSync(join(ROOT, I18N), "utf8").split("\n");
  let cur = null;
  const bad = [];
  text.forEach((line, idx) => {
    const m = line.match(/^ {2}([a-z]{2}): \{\s*$/);
    if (m) { cur = m[1]; return; }
    if (/^\};/.test(line)) { cur = null; return; } // DICTIONARY 닫힘
    const re = cur && SCRIPT_EXPECT[cur];
    if (!re) return;
    const kv = line.match(/^ {4}"([^"]+)": "(.*)",?\s*$/);
    if (!kv || SCRIPT_ALLOW.has(kv[1])) return;
    const latin = (kv[2].match(/[A-Za-z]/g) || []).length;
    if (latin >= 6 && !re.test(kv[2])) bad.push(`${cur} ${idx + 1}행 ${kv[1]}="${kv[2].slice(0, 40)}"`);
  });
  if (bad.length) {
    errors.push(
      `[i18n-스크립트] 사전 값이 섹션 언어의 문자가 아님(다른 언어 복사·오염 의심) ${bad.length}건: ` +
        `${bad.slice(0, 5).join(" · ")}${bad.length > 5 ? " …" : ""} — 해당 언어로 번역하거나, 라틴 표기가 정상인 키면 SCRIPT_ALLOW에 추가`
    );
  }
} catch {
  /* 읽기 실패는 위 2)에서 이미 보고됨 */
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

// ── 5-b) public/ 의 .html 도 금지토큰 검사 (2026-07-28 신설) ─────────────
// 왜: walk() 가 CODE_EXT(js|jsx|ts|tsx)만 담아서 **.html 은 통째로 사각지대**였다.
//     `public/` 에는 사용자가 실제로 보는 정적 화면이 있다(오프라인 화면 등). 죽은 옛 도메인이나
//     옛 이메일이 여기 박히면 **어떤 검사에도 안 걸린다** — 게다가 오프라인 화면은 인터넷이
//     끊겼을 때만 뜨므로 사람 눈에도 거의 안 띈다(2026-07-28 전수 조사에서 발견).
//     이 파일들은 손으로 만든 정적 화면이라 i18n 검사 대상은 아니지만, 금지토큰은 똑같이 적용한다.
//     ※ 동작 확인 방법: offline.html 의 healwith.co.kr 을 healo-khidi.vercel.app 으로 바꾸면 빨간불.
{
  const htmlDir = join(ROOT, "public");
  const stack = ["public"];
  while (stack.length) {
    const rel = stack.pop();
    for (const e of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) {
        if (!/node_modules/.test(child)) stack.push(child);
      } else if (e.name.endsWith(".html")) {
        const lines = readFileSync(join(ROOT, child), "utf8").split("\n");
        lines.forEach((line, i) => {
          for (const f of FORBIDDEN) {
            if (f.re.test(line) && !(f.allow && f.allow.test(child))) {
              errors.push(`[금지토큰:html] ${child}:${i + 1} — ${f.msg}\n    ${line.trim().slice(0, 120)}`);
            }
          }
        });
      }
    }
  }
  void htmlDir;
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

// ── 7.5) 인라인 미니사전(const L={...ko/ru...}) CMS 우회 가드 (2026-07-23) ──
// 왜: 공개 화면 문구가 중앙 사전(t())을 안 거치고 컴포넌트 안 `const L = {}` 미니사전으로 박히면
//     번역은 되지만 코디 콘텐츠 편집기(/coordinator/content)에 안 잡혀 수정 불가.
//     바로 위 [환자i18n] 검사는 ru/kz 키만 있으면 통과시켜(번역은 됐으니) 이 우회를 정확히 못 막음
//     — 오히려 인라인-L 이 그 검사의 '탈출구'라 새 문구가 CMS 밖으로 새는 통로가 됨.
//     → 공개 파일에 새 인라인-L 이 생기면 CI 차단. 기존 5개는 grandfather(점진 마이그레이션).
//     고치는 법: 문구를 src/lib/i18n/dictionary.js DICTIONARY 에 키로 넣고 t("키", lang) 로 렌더.
// 2026-07-24 (#974): 옛 grandfather 5개 포함 공개 화면 38개 파일을 전부 중앙 사전으로 이관 →
// 면제는 아래 1개만 남았다. 새 인라인 미니사전은 어떤 공개 파일에서도 CI 실패다.
// ⚠️ 여기에 파일을 추가하지 마라 — 면제가 곧 "PO가 못 고치는 화면"이 된다(POSTMORTEMS #118).
// ⚠️ 2026-08-03 전수감사: 여기도 «파일 단위 면제»(Set)였다 → 그 파일 안에 미니사전을 «더»
//    넣어도 통과했다. XSS·주색 가드와 같은 부류라 함께 «개수 동결»로 바꾼다.
const INLINE_L_BASELINE = {
  // 화상 상담방 문구. 상담방은 통역·자막 전담 세션이 계속 고치는 실시간 UI라(#780·#820·#915)
  // 같은 시각에 이관하면 충돌한다 → 그 세션 작업이 끝난 뒤 이관한다(다음 CMS 세션 1순위).
  "app/consultation/[id]/_roomCopy.js": 1,
};
// 변수명은 L 뿐 아니라 COPY·T·DICT 도 매칭(옛 가드가 L 만 봐서 COPY 로 우회되던 사각 — SocialProof·CookieConsent 실사례).
const INLINE_L_RE = /\bconst\s+(L|COPY|T|DICT|TEXTS?|LABELS)\s*=\s*\{/;
const INLINE_L_LANGKEY_RE = /\b(ko|en|ru|kz|zh|ja)\s*:/;
for (const file of SCAN_DIRS.flatMap(walk)) {
  if (!/\.jsx?$/.test(file) || EXCLUDE.test(file)) continue;
  if (!isPublicFacingFile(file)) continue;
  const f = file.replace(/\\/g, "/");
  const text = readFileSync(join(ROOT, file), "utf8");
  if (!INLINE_L_RE.test(text) || !INLINE_L_LANGKEY_RE.test(text)) continue; // 언어키 있는 진짜 미니사전만
  const inlineCount = (text.match(new RegExp(INLINE_L_RE.source, "g")) || []).length;
  if (inlineCount <= (INLINE_L_BASELINE[f] ?? 0)) continue; // 기준선 이하 = 기존 부채(줄면 통과)
  const line = text.split("\n").findIndex((l) => INLINE_L_RE.test(l)) + 1;
  errors.push(`[인라인사전] ${f}:${line} — 공개 화면 문구가 컴포넌트 안 const L={} 미니사전에 박혀 코디 콘텐츠 편집기(/coordinator/content)에서 수정 불가(번역돼도 CMS 우회). 문구를 src/lib/i18n/dictionary.js DICTIONARY 에 키로 넣고 t("키", lang) 로 렌더할 것(그러면 편집기에 자동 등록). 예외는 INLINE_L_ALLOW(현재 1개).`);
}

// ── 7b) styled-jsx 금지 가드 (POSTMORTEMS #113) ──
// 왜: <style jsx>는 App Router에서 SSR·클라이언트 모두 조용히 증발한다(registry 미설정).
//     법률 페이지 모바일 접힘 CSS가 통째로 사라져 본문 전체가 109px씩 잘린 실사고.
//     고치는 법: jsx 속성을 빼고 평범한 <style>{`...`}</style> 로 (그때 :global() 도 제거).
// jsx 가 두 번째 속성이어도(<style global jsx>) 잡게 태그 안 \bjsx\b 로 (독립 리뷰)
const STYLE_JSX_RE = /<style\s[^>]*\bjsx\b/;
for (const file of SCAN_DIRS.flatMap(walk)) {
  if (!/\.[jt]sx$/.test(file) || EXCLUDE.test(file)) continue;
  const text = readFileSync(join(ROOT, file), "utf8");
  if (!STYLE_JSX_RE.test(text)) continue;
  const line = text.split("\n").findIndex((l) => STYLE_JSX_RE.test(l)) + 1;
  const f = file.replace(/\\/g, "/");
  errors.push(`[styled-jsx] ${f}:${line} — <style jsx>는 App Router에서 렌더되지 않아 CSS가 통째로 증발한다(POSTMORTEMS #113 모바일 잘림 실사고). jsx 속성 제거하고 평범한 <style>{\`...\`}</style> 로 바꿀 것(:global() 래퍼도 제거).`);
}

// ── 7c) E2E 스펙 UI 로그인 금지 가드 (POSTMORTEMS #117) ──
// 왜: 테스트마다 UI 로그인 = 스모크 1회당 Supabase 로그인 10회+(retry 3배)가 공유
//     Supabase(프로덕션 겸용)를 포화시켜 PR 폭주 시간대에 auth 무응답·REST 10~25s
//     → 매번 다른 테스트가 떨어지는 간헐 실패. 로그인은 e2e/auth.setup.ts 에서
//     역할당 1회만(세션 저장), 스펙은 loginAs()(쿠키 주입)만 쓴다.
// ⚠️ walk() 금지 — EXCLUDE 가 .spec. 파일을 원래부터 배제해 스캔 대상이 0개가 된다
//    (독립 리뷰 CONFIRMED — 죽은 가드). e2e 는 평평한 폴더라 직접 나열.
for (const file of readdirSync(join(ROOT, "e2e"))
  .filter((f) => /\.spec\.ts$/.test(f)) // auth.setup.ts·fixtures 는 허용
  .map((f) => join("e2e", f))) {
  const text = readFileSync(join(ROOT, file), "utf8");
  if (!/\buiLoginAs\s*\(/.test(text)) continue;
  const line = text.split("\n").findIndex((l) => /\buiLoginAs\s*\(/.test(l)) + 1;
  const f = file.replace(/\\/g, "/");
  errors.push(`[e2e-ui-login] ${f}:${line} — 스펙에서 uiLoginAs(UI 로그인) 직접 호출 금지. 테스트마다 로그인하면 공유 Supabase(프로덕션 겸용) 부하가 배로 늘고, DB 가 느린 시간대에 가장 먼저 무너져 간헐 실패(POSTMORTEMS #117). loginAs()(저장 세션 쿠키 주입)를 쓸 것 — UI 로그인은 e2e/auth.setup.ts 역할당 1회뿐.`);
}

// ── 8) 이메일 템플릿 premium 톤 누수 가드 (DESIGN.md premium_drift, POSTMORTEMS #55) ──
// 왜: 사이트는 legacy(teal+시스템폰트)인데 상담초대·리마인더·설문 이메일이 옛 premium 톤
//     (검정 #0a0a0a + 골드 #c8a96a + 크림 #f5f0e8 + Playfair 세리프)으로 살아있어, 환자가
//     받는 메일만 딴 브랜드처럼 보이던 사고. DESIGN.md forbidden.premium_drift 를 정면으로 어김.
//     UI 코드 검사(위)는 이메일 순수-HTML 문자열을 안 봐서 사각지대였음. → 라이브 이메일 템플릿에
//     premium 토큰이 다시 들어오면 CI 가 차단. 정답 톤 레퍼런스 = infoRequest.ts.
//     범위: src/lib/email/templates/** + surveyEmailTemplate.ts (legacy 전환 완료 파일).
//     ※ 옛 주석이 «src/emails/*.jsx(React Email premium 시스템)는 별도 전환 예정»이라며 제외로 적어
//       뒀었는데 낡은 기록이었다(2026-08-30 정정) — 그 시스템은 2026-07-01 PO 지시로 라우트째 통삭제됐다
//       (PR #539, 4파일 1,028줄). 지금 저장소에 src/emails/ 는 없다. 어딘가 살아있다고 읽지 마라.
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

// ── 8-b) 화면 코드 premium 톤 재유입 가드 (2026-08-27 신설) ──────────────
// 왜: 위 8) 은 «이메일만» 본다. 화면(app/·src/·components/)에 옛 premium 색·글꼴을 그대로 넣어도
//     CI 가 통과하는 것을 2026-08-27 에 시험 파일로 «실제로 확인»했다(check:content·eslint 둘 다 초록).
//     PO 2026-08-26: «왜 아직도 예전에 테스트 했던 톤이 남아있는거야? 뭘 만들라고 하면 자꾸 그걸로 만드네».
//     문서만 고쳐선 안 막힌다 — 사고 이력이 전부 「옛 파일을 복사해 옴」이라 정확한 문자열이 그대로 들어온다:
//     POSTMORTEMS #56(이메일 3종) · #873(설문지 금색 8곳) · app/patient/messages(cream/gold/ink+serif) ·
//     환자 캘린더 ButtonGold(PR #1481). 위 5개 토큰이면 그 사고들이 전부 잡힌다.
//     ※ 동작 확인 방법: 아무 page.jsx 에 color:"#c8a96a" 를 넣으면 빨간불.
//     제외 = Primitives.jsx 자기 자신(철거 대기 중인 원본이라 자기 색을 갖고 있다).
//     문서(DESIGN.md 등)는 애초에 대상이 아니다 — 금지 목록에는 그 색값이 «적혀 있어야» 하기 때문.
// 2026-08-30 범위 확장: 공용 walk() 가 js/jsx/ts/tsx 만 돌려줘서 .css·.html·public/ 이 통째로
//     사각이었다 — public/offline.html 제목의 옛 브랜드 「HEALO」가 정확히 이 사각으로 살아남았던
//     전례가 그 파일 머리 주석에 자인돼 있고, premium 토큰의 «CSS 운반체»(app/styles/healo-tokens.css,
//     8/27 철거)가 되돌아와도 이 검사는 못 봤다. → css·html(스캔 3폴더) + public/ 텍스트 파일까지
//     같이 훑는다. 확장 시점 실측: 전 범위 잔재 0건 = 기준선 변경 없이 초록 유지.
// 🧊 기준선: 2026-08-27 실측으로 «이미 있던» 잔재. 여기 적힌 개수까지는 통과시키고 «늘어나면» 막는다.
//    통째로 빨간불로 만들면 지금 돌아가는 다른 세션의 신청서까지 다 막힌다 — 그건 가드가 아니라 사고다.
//    (XSS_INNERHTML_BASELINE 과 같은 방식.) 고칠 때마다 이 숫자를 내려라. 0 이 되면 그 줄을 지워라.
const UI_PREMIUM_BASELINE = {
  // 2026-08-27 현재 «비어 있다» = 화면 코드에 premium 잔재 0건.
  // 새 잔재를 여기 추가하지 마라 — 이 표는 「고치는 중인 것」의 임시 통행증이지 면제권이 아니다.
};
{
  const UI_PREMIUM_SKIP = /healo[\\/]Primitives\.jsx$/;
  const UI_PREMIUM_IMPORT = /from\s+["'][^"']*healo\/Primitives["']/;
  // 색값 리터럴 말고 «변수 참조»로 되살아나는 경로도 잡는다 (2026-08-30, elated-meninsky 곁가지 회수).
  // 정의처(healo-tokens.css)가 삭제돼 var(--gold-2) 류는 값이 «빈 채로» 조용히 렌더된다 — 그래서 더 위험.
  const UI_PREMIUM_VAR = {
    re: /var\(--(?:cream|gold|ink|paper|fg-on|font-serif)[\w-]*\)/i,
    name: "premium 토큰 변수 참조(정의처 삭제됨 — 값이 비어 렌더된다)",
  };
  // PDF 가드(scripts/check-pdf-tone.mjs)는 src/lib/pdf/ «안에서만» gold/cream 변형 hex 와 Noto Serif 를
  // 막는다 — 같은 값이 «화면» 코드로 들어오면 어느 가드도 못 잡았다(2026-08-30 감사에서 확인).
  // 전부 옛 styles.js 에서 실제로 제거했던 잔재값이라 재유입 경로(옛 파일 복사)가 위 5종과 같다.
  // 추가 시점 실측: 확장 범위 포함 전 범위 0건 = 기준선 영향 없음.
  const UI_EXTRA_PREMIUM_TOKENS = [
    { re: /#b89550|#e8d9b4/i, name: "premium gold 변형 hex(#b89550·#e8d9b4)" },
    { re: /#e3dbcc|#fbf8f2/i, name: "premium cream 변형 hex(#e3dbcc·#fbf8f2)" },
    { re: /Noto\s*Serif/i, name: "Noto Serif 세리프 폰트" },
  ];
  // ⚠️ 2026-08-30 전까지 이 합본은 «선언만» 되고 아래 루프는 5종(EMAIL_PREMIUM_TOKENS)만 돌았다 —
  //    변수 참조 가드가 죽은 코드였던 것. 루프를 이 합본으로 배선해 주석이 주장하던 검출을 실제로 한다.
  const UI_PREMIUM_TOKENS = [...EMAIL_PREMIUM_TOKENS, ...UI_EXTRA_PREMIUM_TOKENS, UI_PREMIUM_VAR];
  // public/offline.html 은 우리 CSS 를 안 쓰는 독립 파일이고 :root 에 «자기» 변수를 정의해 쓴다
  // (--ink:#1f2937 = gray-800 — 이름만 premium 과 우연히 겹치고 값은 기본 톤). 변수 참조 토큰만 면제하고
  // hex·serif 토큰은 그대로 검사한다 — 그 파일의 HEALO 잔재 전례가 있어 «통째 면제»는 금지.
  const UI_PREMIUM_VAR_EXEMPT = /^public\/offline\.html$/;
  // 확장 걸음마: 공용 walk()/CODE_EXT 는 안 건드린다(다른 규칙들이 그 값에 기대고 있다 — §1c walkCss 와
  // 같은 이유). css·html 은 스캔 3폴더에서, public/ 은 텍스트 파일만(사진·아이콘 등 바이너리 제외) 훑는다.
  const walkExt = (dir, extRe) => {
    const out = [];
    let entries;
    try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
    for (const e of entries) {
      const rel = join(dir, e);
      if (EXCLUDE.test("/" + rel.replace(/\\/g, "/") + "/")) continue;
      let st;
      try { st = statSync(join(ROOT, rel)); } catch { continue; }
      if (st.isDirectory()) out.push(...walkExt(rel, extRe));
      else if (extRe.test(e)) out.push(rel);
    }
    return out;
  };
  const PUBLIC_TEXT_EXT = /\.(html?|css|js|mjs|json|svg|txt|md|csv|webmanifest)$/i;
  const UI_PREMIUM_FILES = [
    ...walk("app"), ...walk("src"), ...walk("components"),
    ...["app", "src", "components"].flatMap((d) => walkExt(d, /\.(css|html?)$/i)),
    ...walkExt("public", PUBLIC_TEXT_EXT),
  ];
  for (const file of UI_PREMIUM_FILES) {
    if (UI_PREMIUM_SKIP.test(file)) continue;
    let lines;
    try { lines = readFileSync(join(ROOT, file), "utf8").split("\n"); } catch { continue; }
    const rel = file.replace(/\\/g, "/");
    const hits = [];
    lines.forEach((line, i) => {
      for (const t of UI_PREMIUM_TOKENS) {
        if (t === UI_PREMIUM_VAR && UI_PREMIUM_VAR_EXEMPT.test(rel)) continue;
        if (t.re.test(line)) hits.push({ i, name: t.name, line });
      }
      if (UI_PREMIUM_IMPORT.test(line)) {
        errors.push(`[화면premium] ${rel}:${i + 1} — 폐기된 premium 부품(components/healo/Primitives.jsx — ButtonGold·Eyebrow 등)을 새로 가져다 쓴다. 2026-08-27 기준 사용처 0곳이라 곧 삭제될 파일이다(DESIGN.md §8 pending_removal). 기본 톤 부품으로 대체할 것.\n    ${line.trim().slice(0, 120)}`);
      }
    });
    const allowed = UI_PREMIUM_BASELINE[rel] ?? 0;
    if (hits.length > allowed) {
      for (const h of hits.slice(allowed)) {
        errors.push(`[화면premium] ${rel}:${h.i + 1} — 폐기된 premium 톤(${h.name})이 화면 코드에 들어왔다(이 파일 ${hits.length}건 / 기준선 ${allowed}건). 우리 디자인은 기본 톤(teal) «하나»뿐이고 premium 은 2026-06 에 완전히 폐기됐다(DESIGN.md §3·§8). 되살리지 말고 teal 기본 톤으로 만들 것.\n    ${h.line.trim().slice(0, 120)}`);
      }
    }
  }
}

// ── 9) 글로벌 t() 미정의 키 가드 (2026-07-02 전수 감사) ──
// 왜: t()는 미정의 키에 키 원문("chat.back")을 그대로 반환(truthy) → `t(...) || "폴백"` 의
//     폴백이 절대 실행되지 않는 착시가 코드에 깔림. 미정의 키를 쓰는 컴포넌트가 노출되는 순간
//     사용자 화면에 키 원문이 그대로 보임. 기존 패리티 검사는 '사전 안 언어 간 누락'만 봐서
//     '코드가 쓰는 키가 사전에 아예 없음'은 사각지대였음.
// 방법: 사전 소스에서 따옴표 dotted 키 전수 추출 → 글로벌 t 를 import 하는 파일의
//     t("a.b") 리터럴 호출이 전부 사전에 존재하는지 대조. 동적 키(t(변수))는 검사 밖(의도).
{
  const dictSrc = readFileSync(join(ROOT, "src/lib/i18n/dictionary.js"), "utf8");
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
              `사전(src/lib/i18n/dictionary.js) 6개 언어에 키를 추가하거나 호출을 제거할 것.`
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

// ── 11) PDF 렌더 React 정합 가드 (POSTMORTEMS #132) ────────────────────────────
// 왜: Next(App Router)는 앱 코드를 내장(vendored) React 19 로 컴파일한다. 설치 react 가
//     18 이거나 @react-pdf/renderer 가 웹팩 서버 번들에 말려 들어가면, PDF 렌더 트리에
//     서로 다른 React 의 요소가 섞여 renderToBuffer 가 React error #31 로 즉사 →
//     발급 PDF API 전부 500. 빌드·lint·dev(Turbopack)·E2E(dev서버) 전부 통과하는
//     "배포 전용" 사고라 기계 가드 없이는 재발을 못 막는다.
try {
  const nextCfg = readFileSync(join(ROOT, "next.config.js"), "utf8");
  const extBlock = nextCfg.match(/serverExternalPackages\s*:\s*\[[\s\S]*?\]/);
  if (!extBlock || !extBlock[0].includes("@react-pdf/renderer")) {
    errors.push(`[PDF React정합] next.config.js serverExternalPackages 에 "@react-pdf/renderer" 없음 — 웹팩이 react-pdf 를 번들하면 내장 React 와 인스턴스가 갈려 발급 PDF 가 전부 500 (React #31, POSTMORTEMS #132).`);
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const reactMajor = parseInt(String(pkg.dependencies?.react || "0").replace(/^[^\d]*/, ""), 10);
  if (reactMajor < 19) {
    errors.push(`[PDF React정합] package.json react "${pkg.dependencies?.react}" — Next 16(내장 React 19)과 요소 규격이 갈려 외부화된 react-pdf 렌더가 React #31 로 죽음. react/react-dom ^19 유지할 것 (POSTMORTEMS #132).`);
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
    // 2026-07-24 이관(#974): 의료진 문구가 HomeClient 의 DOCTORS_DATA → HOME_CONTENT.doctors.items 로 이동
    // (편집기에서 수정 가능해짐). 사진 경로만 HomeClient 의 DOCTORS_META 에 남음.
    const home = readFileSync(join(ROOT, "src/lib/content/homeContent.js"), "utf8");
    const live = readFileSync(join(ROOT, "src/lib/data/immuneHospitalInfo.js"), "utf8");
    const block = home.split("doctors:")[1]?.split("items:")[1]?.split("],")[0] || "";
    const names = [...block.matchAll(/name: \{ ko: "([가-힣]{2,5})[ "]/g)].map((m) => m[1]);
    if (!names.length) {
      errors.push(`[의료진드리프트] src/lib/content/homeContent.js 의 doctors.items 에서 이름을 못 읽음 — 구조를 바꿨으면 이 검사(§13)도 같이 갱신할 것 (POSTMORTEMS #66)`);
    }
    for (const n of names) {
      if (!live.includes(`"${n}"`)) {
        errors.push(`[의료진드리프트] 홈 doctors.items 의 "${n}" 이 라이브 소스(src/lib/data/immuneHospitalInfo.js doctors[])에 없음 — 퇴사·개명 가능성. 병원 공식 사이트(각 지점 doctor.php) 대조 후 두 파일을 같이 갱신할 것 (POSTMORTEMS #66)`);
      }
    }
  } catch (e) {
    errors.push(`[의료진드리프트] 검사 실패: ${e.message}`);
  }
  // /hospitals 목록이 쓰는 명단(단일 원본, 작은따옴표 표기)도 같은 부류 — 동일 검사.
  // 2026-08-18: 명단이 HospitalsClient.jsx 안에 있던 것을 src/lib/data/immuneDoctors.js 로 옮겼다.
  const ROSTER_SRC = "src/lib/data/immuneDoctors.js";
  try {
    const listPage = readFileSync(join(ROOT, ROSTER_SRC), "utf8");
    const live = readFileSync(join(ROOT, "src/lib/data/immuneHospitalInfo.js"), "utf8");
    const block = listPage.split("export const IMMUNE_DOCTOR_ROSTER = [")[1]?.split("IMMUNE_BRANCH_META")[0] || "";
    const names = [...block.matchAll(/name: \{ ko: '([가-힣]{2,5})'/g)].map((m) => m[1]);
    if (!names.length) {
      errors.push(`[의료진드리프트] ${ROSTER_SRC} 의 IMMUNE_DOCTOR_ROSTER 에서 이름을 못 읽음 — 구조를 바꿨으면 이 검사(§13)도 같이 갱신할 것 (POSTMORTEMS #66)`);
    }
    for (const n of names) {
      if (!live.includes(`"${n}"`)) {
        errors.push(`[의료진드리프트] 의료진 명단의 "${n}" 이 라이브 소스(immuneHospitalInfo.js)에 없음 — 퇴사·개명 가능성. 공식 사이트 대조 후 갱신할 것 (POSTMORTEMS #66)`);
      }
    }
    // 거꾸로도 본다: 라이브 소스에만 있고 명단에 없는 사람(= 새로 온 원장을 한쪽만 넣은 것).
    // 2026-08-18 실측: 이 방향이 없어서 송시은 원장이 사본 3곳에서 빠진 채 통과했다.
    const liveFrom = live.indexOf("\n  doctors: [");
    const liveTo = live.indexOf("\n  teamStructure:");
    const liveDoctorBlock = liveFrom >= 0 && liveTo > liveFrom ? live.slice(liveFrom, liveTo) : "";
    const liveNames = [...liveDoctorBlock.matchAll(/name: \{ ko: "([가-힣]{2,5})"/g)].map((m) => m[1]);
    if (!liveNames.length) {
      // 표시가 밀리면 자를 구간을 못 찾고 «이름 0명»이 된다 — 그걸 통과로 읽으면
      // 이 검사가 잡으려던 바로 그 실패(한쪽에만 들어간 원장)를 조용히 놓친다.
      errors.push(`[의료진드리프트] immuneHospitalInfo.js 의 doctors[] 구간에서 이름을 못 읽음 — 구조를 바꿨으면 이 검사(§13)도 같이 갱신할 것 (POSTMORTEMS #66)`);
    }
    for (const n of new Set(liveNames)) {
      if (!names.includes(n)) {
        errors.push(`[의료진드리프트] immuneHospitalInfo.js 의 "${n}" 이 ${ROSTER_SRC} 명단에 없음 — 한쪽만 갱신한 것 (POSTMORTEMS #66)`);
      }
    }
  } catch (e) {
    errors.push(`[의료진드리프트] 의료진 명단 검사 실패: ${e.message}`);
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

// ── 15) raw h1/h2/h3 에 글자크기 클래스 누락 ─────────────────────────────────
// 왜(2026-07-08): 그때는 app/styles/healo-tokens.css 가 전역 태그 선택자로 h1~h3 를 크게
//     정의하고 있어서(h2 = clamp(36px,4.5vw,64px)), 백오피스에서 크기 유틸리티 없이 raw
//     헤딩을 쓰면 «마케팅 히어로 크기가 새어 들어왔다»
//     (코디 "AI 상담 리드" — "검토 대기 22건"이 히어로 크기로 렌더, PO 리포트).
//
// ⚠️ 2026-08-27 그 파일을 폐기하면서 «위험이 뒤집혔다». 이제 전역 크기가 없으므로
//     preflight 의 font-size:inherit 이 드러나, 크기 유틸리티 없는 제목은 반대로
//     «본문 크기(15px)로 주저앉는다». 실측: /ru/for-russian-patients 의 H3 가 32px → 15px.
//     크든 작든 «명시하지 않으면 깨진다»는 규칙 자체는 그대로 옳다.
//
// ⚠️ 그리고 이 검사는 그때 백오피스 5개 폴더만 봤기 때문에 «공개 화면·환자 포털이 사각지대»였고,
//     위 회귀 15곳을 하나도 못 잡았다. → 2026-08-27 범위를 app/·src/·components/ 전체로 넓혔다.
//     (className 이 «아예 없는» raw <h2> 는 안 본다 — 인쇄용 팝업처럼 자체 <style> 을 쓰는
//      생성 HTML 이 걸리기 때문이다. 아래 정규식이 className 을 요구한다.)
// ※ BACKOFFICE_DIRS 는 아래 15-b) 저대비회색 검사도 쓰므로 그대로 둔다.
const BACKOFFICE_DIRS = ["app/coordinator", "app/admin", "app/agency", "app/hospital", "app/clinic"];
const HEADING_SCAN_DIRS = ["app", "src", "components"];
const HEADING_RE = /<h[123]\s+className="([^"]*)"/g;
const HEADING_SIZE_RE = /text-(xs|sm|base|lg|\d?xl|\[)/;
for (const dir of HEADING_SCAN_DIRS) {
  for (const file of walk(dir)) {
    if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
    const text = readFileSync(join(ROOT, file), "utf8");
    let m;
    while ((m = HEADING_RE.exec(text)) !== null) {
      if (!HEADING_SIZE_RE.test(m[1])) {
        errors.push(`[헤딩크기누락] ${file.replace(/\\/g, "/")} — raw <h1/h2/h3 className="${m[1]}">에 text-size 유틸 없음 → 전역 h1~h3 크기가 없어진 뒤(2026-08-27 healo-tokens.css 폐기)라 이 제목은 «본문 크기 15px 로 주저앉는다». text-base/text-lg/text-xl 등을 명시할 것 (2026-07-08 부류 · 2026-08-27 실측 회귀 15곳).`);
      }
    }
  }
}

// ── 15-b) 백오피스 저대비 회색 글씨 차단 (2026-07-27 접근성 실측) ──────────────
// 왜: text-gray-400(#9ca3af)은 흰 배경에서 대비 2.53:1 — WCAG AA 본문 기준(4.5:1)의 절반뿐.
//     공개 페이지에선 아이콘 위주라 안 걸렸는데, 로그인 뒤 화면을 처음 실측하자
//     백오피스에서만 serious 412건이 나왔고 그 대부분이 이 한 토큰이었다(admin 244·coordinator 149).
//     "공개 페이지 위반 0건"이라는 리포트가 5주간 이 사실을 가리고 있었음(스캐너가 로그인 뒤를 못 봄).
//     → 부류 자체를 차단: 백오피스 본문 회색은 gray-500(4.83:1) 이상.
//     ⚠️ 흰/연회색 배경 전제다. 어두운 배경 위에서 밝은 회색이 필요하면 예외를 여기에 명시적으로 추가할 것.
// ⚠️ 백오피스 폴더만 훑으면 놓친다 — /admin/staff 의 위반은 정작 공유 부품(NotificationBell 등)에서
//    나왔다. 그래서 백오피스 화면이 실제로 렌더하는 공유 부품도 같은 잣대로 본다.
//    (새 공유 부품이 늘면 이 목록에 추가할 것. 목록이 새더라도 주간 axe 실측이 뒤에서 받쳐 준다.)
const BACKOFFICE_SHARED = [
  "app/_components/ManualDrawer.jsx",
  "src/components/AddressInput.jsx",
  "src/components/GoogleMap.jsx",
  "src/components/Modals.jsx",
  "src/components/NotificationBell.jsx",
  "src/components/consultation/CreateConsultationModal.jsx",
  "src/components/marketing/AdBudgetPlanner.jsx",
  "src/components/partners/PartnerOutreachTracker.jsx",
];
{
  const targets = [];
  // app/patient 도 포함(2026-07-27 2차 실측): 환자가 직접 보는 화면이라 우선순위가 오히려 높다.
  for (const dir of [...BACKOFFICE_DIRS, "app/patient"]) {
    for (const file of walk(dir)) {
      if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
      targets.push(file);
    }
  }
  targets.push(...BACKOFFICE_SHARED);
  for (const file of targets) {
    let text;
    try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    const idx = text.indexOf("text-gray-400");
    if (idx === -1) continue;
    const line = text.slice(0, idx).split("\n").length;
    errors.push(
      `[저대비회색] ${file.replace(/\\/g, "/")}:${line} — 백오피스(또는 백오피스가 쓰는 공유 부품)에 text-gray-400 사용. 흰 배경 대비 2.53:1 로 WCAG AA(4.5:1) 미달이다. text-gray-500(4.83:1) 이상을 쓸 것 (2026-07-27 접근성 실측 부류).`,
    );
  }
}

// ── 15-c) 주색을 teal-600 으로 쓰는 «새» 파일 차단 (2026-07-31 감사) ─────────────
// 왜: DESIGN.md 가 primary 를 teal-600 이라고 적어놨는데, teal-600(#0d9488)은
//     흰 배경 위 글씨도 3.74:1, 흰 글씨를 얹은 배경도 3.74:1 — «양쪽 다» WCAG AA(4.5:1) 미달이다.
//     즉 문서 자신이 자기 대비 규칙을 위반하고 있었다. 실제 코드는 이미 teal-700 을 쓰고 있었고
//     (배경 306회 vs 24회 = 12.75배 / 글씨 625회 vs 54회 = 11.6배) 문서만 뒤처져 있었다.
//     문서만 고치면 또 샌다 — CLAUDE.md 「기계로 잴 수 있으면 자동검사로 박아라」에 따라 여기에 박는다.
// 범위: bg-teal-600 · text-teal-600 만. border-teal-600 은 UI 요소 기준 3:1 을 넘으므로(3.74) 통과.
//
// ⚠️ 2026-07-31 자기정정 — 이 가드의 «권하는 답»이 어두운 화면에선 정반대가 된다.
//    화상상담 방(app/consultation)은 bg-gray-800/900 인데, 거기서는
//      teal-700 = 2.68~3.24 (⛔ 미달)  ·  teal-500 = 5.90~7.13 ✅  ·  teal-400 = 7.89~9.53 ✅
//    즉 «무조건 teal-700» 은 밝은 화면에서만 옳다. 그래서 안내 문구를 두 갈래로 나눈다.
//    다만 «버튼 채움색»은 페이지 배경과 무관하다 — 흰 글씨 vs 채움색의 대비라서
//    흰 글씨 버튼은 어두운 화면에서도 teal-700(5.47) 이 정답이다.
//    (DESIGN.md 4-b 가 «흰/연회색 배경 전제다. 어두운 배경은 예외를 명시하라»고 미리 경고해 둔 그 지점.)
const DARK_SURFACE_DIRS = ["app/consultation/"];
// 🧊 기존 31개 파일은 «기준선으로 동결»한다 — DESIGN.md change_authority 가 「기존 페이지 디자인
//     자동 변경 금지」라서 일괄 수정은 PO 지시가 있어야 한다. 이 가드는 «새로 늘어나는 것»만 막는다.
//     ⚠️ 2026-08-03 자기감사에서 «구멍»을 찾아 고쳤다 — 예전엔 «파일 단위 면제»(Set)라서
//        동결된 파일 안에 teal-600 을 «새로» 추가해도 안 잡혔다(시험으로 확인).
//        「새로 늘어나는 것만 막는다」는 원래 의도가 실제로는 안 되고 있었던 것.
//        → «개수 동결»로 바꿨다: 파일별 현재 개수보다 «늘면» 잡고, 줄면(고치는 중) 통과.
//        그 파일을 다 고쳤으면 이 표에서 해당 줄을 지워라(0이 되면 다시 늘 때 잡힌다).
const TEAL600_BASELINE = {
  "app/_components/ManualDrawer.jsx": 2,
  "app/account-deletion/AccountDeletionClient.jsx": 1,
  "app/admin/chat/page.jsx": 3,
  "app/admin/khidi/agent-analysis/page.jsx": 1,
  "app/agency/PartnerPortal.jsx": 4,
  "app/auth/confirm/ConfirmClient.jsx": 1,
  "app/care-journey/CareJourneyClient.jsx": 1,
  "app/coordinator/chat/page.jsx": 3,
  "app/coordinator/inbox/[id]/CoordinatorInboxDetailClient.jsx": 4,
  "app/coordinator/inbox/[id]/OpinionsSection.jsx": 2,
  "app/home/HomeClient.jsx": 1,
  "app/hospital/page.jsx": 1,
  "app/hospitals/HospitalsClient.jsx": 1,
  "app/inquiry/ThreadChat.jsx": 4,
  "app/inquiry/_components/UnifiedInquiryFunnel.jsx": 11,
  "app/insurance/InsuranceClient.jsx": 2,
  "app/opinion/[token]/OpinionClient.jsx": 2,
  "app/partners/PartnersClient.jsx": 1,
  "app/patient/education/EducationClient.jsx": 1,
  "app/treatments/TreatmentsClient.jsx": 1,
  "src/components/NotificationBell.jsx": 1,
};
{
  const TEAL600_RE = /\b(?:bg|text)-teal-600\b/g;
  // 어두운 화면은 처방이 뒤집힌다(아래 DARK_SURFACE_DIRS 주석 참조). 디렉터리 목록으로 못 거르는
  // 파일이라도 «어두운 배경 클래스»가 섞여 있으면 그 사실을 안내에 덧붙인다 — 틀린 처방을 그대로
  // 따라가는 것보다 «확인하라»가 낫다.
  const DARK_BG_RE = /\bbg-(?:gray|slate|zinc|neutral)-(?:800|900|950)\b|\bbg-black\b/;
  const seenBaseline = new Set();
  for (const dir of ["app", "src"]) {
    for (const file of walk(dir)) {
      if (!CODE_EXT.test(file) || EXCLUDE.test(file)) continue;
      const rel = file.replace(/\\/g, "/");
      let text;
      try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
      const hits = text.match(TEAL600_RE) || [];
      const allowed = TEAL600_BASELINE[rel] ?? 0;
      if (allowed > 0) seenBaseline.add(rel);
      // ⚠️ 0건이라고 여기서 빠져나가면 «장부에 있는데 0건이 된 파일»(= 다 고침)을 못 잡는다.
      //    2026-08-03 최초 구현이 그 실수를 했다 — 「줄었으면 알린다」를 넣어놓고 정작 0건에선 안 돌았다.
      if (hits.length === 0 && allowed === 0) continue;
      if (hits.length < allowed) {
        // e2e §33-b 와 같은 방식 — 부채 장부가 «거짓»이 되지 않게 줄어든 것도 잡는다.
        // (이 파일의 관례: 줄어든 것도 errors 로 올려 장부 갱신을 강제한다.)
        errors.push(
          `[주색미달] ${rel} — 기준선 ${allowed}건 → ${hits.length}건으로 줄었다(좋다). ` +
            `TEAL600_BASELINE 숫자를 ${hits.length}${hits.length === 0 ? " (= 줄 삭제)" : ""} 로 내려라 — 장부가 실제와 어긋나면 다음 사람이 늘어난 걸 못 잡는다.`
        );
        continue;
      }
      if (hits.length === allowed) continue; // 기준선 그대로 = 기존 것

      const m = new RegExp(TEAL600_RE.source).exec(text);
      const line = text.slice(0, m.index).split("\n").length;
      const isDarkDir = DARK_SURFACE_DIRS.some((d) => rel.startsWith(d));
      const hasDarkBg = DARK_BG_RE.test(text);
      const 처방 = m[0].startsWith("bg-")
        ? `버튼·면 «채움색»은 페이지 배경과 무관하다(흰 글씨 vs 채움색 대비) → bg-teal-700(흰 글씨 5.47:1), 호버 bg-teal-800(7.58:1).`
        : isDarkDir
          ? `⚠️ 여기는 «어두운 화면»(bg-gray-800/900)이라 teal-700 은 오히려 2.68~3.24 로 더 미달이다. ` +
            `글씨·아이콘 색은 teal-400(7.89~9.53) 또는 teal-500(5.90~7.13) 을 쓸 것.`
          : hasDarkBg
            ? `글씨는 text-teal-700(5.47:1). ⚠️ 단 이 파일엔 «어두운 배경»이 섞여 있다 — ` +
              `그 위에 얹는 글씨라면 teal-700 은 오히려 미달이니 teal-400/500 인지 확인하라.`
            : `글씨는 text-teal-700(5.47:1) 을 쓸 것.`;
      errors.push(
        `[주색미달] ${rel}:${line} — ${m[0]} 사용 (이 파일 ${hits.length}건 / 기준선 ${allowed}건 → ${hits.length - allowed}건 늘었다). ` +
          `teal-600 은 흰 배경 글씨도, 흰 글씨를 얹은 배경도 3.74:1 로 WCAG AA(4.5:1) 미달이다. ${처방} ` +
          `(DESIGN.md colors.primary · 실물 시안 docs/design/기본톤_시안.html)`,
      );
    }
  }
  // 장부에 있는데 «스캔에서 안 보인» 파일 = 이름 변경·삭제. 죽은 항목은 장부를 헐겁게 만든다(e2e §33-b 와 같은 처리).
  for (const rel of Object.keys(TEAL600_BASELINE)) {
    if (!seenBaseline.has(rel)) {
      errors.push(
        `[주색미달] TEAL600_BASELINE 의 ${rel} 가 스캔에서 안 보인다(이름 변경·삭제). 장부에서 지울 것 — 죽은 항목은 가드를 헐겁게 만든다.`
      );
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
    // ⚠️ 따옴표/백틱을 앞에 요구한다 — 안 그러면 **주석 안에 적힌 「script-src」라는 낱말**을
    //    진짜 설정으로 착각한다. 2026-08-03 실측: CSP 위에 설명 주석을 달았더니 이 검사가
    //    주석 문장을 읽고 「maps.googleapis.com 없음」이라는 거짓 빨간불을 냈다.
    //    바로 아래 connect-src 는 원래부터 이렇게 돼 있었다 — 같은 모양으로 맞춘다.
    const scriptSrc = cfg.match(/["'`]script-src[^,]*/)?.[0] || "";
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
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[^\S\r\n]*\/\/.*/gm, "");
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
  // 유예 목록은 비었다 — 마지막 유예분 app/api/portal/emergency/route.ts 는
  // 고아 코드라 삭제됐다(PO 결정 2026-07-21, 처리 2026-07-23). 목록은 늘리지 마라.
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
      const line = text.slice(0, m.index).split("\n").length;
      errors.push(
        `[멱등가드] ${norm}:${line} — 존재검사에 .maybeSingle() 을 쓰면서 error 를 안 받는다. ` +
        `행이 2개가 되는 순간 에러가 "없음"으로 둔갑해 무한 재생성이 된다. .limit(1) + error 명시 검사로 바꿀 것 (POSTMORTEMS #105).`
      );
    }
  }
}

// ── 24) 응급 전화번호: 구조화 SoR(tel: 링크) ↔ 고지 프로즈 대조 ──────────────────
// 왜: 응급번호가 두 곳에 산다 — EMERGENCY_NUMBERS(화면에서 누르는 tel: 링크)와 각 언어
//     full[] 의 법적 고지 문구(글). 프로즈는 문구 버전 관리 대상이라 자동 생성하지 않고
//     그대로 두기로 했고, 그 대가로 "한쪽만 고치는" 드리프트가 가능해졌다.
//     이 부류가 어긋나면 결과가 응급 상황의 오연결이라 사람 검토에 맡기지 않는다.
// ⚠️ 초안은 "번호가 그 언어 블록에 존재하나"로 봤다가 실측에서 깨졌다: 한국 119 를 118 로
//     바꿔도 통과했다 — 같은 블록의 **일본이 119** 라 존재검사가 만족돼서. 한국·일본(119),
//     카자흐·러시아(103·112) 가 번호를 공유하니 5개국 중 4개가 이 구멍에 들어간다.
//     = 가장 흔한 드리프트(한 국가 번호만 수정)를 정확히 못 잡는 검사였음.
//     → **국가별로** 본다: 그 언어의 국가 표기가 있는 줄을 찾아, 그 줄의 번호와 대조.
//       (국가 표기는 EMERGENCY_NUMBERS 가 프로즈에서 그대로 옮겨온 값)
// ⚠️⚠️ 2차 초안도 독립 리뷰의 변이 테스트에서 깨졌다 — **검사 방향이 한쪽뿐**이었다.
//     `c.tel` 을 돌며 "이 번호가 프로즈에 있나"만 봐서, **구조 데이터(=환자가 누르는 버튼)가
//     줄어드는 쪽**은 통째로 사각이었다. 통과해버린 변이 3종(전부 실측):
//       ①KZ tel 에서 "112" 삭제 → 통과(112 버튼이 사라지는데 프로즈엔 112 가 남아 있으니).
//       ②CN tel 을 ["120","120"] 오타 → 통과(110 버튼 소멸).
//       ③JP 항목 통째 삭제 → 통과(루프가 JP 를 아예 안 돎).
//     즉 "프로즈를 지키는" 검사였고, 정작 **지켜야 할 건 tel: 링크 쪽**이었다(취지의 정반대).
//     또 `line.includes("103")` 은 부분일치라 프로즈를 **1030** 으로 늘려도 통과했다.
//     → ⓐ줄의 숫자를 다 뽑아 **집합 비교**(부분일치·누락·추가·중복 동시 차단)
//       ⓑ프로즈의 국가 줄 개수 == 구조 항목 개수(**국가 통째 삭제** 차단)로 **양방향** 확인.
{
  try {
    const mod = await import(
      pathToFileURL(join(ROOT, "src/lib/legal/medicalDisclaimer.js")).href
    );
    const { EMERGENCY_NUMBERS, getMedicalDisclaimer } = mod;
    if (!Array.isArray(EMERGENCY_NUMBERS) || !EMERGENCY_NUMBERS.length) {
      errors.push(`[응급번호] EMERGENCY_NUMBERS 를 못 읽음 — 구조를 바꿨으면 이 검사(§24)도 같이 갱신할 것`);
    }
    for (const lang of ["ko", "en", "ru", "kz", "zh", "ja"]) {
      const lines = getMedicalDisclaimer(lang).full;
      // ⓑ 역방향: 프로즈의 국가 줄("· "로 시작) 개수와 구조 항목 개수가 같아야 한다.
      //    한쪽에서 국가가 통째로 사라지는 드리프트는 국가별 루프로는 절대 안 잡힌다.
      const bullets = lines.filter((l) => l.trimStart().startsWith("·"));
      if (bullets.length !== EMERGENCY_NUMBERS.length) {
        errors.push(`[응급번호] ${lang} 고지 문구의 국가 줄 ${bullets.length}개 ≠ EMERGENCY_NUMBERS ${EMERGENCY_NUMBERS.length}개 — 한쪽에서 국가가 통째로 빠졌다(환자가 누르는 tel: 링크 목록과 고지문이 불일치). 두 곳을 같이 고칠 것`);
      }
      for (const c of EMERGENCY_NUMBERS) {
        const label = c.label[lang];
        const line = lines.find((l) => l.includes(label));
        if (!line) {
          errors.push(`[응급번호] ${lang} 고지 문구에 "${label}"(${c.code}) 줄이 없음 — EMERGENCY_NUMBERS 에는 있는데 고지문에 빠졌다. 두 곳을 같이 고칠 것`);
          continue;
        }
        // ⓐ 집합 비교. includes 부분일치(103 ⊂ 1030)·중복 오타·양쪽 누락을 한 번에 잡는다.
        const inProse = [...line.matchAll(/\d+/g)].map((m) => m[0]).sort().join(",");
        const inCode = [...c.tel].sort().join(",");
        if (inProse !== inCode) {
          errors.push(`[응급번호] ${lang} "${label}" 줄의 번호가 EMERGENCY_NUMBERS 와 다름 — 고지문 [${inProse}] vs tel:링크 [${inCode}] (문구: "${line}"). 환자가 누르는 번호와 고지문이 어긋나면 응급 상황에서 잘못된 번호로 건다. 두 곳을 같이 고칠 것`);
        }
      }
    }
  } catch (e) {
    errors.push(`[응급번호] 검사 실패: ${e.message}`);
  }
}

// ── §26 언어 prefix 처럼 생긴 app/ 폴더는 전부 LEGACY_LANDINGS 에 등재 (POSTMORTEMS #107) ──
// 왜: 공개 주소는 프록시가 /{locale}/{경로} → /{경로} 로 rewrite 하므로 **폴더가 없어도** 6개 언어가
//     다 존재한다. 반대로 app/ru, app/kk 처럼 언어 코드 모양의 **실제 폴더**는 그 언어에만 있는
//     번역판 없는 페이지 → 언어 스위처가 /{다른언어}/{같은경로} 로 보내면 404 가 난다(2026-07-22 실측).
//     LEGACY_LANDINGS 에 등재된 경로만 스위처가 "그 언어 홈으로" 예외 처리한다.
//     → 등재 안 된 언어 모양 폴더가 새로 생기면 같은 404 함정이 재생산되므로 여기서 막는다.
// 한계: app/ 최상위 1단계만 본다. app/foo/ru/x 는 URL 이 /foo/ru/x 라 이 함정이 아니지만,
//     **route group 은 예외다** — app/(marketing)/ru/x 는 URL 이 /ru/x 로 같은 함정인데 이 스캔은
//     괄호 폴더를 안 들여다봐서 못 잡는다(현재 app/ 최상위에 괄호 폴더 0개라 실害 없음).
//     최상위에 route group 을 도입하면 이 검사도 그 안을 훑도록 같이 고칠 것.
{
  try {
    const { LOCALES, LEGACY_LANDINGS } = await import(
      pathToFileURL(join(ROOT, "src/lib/i18n/config.js")).href
    );
    // 내부 코드(kz)와 URL 표준코드(kk)가 다르다 — 둘 다 폴더 이름으로 나타날 수 있다(POSTMORTEMS #28).
    const LOCALE_LIKE = new Set([...LOCALES, "kk"]);
    for (const seg of readdirSync(join(ROOT, "app"))) {
      if (!LOCALE_LIKE.has(seg)) continue;
      if (!statSync(join(ROOT, "app", seg)).isDirectory()) continue;
      for (const child of readdirSync(join(ROOT, "app", seg))) {
        // 폴더만 라우트다. layout.jsx·not-found.jsx·opengraph-image.js 같은 Next 표준 파일을
        // 라우트로 세면 "/ru/layout.jsx 를 LEGACY_LANDINGS 에 추가하라"는 헛소리로 CI 가 깨진다.
        if (!statSync(join(ROOT, "app", seg, child)).isDirectory()) continue;
        const route = `/${seg}/${child}`;
        if (LEGACY_LANDINGS.includes(route)) continue;
        errors.push(
          `[언어폴더] app${route} 는 언어 prefix(/${seg}/…) 와 생김새가 같은 실제 폴더인데 ` +
            `src/lib/i18n/config.js 의 LEGACY_LANDINGS 에 없음 — 이대로면 이 화면에서 언어를 바꿀 때 ` +
            `/{다른언어}${route.slice(seg.length + 1)} 라는 없는 주소로 가서 404 가 난다(POSTMORTEMS #107). ` +
            `LEGACY_LANDINGS 에 "${route}" 를 추가하거나(=언어 홈으로 보냄), 이 페이지를 일반 공개 경로로 옮길 것`
        );
      }
    }
  } catch (e) {
    errors.push(`[언어폴더] 검사 실패: ${e.message}`);
  }
}

// ── §25 사용자에게 보내는 링크에 VERCEL_URL 폴백 금지 (2026-07-22 실사고) ──────────
// 왜: `NEXT_PUBLIC_SITE_URL || (VERCEL_URL ? ... )` 패턴은 프로덕션에 그 env 가 없으면
//     **배포별 임시 주소**(healo-khidi-xxxxx-bonrois-projects.vercel.app)로 조용히 떨어진다.
//     실제로 만족도 설문 메일과 화상상담 리마인더가 그 주소로 나갔다 — 러시아·카자흐 환자가
//     의료 메일에서 낯선 .vercel.app 링크를 받으면 피싱으로 보고 안 누른다. 리마인더는
//     그 링크가 곧 진료 입장 경로다. 기준 주소는 src/lib/siteUrl.ts 의 siteUrl() 하나로 쓴다.
// ⚠️ 서버가 자기 자신을 fetch 하는 자리는 대상이 아니다(프리뷰에선 프리뷰 자신을 불러야 함).
//     그래서 "메일 템플릿·초대링크를 만드는 파일"만 본다 — 일괄 금지는 오히려 프리뷰를 깬다.
{
  // 대상 판정은 **파일명이 아니라 내용**으로 한다 — 파일명에 "survey" 가 들어간다고
  // 메일을 보내는 건 아니다(app/survey/[token]/page.jsx 는 서버가 자기 API 를 부르는
  // 자리라 VERCEL_URL 이 오히려 맞다). "실제로 메일을 보내는 파일"만 본다.
  const SENDS_EMAIL = /sendEmail|@\/lib\/email\//;
  // 사용자에게 나가는 링크의 기준 주소를 "배포별·요청별 주소"에서 끌어오면 조용히 .vercel.app 로
  // 샌다 — 기준 주소는 siteUrl() 하나만 쓴다. 두 누출원 다 금지:
  //   ①VERCEL_URL = 배포별 임시주소   ②request origin = 스태프가 admin 을 연 주소
  // ⚠️ 대상 아님(오탐): `NEXT_PUBLIC_SITE_URL || "https://healwith.co.kr"` 처럼 **canonical 로
  //    안전하게 떨어지는** env 폴백. 스태프 알림(adminNotifier·alertService)이 의도적 override
  //    노브로 이 형태를 쓴다 — 배포/요청 주소로 새지 않으니 위험이 아니다.
  const BASE_URL_LEAKS = [
    { re: /process\.env\.VERCEL_URL/, what: "VERCEL_URL(배포별 임시주소)" },
    { re: /nextUrl\.origin|headers\.get\((['"])origin\1\)/, what: "request origin(스태프가 연 주소)" },
  ];
  for (const file of [...walk("app"), ...walk("src")]) {
    if (!/\.(ts|tsx|jsx|js)$/.test(file)) continue;
    const norm = file.split("\\").join("/");
    let text;
    try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    if (!SENDS_EMAIL.test(text)) continue;
    for (const { re, what } of BASE_URL_LEAKS) {
      const idx = text.search(re);
      if (idx < 0) continue;
      const line = text.slice(0, idx).split("\n").length;
      errors.push(
        `[링크주소] ${norm}:${line} — 사용자에게 나가는 링크의 기준 주소를 ${what}에서 끌어온다. ` +
        `배포/프리뷰에서 임시주소(.vercel.app)가 환자 메일에 나가 피싱처럼 보여 안 누른다. ` +
        `src/lib/siteUrl.ts 의 siteUrl() 을 쓸 것 (2026-07-22 실사고 · 2026-07-23 origin 확장).`
      );
    }
  }
}

// ── §27 전역 공개 크롬(ClientShell)에 하드코딩 라벨 금지 (POSTMORTEMS #108) ──────────
// 왜: 푸터 사업자 정보 10줄이 `<div>Service Name: {...}</div>` 처럼 **영어 라벨 하드코딩**이라
//     한국어 화면에서도 영어로 떴다. 데모 베이스(initial commit)에서 넘어온 뒤 i18n 키가
//     아예 만들어진 적이 없어 **3개월간 아무 검사도 안 걸렸다** — 한글누출 가드(§7·축C)는
//     "비한국어 화면의 한글"만 보고, 그 **반대 방향(한국어 화면의 영어)** 은 통째로 사각이었다.
// 무엇을 보나: ClientShell(모든 공개 화면이 쓰는 전역 껍데기)의 **JSX 텍스트 노드**에
//     `라틴문자…:` 꼴 리터럴이 있으면 실패. 라벨은 t() 로 뽑아야 한다.
// ⚠️ 1차 초안이 독립 리뷰에서 **두 방향 다** 깨졌다(2026-07-22, 둘 다 실측 재현):
//   ①미탐 — 값 자리를 `(?=[{<])` 로 강제해 **옛 코드 모양 하나만** 잡았다. 라벨과 값을
//     둘 다 하드코딩한 `<div>Contact Email: admin@…</div>`(더 나쁜 회귀)는 그냥 통과했고,
//     `E-mail:`(하이픈)·`Tel/Fax:`(슬래시)·`Address 2:`(숫자)·`<b>Service Name</b>:` 도 전부 샜다.
//     = "내가 아는 그 버그"만 잡는 가드였다. → 값 모양을 안 보고 **텍스트 노드 전체**를 본다.
//   ②오탐 — 주석 제외를 `줄 앞 2글자`로 판정해 **`{/* … */}` (jsx 의 주력 주석 형태)** 를
//     못 걸렀다. 이 저장소는 "이렇게 쓰지 말 것: <div>Service Name: {x}</div>" 류 경고 주석을
//     실제로 쓴다 → 그 주석 때문에 CI 가 깨진다. → 스캔 **전에** 주석을 원문에서 지운다.
// 한계: ClientShell 한 파일만 본다(전역 크롬이라 파급이 가장 크고, 전 파일 스캔은 오탐 폭발).
//     다른 공개 컴포넌트의 하드코딩 라벨은 여전히 사람/완성도 감사 몫.
{
  const FILE = "app/ClientShell.jsx";
  try {
    const raw = readFileSync(join(ROOT, FILE), "utf8");
    // ⓐ 주석을 먼저 지운다(줄수는 보존해야 줄번호가 안 밀린다 → 개행만 남기고 치환).
    const keepLines = (s) => s.replace(/[^\n]/g, "");
    const text = raw
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, keepLines) // {/* JSX 주석 */}
      .replace(/\/\*[\s\S]*?\*\//g, keepLines)           // /* 블록 주석 */
      .replace(/\/\/[^\n]*/g, keepLines);                // // 줄 주석
    // ⓑ 인라인 서식 태그를 먼저 벗긴다. 안 벗기면 `<b>Service Name</b>: {x}` 처럼
    //    라벨과 콜론이 **다른 텍스트 노드로 쪼개져** 그대로 샌다(리뷰 변종 시험에서 실제로 샜다).
    //    길이를 보존해야 줄번호가 안 밀리므로 같은 길이의 공백으로 치환.
    const keepLen = (s) => " ".repeat(s.length);
    const flat = text.replace(/<\/?(?:b|strong|em|i|span|small|code)(?:\s[^>]*)?>/g, keepLen);
    // ⓒ JSX 텍스트 노드 = `>` 다음부터 `<` 나 `{` 전까지. 값이 리터럴이든 표현식이든 똑같이 걸린다.
    const TEXT_NODE = />([^<>{}]+)(?=[<{])/g;
    // ⓒ 라틴문자로 시작하는 라벨 + 콜론. 하이픈·슬래시·숫자·앰퍼샌드 포함(E-mail, Tel/Fax, Address 2).
    //    URL(https://)·시각(10:30)은 콜론 앞이 라틴 '단어'가 아니거나 숫자라 안 걸린다.
    const LABEL = /(?:^|\s)([A-Za-z][A-Za-z0-9&./-]*(?:[ ][A-Za-z0-9&./-]+){0,5})\s*:/;
    for (const m of flat.matchAll(TEXT_NODE)) {
      const seg = m[1];
      if (!seg.trim() || /https?:\/\//.test(seg)) continue;
      const hit = seg.match(LABEL);
      if (!hit) continue;
      const line = text.slice(0, m.index + 1 + seg.indexOf(hit[1])).split("\n").length;
      errors.push(
        `[하드코딩라벨] ${FILE}:${line} — "${hit[1]}:" 가 코드에 그대로 박혀 있다. ` +
          `ClientShell 은 6개 언어 전 공개화면이 쓰는 전역 껍데기라, 하드코딩 라벨은 ` +
          `한국어·러시아어 화면에서도 영어로 뜬다(2026-07-22 실제로 사업자 정보 10줄이 그랬음). ` +
          `t("...", langCode) 로 뽑고 6개 언어 사전에 키를 추가할 것 (POSTMORTEMS #108).`
      );
    }
  } catch (e) {
    errors.push(`[하드코딩라벨] 검사 실패: ${e.message}`);
  }
}

// ── §20) 인증 호출 무한대기 차단 — supabase.auth.* 는 withAuthTimeout 필수 ──────
// 왜: 2026-07-24 Supabase 인스턴스가 "에러도 안 주고 응답을 멈추는" 장애를 냈다. 그러자
//     로그인 버튼이 "로그인 중…" 상태로 **영원히** 갇혔다 — 사용자는 실패했는지도 모르고,
//     PO 는 "누가 코드를 고장냈나" 를 먼저 의심했다(실제로는 DB 무응답). try/catch·.catch()
//     로는 못 잡는 부류다: 예외가 아니라 **영영 안 오는 것**이라 catch 가 실행되지 않는다.
// 무엇을 보나: 화면 코드(app/**)에서 네트워크를 타는 supabase.auth.* 호출이
//     withAuthTimeout() 으로 안 감싸여 있으면 실패. (getSession/signOut/onAuthStateChange 는
//     로컬 처리이거나 무한대기 위험이 없어 제외.)
// 한계: withAuthTimeout 이 **앞 2줄 안에** 있는지로 판정한다. 초안은 "같은 줄"만 봤는데,
//     감싼 코드가 줄바꿈되면(`await withAuthTimeout(` ↵ `  supabase.auth.signInWithPassword(...)`)
//     제대로 고친 코드까지 오탐으로 잡았다 — 첫 실행에서 내 수정본이 걸려 바로 드러났다.
//     변수에 담아 훨씬 뒤에서 감싸는 변형은 여전히 미탐(정적 가드의 목적은 복붙 신규 유입 차단).
{
  const NET_AUTH = /supabase(?:Client)?\.auth\.(signInWithPassword|signUp|updateUser|resetPasswordForEmail|verifyOtp|signInWithOtp|refreshSession)\s*\(/;
  for (const rel of walk("app")) {
    if (!/\.(jsx|tsx)$/.test(rel)) continue;
    let lines;
    try { lines = readFileSync(join(ROOT, rel), "utf8").split("\n"); } catch { continue; }
    lines.forEach((line, i) => {
      const code = line.replace(/\/\/.*/, "");
      const hit = code.match(NET_AUTH);
      const window = lines.slice(Math.max(0, i - 2), i + 1).join("\n");
      if (!hit || /withAuthTimeout\s*\(/.test(window)) return;
      errors.push(
        `[인증무한대기] ${rel.replace(/\\/g, "/")}:${i + 1} — supabase.auth.${hit[1]}() 가 ` +
          `withAuthTimeout() 없이 호출됨. 인증 서버가 무응답이면 화면이 로딩 상태에 영원히 갇힌다 ` +
          `(2026-07-24 실제 장애). \`await withAuthTimeout(supabase.auth.${hit[1]}(...))\` 로 감싸고 ` +
          `타임아웃 시 안내 문구(login.timeout)를 띄울 것.`
      );
    });
  }
}

// ── 26) i18n `t` 섀도잉 차단 (2026-07-24 #974 — 독립 리뷰가 실제 버그를 잡아 태어남) ──
// 왜: `import { t } from "@/lib/i18n"` 한 파일에서 지역 변수·콜백 파라미터를 `t` 로 두면
//     그 스코프의 t("키") 가 **번역 함수가 아닌 그 값**을 호출해 TypeError 가 난다.
//     실제 사고: AccountClient 의 `const t = await getToken()` 이 아래 t("...") 를 가려,
//     환자 데이터 삭제 요청이 **접수됐는데도 화면엔 "실패"** 가 떠 중복 신청을 유발할 뻔했다.
//     tsc·vitest·next build 전부 통과하는 부류라 사람 리뷰 아니면 프로덕션까지 간다.
{
  try {
    const bad = [];
    for (const file of SCAN_DIRS.flatMap(walk)) {
      if (!/\.(jsx?|tsx?)$/.test(file) || EXCLUDE.test(file)) continue;
      const text = readFileSync(join(ROOT, file), "utf8");
      // i18n 의 t 심볼을 직접 import 한 파일만 대상(래퍼만 쓰는 파일은 무관)
      const imp = text.match(/import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/i18n(?:\/index)?["']/);
      if (!imp || !/(^|,)\s*t\s*(,|$)/.test(imp[1].replace(/\s+/g, ""))) continue;
      text.split("\n").forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // 주석 제외
        const decl = /\b(?:const|let|var)\s+t\s*=/.test(line);
        const param = /\(\s*t\s*(?:,|\)\s*=>)/.test(line);
        if (decl || param) bad.push(`${file.replace(/\\/g, "/")}:${i + 1} ${line.trim().slice(0, 70)}`);
      });
    }
    if (bad.length) {
      errors.push(
        `[t섀도잉] i18n t() 를 가리는 지역 t 선언 ${bad.length}건: ${bad.slice(0, 5).join(" · ")}` +
          `${bad.length > 5 ? ` …외 ${bad.length - 5}` : ""} — 그 스코프의 t("키") 가 번역 대신 그 값을 ` +
          `호출해 TypeError 가 난다(빌드·타입·테스트는 통과하고 화면에서만 터짐). 변수명을 바꿀 것(token·tr·opt 등).`
      );
    }
  } catch (e) {
    errors.push(`[t섀도잉] 검사 실패: ${e.message}`);
  }
}

// ── 25) t("키") 가 사전에 실재하는가 (2026-07-24 #974 대량 이관에서 태어남) ──────────
// 왜: t() 는 없는 키를 만나면 조용히 "키 문자열 자체"를 반환한다(폴백 설계). 그래서 오타 하나·
//     사전 삽입 누락 하나면 화면에 "patientDocs.title" 같은 날키가 6개 언어 전부에 렌더된다 —
//     빌드·타입·테스트 어디도 안 잡고, 그 화면을 열어본 사람만 안다. 이관 작업 중 실제로
//     "컴포넌트만 머지되고 사전이 안 들어가면 환자 화면 전체가 깨진다"는 상황이 반복 관찰됨.
// → 공개 파일의 정적 t("...") 키가 DICTIONARY 에 없으면 CI 실패. (동적 t(`...`) 는 검사 불가라 제외)
{
  try {
    const dictText = readFileSync(join(ROOT, I18N), "utf8");
    const known = new Set([...dictText.matchAll(/^ {4}"([^"]+)":/gm)].map((m) => m[1]));
    const bad = [];
    for (const file of SCAN_DIRS.flatMap(walk)) {
      if (!/\.(jsx?|tsx?)$/.test(file) || EXCLUDE.test(file)) continue;
      if (!isPublicFacingFile(file)) continue;
      const text = readFileSync(join(ROOT, file), "utf8");
      if (!/from ["']@\/lib\/i18n["']/.test(text)) continue; // 중앙 사전을 쓰는 파일만
      const lines = text.split("\n");
      const prefixes = new Set(); // 템플릿 래퍼용: t(`prefix.${...}`) 의 prefix
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/\bt\(\s*["']([A-Za-z][\w.]*\.[\w.]+)["']\s*,/g)) {
          if (!known.has(m[1])) bad.push(`${file.replace(/\\/g, "/")}:${i + 1} t("${m[1]}")`);
        }
        // 래퍼 패턴 — 예: const tr = (k) => t(`telemedicine.${k}`, lang)
        // 키 전체를 정적으로 알 수 없으니, 그 접두어가 사전에 통째로 없는 경우(=삽입 누락)만 잡는다.
        for (const m of line.matchAll(/\bt\(\s*`([A-Za-z][\w]*)\.\$\{/g)) prefixes.add(m[1]);
      });
      for (const p of prefixes) {
        if (![...known].some((k) => k.startsWith(p + "."))) {
          bad.push(`${file.replace(/\\/g, "/")} t(\`${p}.\${…}\`) — "${p}." 접두어 키가 사전에 하나도 없음`);
        }
      }
    }
    if (bad.length) {
      errors.push(
        `[유령키] 화면이 부르는 t() 키가 사전(src/lib/i18n/dictionary.js)에 없음 ${bad.length}건: ` +
          `${bad.slice(0, 6).join(" · ")}${bad.length > 6 ? ` …외 ${bad.length - 6}` : ""} — ` +
          `t() 는 없는 키를 그대로 렌더하므로 이 상태로 배포하면 사용자 화면에 날키가 뜬다. ` +
          `사전에 6개 언어로 키를 추가하거나 오타를 고칠 것.`
      );
    }
  } catch (e) {
    errors.push(`[유령키] 검사 실패: ${e.message}`);
  }
}

// ── §21) 폴링 좀비 차단 — 네트워크를 타는 setInterval 은 «안 보이면 쉬기»가 필수 ──────
// 왜: 2026-07-24 Supabase 가 디스크 IO 예산 고갈로 1시간 죽었다. 부하를 만든 주범은
//     **아무도 안 보는 상담방 탭 하나**였다 — 채팅 4초·번역 4초·자료 8초 폴링이 돌고 있는데
//     멈추는 조건이 «탭 닫기» 하나뿐이라, 통화가 끝나고 2시간이 지나도 분당 37.5회씩
//     DB 를 두드렸다(3시간 전체 요청의 72%가 그 방 하나). POSTMORTEMS #120.
// 근본 문제: 폴링을 «시작하는» 코드는 누구나 쓰지만 «멈추는» 조건은 잘 안 쓴다. 그리고
//     그 누락은 빌드·타입·테스트·화면 어디에서도 안 보인다 — 요금과 장애로만 드러난다.
//     실제로 #969 수리 때 상담방만 고쳤고 같은 패턴 4곳(코디·환자 메시지함, 병원 리드,
//     에이전시 포털)이 그대로 남아 있었다. 그래서 사람 기억이 아니라 CI 가 잡는다.
// 무엇을 보나: app/** 에서 주기 1~30초 setInterval 의 콜백이 네트워크(fetch/supabase)를
//     타는데 그 콜백에 document.hidden 처리가 없으면 실패.
// 판정 단위: **인터벌 하나하나**다. 콜백 본문 + 콜백이 부르는 함수 본문 안에 document.hidden
//     이 있어야 통과 — 초안은 «파일 어딘가에 있으면 통과»여서 상담방 대기실 폴링(2.5초·무제한)
//     을 통째로 놓쳤다(같은 파일 다른 폴링에 가드가 있었기 때문). 그 누락은 PO가 «일찍 들어와
//     대기하면 어떻게 되냐»고 물어서야 드러났다.
// 한계: 1초 미만(애니메이션)·30초 초과(관리자 대시보드)는 대상 밖. 변수에 담아 훨씬 뒤에서
//     감싸는 변형은 여전히 미탐(정적 가드의 목적은 복붙 신규 유입 차단).
{
  try {
    // fetch 뿐 아니라 래퍼 이름(fetchWithAuth 등)과 API 경로 문자열까지 «네트워크»로 본다 —
    // 초안이 `fetch\s*\(` 만 봐서 fetchWithAuth() 를 쓰는 병원 리드 화면을 놓쳤다.
    const NET = /\bfetch\w*\s*\(|supabase|getAccessToken|authHeaders|["'`]\/api\//;
    const bad = [];
    for (const rel of walk("app")) {
      if (!/\.(jsx|tsx|js|ts)$/.test(rel)) continue;
      let text;
      try { text = readFileSync(join(ROOT, rel), "utf8"); } catch { continue; }
      if (!text.includes("setInterval(")) continue;

      for (const m of text.matchAll(/setInterval\s*\(/g)) {
        // setInterval( … ) 의 괄호 균형을 맞춰 인자 전체를 뜬다
        let depth = 1, i = m.index + m[0].length;
        while (i < text.length && depth > 0) {
          if (text[i] === "(") depth++;
          else if (text[i] === ")") depth--;
          i++;
        }
        const args = text.slice(m.index + m[0].length, i - 1);
        const delay = Number((args.match(/,\s*(\d+)\s*$/) || [])[1]);
        // 1초 미만 = 타자기·슬라이드 같은 화면 애니메이션 틱(실제로 25ms 타자기 버퍼를 오탐했다).
        // 30초 초과 = 관리자 대시보드류라 상시 부하로 안 본다.
        if (!delay || delay < 1000 || delay > 30000) continue;

        const body = args.replace(/,\s*\d+\s*$/, "").trim();
        // 이 인터벌이 «실제로 보는» 코드 조각들 — 콜백 본문 + 콜백이 부르는 함수들의 본문.
        // 네트워크 판정도, 가드 유무 판정도 **이 조각들 안에서만** 한다(파일 단위 아님).
        const scopes = [body];
        let polls = NET.test(body);
        {
          // 콜백이 직접 네트워크를 안 타도 «폴링 함수를 부르기만» 하는 경우가 훨씬 흔하다:
          //   setInterval(loadMessages, 5000)          ← 이름만 넘김
          //   setInterval(() => loadMessages(false), 5000)
          //   setInterval(() => { loadMessages(); }, 5000)  ← 블록 본문(초안이 이걸 놓쳤다)
          // → 콜백 안에서 호출되는 이름을 전부 모아 각 정의 본문까지 따라간다.
          const names = new Set();
          if (/^[A-Za-z_$][\w$]*$/.test(body)) names.add(body); // 이름만 넘긴 형태
          for (const c of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) names.add(c[1]);
          const IGNORE = /^(if|for|while|switch|return|typeof|catch|setTimeout|setInterval|clearInterval|clearTimeout|Number|String|Boolean|Math|Date|console|require)$/;
          for (const name of names) {
            if (IGNORE.test(name)) continue;
            const def = text.match(
              new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(|(?:const|let|var)\\s+${name}\\s*=`)
            );
            if (!def) continue;
            // 고정 길이로 자르면 옆 코드까지 딸려와 오탐이 난다 → 그 함수의 { } 만 정확히 뜬다.
            const open = text.indexOf("{", def.index);
            if (open < 0) continue;
            let d = 1, k = open + 1;
            while (k < text.length && d > 0) {
              if (text[k] === "{") d++;
              else if (text[k] === "}") d--;
              k++;
            }
            const fnBody = text.slice(open, k);
            scopes.push(fnBody);
            if (NET.test(fnBody)) polls = true;
          }
        }
        // 가드는 «이 인터벌» 안에 있어야 한다. 파일 어딘가에 있으면 통과시키던 초안이
        // 상담방 대기실 폴링(2.5초·무제한)을 통째로 놓쳤다 — 같은 파일 다른 폴링에
        // document.hidden 이 있었기 때문이다(2026-07-25 실제 누락, POSTMORTEMS #121).
        const guarded = scopes.some((s) => /document\.hidden/.test(s));
        if (polls && !guarded) {
          const line = text.slice(0, m.index).split("\n").length;
          bad.push(`${rel.replace(/\\/g, "/")}:${line} (${delay}ms)`);
        }
      }
    }
    if (bad.length) {
      errors.push(
        `[폴링좀비] 네트워크 폴링이 «안 보이면 쉬기» 없이 돈다 ${bad.length}건: ${bad.join(" · ")} — ` +
          `사용자가 탭을 두고 떠나도 계속 DB를 두드려 요금·장애로만 드러난다(2026-07-24 IO 예산 고갈, ` +
          `POSTMORTEMS #120). 인터벌 콜백 첫 줄에 ` +
          `\`if (typeof document !== "undefined" && document.hidden) return;\` 를 넣을 것 ` +
          `(탭이 돌아오면 다음 tick에 자동으로 따라잡는다). 정말 백그라운드에서도 돌아야 하면 ` +
          `그 이유를 주석으로 남기고 visibilitychange 로 명시적으로 처리할 것.`
      );
    }
  } catch (e) {
    errors.push(`[폴링좀비] 검사 실패: ${e.message}`);
  }
}

// ── §28) Gemini 호출은 세대 교체 사다리(geminiThinkingCompat)를 반드시 통과 ──────────
// 왜: 2026-07-23 구글이 `gemini-flash-latest` 별칭을 새 세대로 갈아치우자 구세대
//     `thinkingBudget:0` 이 400 거절돼 **전 채널 AI 가 통째로 죽었다**. 그때 사다리
//     (geminiThinkingCompat)를 만들었지만 **감싼 건 8곳뿐**이었고, 나머지 14곳은 맨손으로
//     남아 있었다 = 같은 사고가 나면 그 14곳이 그대로 다시 죽는다.
//     그리고 2026-07-21 구글이 `temperature`/`top_p`/`top_k` 폐기를 공지했다
//     ("future model generations 에서는 HTTP 400") → **예고된 동일 사고**.
//     사람이 "새 호출부 만들 때 감싸는 걸 기억"하는 구조로는 또 빠진다 → 기계가 잡는다.
// 무엇을 보나: Gemini 를 직접 호출하는 파일(SDK generateText / REST :generateContent)이
//     폐기 예고된 샘플링 파라미터를 넘기면서 사다리를 안 쓰면 실패.
// 한계: 파일 단위 판정 + "같은 줄에 래퍼가 있나"까지만 본다(정적 가드의 목적 = 복붙 신규
//     유입 차단). 파라미터를 변수에 담아 멀리서 넘기는 변형은 미탐.
{
  const SAMPLING = /\b(temperature|topP|topK|top_p|top_k)\s*:/;
  const SDK_CALL = /\bgenerateText\s*\(\s*\{/;
  const REST_CALL = /:generateContent\?key=/;
  const LADDER = /geminiThinkingCompat|callGeminiWithCompat|fetchGeminiWithCompat/;
  // 체온(fever)·정렬(topPages) 등 동명이인 오탐 제외용 — Gemini 호출이 없는 파일은 애초에 후보 아님
  for (const dir of ["src", "app"]) {
    for (const rel of walk(dir)) {
      if (!/\.(ts|tsx|js|jsx)$/.test(rel) || /\.test\./.test(rel)) continue;
      let src;
      try { src = readFileSync(join(ROOT, rel), "utf8"); } catch { continue; }
      const isGeminiCaller = SDK_CALL.test(src) || REST_CALL.test(src);
      if (!isGeminiCaller || !SAMPLING.test(src)) continue;
      const path = rel.replace(/\\/g, "/");

      if (!LADDER.test(src)) {
        errors.push(
          `[Gemini사다리] ${path} — Gemini 를 호출하며 폐기 예고된 샘플링 파라미터` +
            `(temperature/topP/topK)를 넘기는데 세대 교체 사다리를 안 쓴다. ` +
            `\`callGeminiWithCompat((p) => generateText(p as any), {...})\` 또는 ` +
            `\`fetchGeminiWithCompat(url, body, init?)\` 로 감쌀 것 ` +
            `(구글 공지 2026-07-21: 이 파라미터는 곧 HTTP 400 이 된다).`
        );
        continue;
      }
      // 사다리를 import 했더라도 «감싸지 않은 generateText 호출» 이 남아 있으면 그 줄을 찍는다.
      src.split("\n").forEach((line, i) => {
        const code = line.replace(/\/\/.*/, "");
        if (!SDK_CALL.test(code)) return;
        if (/callGeminiWithCompat/.test(code)) return;
        errors.push(
          `[Gemini사다리] ${path}:${i + 1} — 이 파일은 사다리를 쓰지만 이 generateText() ` +
            `호출만 맨손이다. 같은 파일 안 다른 호출처럼 callGeminiWithCompat 으로 감쌀 것.`
        );
      });
    }
  }
}

// ── §29) 종료(shutdown)된 Gemini 모델 ID 하드코딩 차단 ──────────────────────────
// 왜: 2026-07-25 트렌드 스캔에서 `src/lib/symptoms/detect.ts` 가 **2026-06-01 에 종료된**
//     `gemini-2.0-flash-lite` 를 부르고 있는 걸 발견했다. 호출은 조용히 실패하고 rule-based
//     폴백만 돌아서 **아무도 몰랐다**(에러 화면도 안 뜬다 = try/catch 안에서 조용히 죽는 부류).
//     모델 종료는 «우리가 아무것도 안 해도 남이 우리 코드를 깨뜨리는» 외부 변화다 →
//     기억이 아니라 목록으로 잡는다. 새 종료 예정이 뜨면 아래 표에 날짜와 함께 추가하라.
// 근거: https://ai.google.dev/gemini-api/docs/deprecations
{
  const DEAD_MODELS = [
    // [모델 ID, 종료일, 대체]
    ["gemini-2.0-flash", "2026-06-01", "gemini-flash-latest"],
    ["gemini-2.0-flash-001", "2026-06-01", "gemini-flash-latest"],
    ["gemini-2.0-flash-lite", "2026-06-01", "gemini-flash-latest"],
    ["gemini-2.0-flash-lite-001", "2026-06-01", "gemini-flash-latest"],
    ["gemini-3.1-flash-lite-preview", "2026-05-25", "gemini-3.1-flash-lite"],
    ["gemini-3.1-flash-image-preview", "2026-06-25", "gemini-3.1-flash-image"],
    ["gemini-3-pro-image-preview", "2026-06-25", "gemini-3-pro-image"],
  ];
  for (const dir of ["src", "app", "scripts", "agents"]) {
    for (const rel of walk(dir)) {
      if (!/\.(ts|tsx|js|jsx|mjs|py)$/.test(rel)) continue;
      if (/\.test\.|check-content-consistency/.test(rel)) continue;
      let src;
      try { src = readFileSync(join(ROOT, rel), "utf8"); } catch { continue; }
      for (const [id, dead, replacement] of DEAD_MODELS) {
        // 더 긴 ID 의 접두사로 오탐하지 않도록 뒤에 ID 문자가 안 오는 경우만
        const re = new RegExp(`["'\`]${id.replace(/\./g, "\\.")}(?![\\w.-])`);
        const line = src.split("\n").findIndex((l) => re.test(l.replace(/\/\/.*/, "")));
        if (line < 0) continue;
        errors.push(
          `[죽은모델] ${rel.replace(/\\/g, "/")}:${line + 1} — \`${id}\` 는 ${dead} 에 ` +
            `종료된 모델이라 호출이 조용히 실패한다(폴백만 돌아 아무도 모른다). ` +
            `\`${replacement}\` 로 교체할 것.`
        );
      }
    }
  }
}

// ── §30) ESM 저장소에서 «정의 없이 쓰는» __dirname/__filename 차단 ─────────────
// 왜: package.json 이 "type":"module" 이라 이 저장소의 .ts/.js/.mjs 는 전부 ESM 스코프다.
//     거기서 `__dirname` 은 존재하지 않는다 → 런타임에 `ReferenceError`.
//     그런데 **tsc 는 통과시킨다**(@types/node 가 전역으로 선언해 둠) → 「타입검사 초록」이
//     「동작함」을 전혀 보증하지 않는 부류. 2026-07-27 실사고: 야간 로봇 통화 스펙에 이걸
//     써서 프로덕션 E2E 가 통째로 실패했다. `e2e/fixtures/auth.ts` 에 *이미* 같은 경고
//     주석이 있었는데도 반복됐다 = 주석은 가드가 아니다.
// 무엇을 보나: `__dirname`/`__filename` 을 **참조하면서 같은 파일에서 정의하지 않은** 경우.
//     (정의해서 쓰는 건 정상 — 대부분의 scripts/*.mjs 가 그렇게 한다.)
// 예외: `*.test.ts`/`*.spec.ts` 중 vitest 로 도는 것은 러너가 주입해 줘서 실제로 동작한다.
//     단 **Playwright 스펙(e2e/)은 진짜 ESM 이라 예외가 아니다** — 이번에 터진 자리가 거기다.
{
  const USE = /(?<![\w$.])(__dirname|__filename)\b/;
  const DEFINE = /(?:const|let|var)\s+(?:__dirname|__filename)\s*=|\{[^}]*__dirname[^}]*\}\s*=/;
  // ⚠️ 공용 walk() 를 쓰면 안 된다 — 전역 EXCLUDE 가 `.spec.`·`.test.` 를 걸러내고
  //    CODE_EXT 에 `.mjs` 가 없다. 그래서 **Playwright 스펙과 scripts/*.mjs 는 이 검사기에
  //    통째로 안 보인다**(초안이 여기 걸려 «되돌려도 발화 0» 이었다 — 실측으로 드러남).
  //    이 룰의 표적이 정확히 그 두 부류라, 전용 탐색기로 직접 훑는다.
  const walkAll = (dir) => {
    const out = [];
    let entries;
    try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
    for (const e of entries) {
      if (/^(node_modules|\.next|archive|\.auth)$/.test(e)) continue;
      const rel = join(dir, e);
      let st;
      try { st = statSync(join(ROOT, rel)); } catch { continue; }
      if (st.isDirectory()) out.push(...walkAll(rel));
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e)) out.push(rel);
    }
    return out;
  };
  for (const dir of ["src", "app", "e2e", "scripts"]) {
    for (const rel of walkAll(dir)) {
      const path_ = rel.replace(/\\/g, "/");
      // 검사기 자신 제외 — 룰의 정규식·안내문에 `__dirname` 문자열이 들어 있어 자기를 오탐한다
      // (§29 와 같은 처리. 첫 실행에서 실제로 자기를 물었다).
      if (/check-content-consistency/.test(path_)) continue;
      // vitest 러너가 주입해 주는 단위테스트는 제외(실제로 동작). e2e/ 는 제외 안 함.
      if (/\.test\.(ts|tsx|js|jsx)$/.test(path_) && !path_.startsWith("e2e/")) continue;
      let raw;
      try { raw = readFileSync(join(ROOT, rel), "utf8"); } catch { continue; }
      // ⚠️ 주석은 걷어내고 판정한다. 초안이 원문 그대로 검사해서, «__dirname 쓰지 마라»고
      //    경고하는 주석(e2e/fixtures/auth.ts)을 위반으로 오탐했다 — 첫 실행에서 바로 드러남.
      const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*/gm, "$1");
      if (!USE.test(stripped) || DEFINE.test(stripped)) continue;
      const lines = raw.split("\n");
      const line = lines.findIndex(
        (l, i) => USE.test(l.replace(/(^|[^:])\/\/.*/, "$1")) && stripped.includes(lines[i].trim().slice(0, 20))
      );
      errors.push(
        `[ESM경로] ${path_}${line >= 0 ? `:${line + 1}` : ""} — 이 저장소는 "type":"module"(ESM) 이라 ` +
          `\`__dirname\`/\`__filename\` 이 런타임에 없다(ReferenceError). tsc 는 못 잡는다. ` +
          `\`path.dirname(fileURLToPath(import.meta.url))\` 를 쓸 것 ` +
          `(예: e2e/fixtures/auth.ts).`
      );
    }
  }
}

// ── §31) 자동으로 `git push` 하는 도구는 보호 브랜치(main) 가드가 있어야 한다 ────
// 왜: main 에 푸시하는 순간 자동 검사(PR CI) 없이 실서비스로 배포된다. 게다가 이 저장소는
//     워크트리를 여러 개 쓰기 때문에 **어떤 폴더 하나는 항상 main 을 잡고 있다** → 그 폴더에
//     남의 미저장 변경이 남아 있으면 자동 저장·푸시가 그걸 통째로 실서비스로 실어 보낸다.
//     `.claude/hooks/auto-commit-push.sh` 는 처음부터 이 가드를 갖고 있었는데(main|master 조기 종료),
//     나중에 만든 `scripts/sync.mjs` 가 **같은 일을 하면서 그 가드를 물려받지 않았다**(2026-07-27 발견,
//     PO 가 "지금 돌려도 됨?" 하고 물어보지 않았으면 그대로 돌 뻔했다).
//     = #122 와 같은 구조: 안전 규칙이 «한 곳의 코드»에만 있고 기계가 강제하지 않으면,
//       같은 일을 하는 새 도구가 맨손으로 생긴다.
// 무엇을 보나: 자동 푸시를 하는 파일이 보호 브랜치 이름(main/master)을 분기 조건으로 언급하는지.
// 예외: CI 워크플로(.github/)는 러너가 브랜치를 지정해 돌리므로 대상 아님. 미러링도 제외.
{
  const AUTOPUSH = /git\s+push|\[\s*"push"/;
  const HAS_GUARD = /\bmain\b[\s\S]{0,80}\bmaster\b|\bmaster\b[\s\S]{0,80}\bmain\b|PROTECTED_BRANCHES/;
  const scan = (dir) => {
    const out = [];
    let entries;
    try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
    for (const e of entries) {
      if (/^(node_modules|\.next|archive)$/.test(e)) continue;
      const rel = join(dir, e);
      let st;
      try { st = statSync(join(ROOT, rel)); } catch { continue; }
      if (st.isDirectory()) out.push(...scan(rel));
      else if (/\.(mjs|js|ts|sh)$/.test(e)) out.push(rel);
    }
    return out;
  };
  for (const dir of ["scripts", ".claude"]) {
    for (const rel of scan(dir)) {
      const path_ = rel.replace(/\\/g, "/");
      // 검사기 자신 제외 — 이 룰의 정규식·설명에 `git push`/`main` 문자열이 들어 있어 자기를 오탐한다.
      if (/check-content-consistency/.test(path_)) continue;
      let raw;
      try { raw = readFileSync(join(ROOT, rel), "utf8"); } catch { continue; }
      // 주석에 적힌 사용법 예시(`# ... && git push`)는 실행되지 않는다 → 코드 줄만 본다.
      // (2026-07-28 오탐: vercel-ignore-build.sh 의 「급하면 이렇게 해라」 주석이 걸렸다.)
      const code = raw.replace(/^\s*(#|\/\/).*$/gm, "");
      if (!AUTOPUSH.test(code)) continue;
      if (HAS_GUARD.test(raw)) continue;
      errors.push(
        `[보호브랜치] ${path_} — 자동으로 \`git push\` 하는데 보호 브랜치(main/master) 가드가 안 보인다. ` +
          `main 푸시 = 자동 검사 없이 실서비스 배포다. 브랜치가 main/master 면 저장·올리기를 하지 말고 ` +
          `내려받기만 하도록 조기 종료할 것 ` +
          `(예: .claude/hooks/auto-commit-push.sh 의 case 문, scripts/sync.mjs 의 PROTECTED_BRANCHES).`
      );
    }
  }
}

// ── §32) 정부지원과제 산출물(.docx)이 폐지된 화면·용어를 설명하고 있지 않은지 ───
// 왜: 2026-07-27 실사고 — 산출물 01·02·06·07 이 4월 기준 그대로 남아 **지금은 없는 화면**
//     (/intake·/partner/*·/doctor/*)을 설명하고 있었다. 06_사용자매뉴얼은 사용자에게
//     `/partner` 로 접속하라고 안내했는데 그 경로는 저장소에 폴더조차 없다.
//     아무도 못 잡은 이유가 명확하다 — **이 검사기는 .docx 내부를 읽지 못한다.**
//     코드에서 옛 경로를 지우면 잡히지만, 워드 문서에 남은 것은 그물 밖이었다.
// 무엇을 보나: docs/government-project/*.docx 본문을 추출해 retired-terms.json 의
//     폐지 경로·용어가 남아 있는지. 목록은 파이썬 생성기(_facts.py)와 **같은 파일**을 읽는다.
// 의존성 0: .docx 는 zip 이라 노드 내장 zlib 만으로 본문(word/document.xml)을 꺼낸다.
{
  const GP_DIR = "docs/government-project";
  let retired = null;
  try {
    retired = JSON.parse(readFileSync(join(ROOT, GP_DIR, "retired-terms.json"), "utf8"));
  } catch {
    /* 목록 파일이 없으면 이 룰은 건너뛴다(저장소에서 산출물을 걷어낸 경우) */
  }

  /** .docx(zip)에서 word/document.xml 을 꺼내 태그를 걷어낸 평문을 돌려준다. */
  const docxText = (abs) => {
    const buf = readFileSync(abs);
    // 1) 끝에서부터 EOCD(End of Central Directory, 0x06054b50) 를 찾는다.
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0 && i > buf.length - 65558; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return null;
    const count = buf.readUInt16LE(eocd + 10);
    let ptr = buf.readUInt32LE(eocd + 16); // 중앙 디렉터리 시작
    for (let n = 0; n < count; n++) {
      if (buf.readUInt32LE(ptr) !== 0x02014b50) return null;
      const method = buf.readUInt16LE(ptr + 10);
      const compSize = buf.readUInt32LE(ptr + 20);
      const nameLen = buf.readUInt16LE(ptr + 28);
      const extraLen = buf.readUInt16LE(ptr + 30);
      const commentLen = buf.readUInt16LE(ptr + 32);
      const localOff = buf.readUInt32LE(ptr + 42);
      const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
      if (name === "word/document.xml") {
        // 로컬 헤더의 이름·extra 길이는 중앙 디렉터리와 다를 수 있어 반드시 다시 읽는다.
        const lNameLen = buf.readUInt16LE(localOff + 26);
        const lExtraLen = buf.readUInt16LE(localOff + 28);
        const start = localOff + 30 + lNameLen + lExtraLen;
        const raw = buf.subarray(start, start + compSize);
        const xml = (method === 8 ? inflateRawSync(raw) : raw).toString("utf8");
        return xml.replace(/<[^>]+>/g, "");
      }
      ptr += 46 + nameLen + extraLen + commentLen;
    }
    return null;
  };

  if (retired) {
    let files = [];
    try {
      files = readdirSync(join(ROOT, GP_DIR)).filter((f) => f.endsWith(".docx"));
    } catch { files = []; }
    for (const f of files.sort()) {
      let text;
      try { text = docxText(join(ROOT, GP_DIR, f)); } catch { text = null; }
      if (!text) {
        errors.push(
          `[산출물문서] ${GP_DIR}/${f} — 본문을 읽지 못했다. 손상됐거나 예상 밖 형식이다. ` +
            `생성기(make_*.py)로 다시 만들 것.`
        );
        continue;
      }
      for (const r of retired.routes) {
        // 1) 살아 있는 «비슷한» 경로를 먼저 지운다. 안 그러면 /coordinator/intakes 나
        //    /inquiry/intake 같은 **현행** 화면이 /intake 위반으로 잡힌다(초안이 실제로 그랬다).
        let probe = text;
        for (const ok of r.allow || []) probe = probe.split(ok).join(" ");
        // 2) 뒤에 낱말 문자가 붙은 경우도 다른 경로다(/partner → /partners).
        const re = new RegExp(r.old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w-])");
        if (!re.test(probe)) continue;
        errors.push(
          `[산출물문서] ${GP_DIR}/${f} — 폐지된 화면 «${r.old}» 을 아직 설명하고 있다 ` +
            `(현행: ${r.now}). ${r.why} ` +
            `생성기가 있으면 생성기를 고쳐 재생성하고, 없으면 본문을 고칠 것. ` +
            `폐지 목록 SoR = ${GP_DIR}/retired-terms.json.`
        );
      }
      for (const t of retired.terms) {
        if (!text.includes(t.old)) continue;
        errors.push(
          `[산출물문서] ${GP_DIR}/${f} — 폐지된 용어 «${t.old}» 이 남아 있다 ` +
            `(현행: ${t.now}). ${t.why}`
        );
      }
    }
  }
}

// ── §33) 21개 언어 통짜 사전이 브라우저 번들로 되돌아오지 않게 ──────────────────
// 왜: 2026-07-27 실측 — src/lib/i18n/dictionary.js(21개 언어)가 통째로 첫 화면 JS 에 들어가
//     홈 623KB 중 269KB(gzip)를 차지했다. 방문자는 자기 언어 1개만 쓴다. next.config.js 가
//     클라이언트 빌드에서만 이 파일을 dictionary.client.js(빈 껍데기)로 바꿔치기하고,
//     브라우저는 layout.jsx 가 HTML 에 인라인해 주는 자기 언어 완성본 하나만 받는다
//     (src/lib/i18n/inlineScript.js — 별도 파일로 내리면 head preload 가 첫 화면을 늦춘다, 실측).
//     그 별칭이 사라지면 269KB 가 **조용히** 전 페이지로 돌아온다(화면은 멀쩡해서 아무도 모른다).
// 무엇을 보나: ① next.config.js 에 그 별칭이 살아 있는지 ② "use client" 파일이 사전을 직접
//     import 하지 않는지(별칭 때문에 빈 객체가 와서 **글자가 조용히 사라진다**).
{
  const CFG = "next.config.js";
  try {
    const cfg = readFileSync(join(ROOT, CFG), "utf8");
    const hasAlias =
      /i18n\/dictionary\.js/.test(cfg) && /i18n\/dictionary\.client\.js/.test(cfg);
    if (!hasAlias) {
      errors.push(
        `[사전번들] ${CFG} — 클라이언트 빌드에서 src/lib/i18n/dictionary.js 를 ` +
          `dictionary.client.js 로 바꿔치기하는 별칭(resolve.alias)이 없다. ` +
          `이게 빠지면 21개 언어 사전(gzip 269KB)이 전 페이지 첫 화면 JS 로 되돌아온다.`
      );
    }
  } catch {
    errors.push(`[사전번들] ${CFG} 읽기 실패 — 별칭 확인 불가`);
  }

  const scanDirs = ["app", "src", "components"];
  const walk = (dir) => {
    const out = [];
    let entries;
    try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
    for (const e of entries) {
      if (/^(node_modules|\.next)$/.test(e)) continue;
      const rel = join(dir, e);
      let st;
      try { st = statSync(join(ROOT, rel)); } catch { continue; }
      if (st.isDirectory()) out.push(...walk(rel));
      else if (/\.(jsx?|tsx?)$/.test(e)) out.push(rel);
    }
    return out;
  };
  for (const dir of scanDirs) {
    for (const rel of walk(dir)) {
      const path_ = rel.split(sep).join("/");
      if (path_.startsWith("src/lib/i18n/")) continue; // 사전 본체·껍데기 자신
      let raw;
      try { raw = readFileSync(join(ROOT, rel), "utf8"); } catch { continue; }
      if (!/^\s*["']use client["']/m.test(raw)) continue;
      if (!/from\s+["'](@\/lib\/i18n\/dictionary|.*\/i18n\/dictionary)["']/.test(raw)) continue;
      errors.push(
        `[사전번들] ${path_} — "use client" 파일이 사전(i18n/dictionary)을 직접 import 한다. ` +
          `클라이언트 빌드에서 이건 빈 껍데기로 바뀌므로 **글자가 조용히 사라진다**. ` +
          `t() 를 쓰거나(@/lib/i18n), 서버 컴포넌트에서 값을 내려줄 것.`
      );
    }
  }
}

// ── §33-b) E2E 「한 번 읽고 판정」 금지 — innerText() → toBeTruthy() 부채 동결 (POSTMORTEMS #132) ──
// 왜: 2026-07-27 게스트 초대 스펙 2건이 main 을 빨갛게 만들었는데, 앱은 멀쩡했다.
//     화면이 하이드레이션 뒤에 그려지는데 테스트는 goto 직후 body.innerText() 를 **딱 한 번**
//     읽고 정규식으로 판정했다 — 자동 재시도가 없어 구조적으로 이길 수 없는 경주였고,
//     Playwright retry 가 «1차 실패 → 2차 통과»로 최소 3번의 초록을 위장하다 결국 터졌다.
//     (실측: 게스트 폼은 load 뒤 0.2~0.3초에 뜬다. 그 사이엔 "연결 중…"만 있다.)
//     정답은 웹퍼스트 어서션 — expect(locator).toBeVisible() / expect(body).toContainText().
// 무엇을 보나: 기존 부채는 파일별 개수로 **동결**하고, 늘어나거나 새 파일이 생기면 실패.
//     고쳐서 줄었으면 아래 숫자도 같이 내려라(부채 장부가 거짓이 되지 않게).
{
  const FROZEN = {
    "admin-feedback-list.spec.ts": 1,
    "chat-identification-form.spec.ts": 1,
    "chat-multilingual.spec.ts": 2,
    "hospital-detail.spec.ts": 1,
    "hospitals-list.spec.ts": 1,
    // intake-file-upload → chat-file-upload 로 옮기며 부채 갚음(2026-08-25).
    // intake-form-submit·intake-validation-required 는 죽은 주소(/intake)를 보고 있어 삭제.
    "intake-language-fallback.spec.ts": 1,
    "patient-dashboard-auth.spec.ts": 1,
    "patient-survey-response.spec.ts": 1,
    "telemedicine-booking-cta.spec.ts": 1,
    "treatments-immune-data.spec.ts": 2,
  };
  const HOW =
    `→ expect(locator).toBeVisible() / await expect(page.locator("body")).toContainText(/…/) 로 바꿀 것 ` +
    `(둘 다 «될 때까지» 자동 재시도한다). 부채를 갚았으면 scripts/check-content-consistency.mjs §33-b 의 숫자도 내려라.`;

  // ⚠️ walk() 금지 — EXCLUDE 가 .spec. 을 배제해 스캔 대상이 0이 된다(§7c 와 같은 함정).
  const specs = readdirSync(join(ROOT, "e2e")).filter((f) => /\.spec\.ts$/.test(f));
  for (const f of specs) {
    const lines = readFileSync(join(ROOT, "e2e", f), "utf8").split("\n");
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      // innerText() 한 번 읽기 → 10줄 안에서 toBeTruthy() 로 판정하는 모양
      if (/\.innerText\(\)/.test(lines[i]) && /toBeTruthy\(\)/.test(lines.slice(i, i + 10).join("\n"))) count++;
    }
    const allowed = FROZEN[f] ?? 0;
    if (count > allowed) {
      errors.push(
        `[e2e-oneshot] e2e/${f} — 「innerText() 한 번 읽고 toBeTruthy()」 ${count}건 (허용 ${allowed}건). ` +
          `하이드레이션 뒤에 그려지는 화면에선 이 검사가 경주라서, retry 로 초록을 위장하다 아무 커밋에서나 터진다(POSTMORTEMS #132). ${HOW}`
      );
    } else if (count < allowed) {
      errors.push(
        `[e2e-oneshot] e2e/${f} — 부채가 ${allowed}건 → ${count}건으로 줄었다(좋음). ` +
          `scripts/check-content-consistency.mjs §33-b 의 숫자를 ${count}${count === 0 ? " (= 항목 삭제)" : ""} 로 내려라 — 장부가 실제와 어긋나면 가드가 헐거워진다.`
      );
    }
  }
  for (const f of Object.keys(FROZEN)) {
    if (!specs.includes(f)) {
      errors.push(`[e2e-oneshot] §33-b 동결 목록의 e2e/${f} 가 없다(이름 변경·삭제). 목록에서 지울 것 — 죽은 항목은 가드를 헐겁게 만든다.`);
    }
  }
}

// ── §34) 의료진 세부 이력 문구가 ru·kz·zh·ja 사전에 다 있는지 ────────────────
// 왜: 2026-07-27 PO 지적 — /ru/hospitals 에서 섹션 제목(경력·학력)만 번역되고 **내용은 전부 영어**로
//     나왔다. 의료진 명단(src/lib/data/immuneDoctors.js)이 ko/en 만 들고 있었기 때문.
//     번역을 doctorPhrases.js 로 옮겼는데, 의사를 새로 추가하면서 사전에 넣는 걸 잊으면
//     **그 줄만 조용히 영어로** 나간다 — 같은 부류의 재발이라 기계가 잡는다.
// 무엇을 보나: DOCTORS 의 en 배열 문구·subspecialty.en 이 DOCTOR_PHRASES 에 있고 4개 언어가 다 찼는지.
{
  const SRC = "src/lib/data/immuneDoctors.js";
  let phrases = null;
  try {
    ({ DOCTOR_PHRASES: phrases } = await import(
      pathToFileURL(join(ROOT, "src/lib/content/doctorPhrases.js")).href
    ));
  } catch {
    errors.push(`[의료진i18n] src/lib/content/doctorPhrases.js 를 읽지 못했다 — ${SRC} 가 이 사전을 쓴다.`);
  }
  // 중복 키 (반성문 #129 — 🔁 #61 부류 재발). import 한 객체로는 못 본다(뒤 값이 앞을 덮어써서
  // 둘 다 조회에 성공한다) → 소스를 줄 단위로 읽어야 잡힌다. 일괄 치환으로 서로 다른 두 문구가
  // 한 문자열로 수렴할 때 생기며, 빌드·§33 을 전부 통과하고 eslint 에서만 걸린다.
  {
    let raw = "";
    try { raw = readFileSync(join(ROOT, "src/lib/content/doctorPhrases.js"), "utf8"); } catch { raw = ""; }
    const seen = new Map();
    raw.split("\n").forEach((line, n) => {
      const m = line.match(/^ {2}'((?:[^'\\]|\\.)*)':\s*\{/);
      if (!m) return;
      if (seen.has(m[1])) {
        errors.push(
          `[의료진i18n] doctorPhrases.js 중복 키 «${m[1]}» (${seen.get(m[1])}번째 줄과 ${n + 1}번째 줄). ` +
            `뒤에 온 값이 앞을 덮어써 앞의 번역은 죽는다 — 한쪽을 지울 것.`
        );
      } else seen.set(m[1], n + 1);
    });
  }

  if (phrases) {
    // 소스를 글자로 훑지 말고 «불러와서» 본다. 2026-08-19 실측: 옛 정규식이
    //   en: [ ... ]  를 「첫 ] 까지」로 잘라서, 문구 «안»에 대괄호가 든 줄부터 통째로 안 읽혔다
    //   («[MBC] TV appearance…», «[6]-Shogaol…» 3건이 번역 없이 영어로 나가는데도 검사는 통과).
    let roster = null;
    try {
      ({ IMMUNE_DOCTOR_ROSTER: roster } = await import(pathToFileURL(join(ROOT, SRC)).href));
    } catch (e) {
      errors.push(`[의료진i18n] ${SRC} 를 불러오지 못했다 (${e.message}) — 이 가드가 무력화됐다.`);
    }
    if (!Array.isArray(roster) || !roster.length) {
      // 「불러오기는 됐는데 명단이 없다」도 무력화다 — 이름이 바뀌거나 다른 파일로 옮겨가면
      // roster 가 undefined 가 되고, 검사가 «볼 게 없으니 통과» 로 조용히 넘어간다.
      errors.push(`[의료진i18n] ${SRC} 에서 IMMUNE_DOCTOR_ROSTER 배열을 얻지 못했다 — 이 가드가 무력화됐다. 검사 룰을 고칠 것.`);
    }
    const used = new Set();
    for (const doc of Array.isArray(roster) ? roster : []) {
      if (doc.subspecialty?.en) used.add(doc.subspecialty.en);
      // 칸 이름을 못 박지 말고 «en 이 배열인 칸»을 전부 본다 — 나중에 «수상» 같은 칸이
      // 늘어도 검사 밖으로 새지 않는다. (이름·직위는 en 이 문자열이라 자동으로 빠진다:
      //  영어로 내보내기로 한 것 — PO 2026-07-27)
      for (const value of Object.values(doc)) {
        if (value && typeof value === "object" && Array.isArray(value.en)) {
          for (const line of value.en) used.add(line);
        }
      }
    }

    const LANGS = ["ru", "kz", "zh", "ja"];
    const missing = [];
    for (const s of used) {
      const row = phrases[s];
      if (!row) { missing.push(`«${s}» — 사전에 없음`); continue; }
      const gaps = LANGS.filter((L) => !row[L]);
      if (gaps.length) missing.push(`«${s}» — ${gaps.join("·")} 누락`);
    }
    if (missing.length) {
      errors.push(
        `[의료진i18n] 의료진 세부 이력 ${missing.length}건이 6개 언어로 안 나간다 ` +
          `(러시아어·카자흐어 사용자에게 영어로 노출됨). src/lib/content/doctorPhrases.js 에 추가할 것:\n` +
          missing.slice(0, 20).map((m) => `      · ${m}`).join("\n") +
          (missing.length > 20 ? `\n      · … 외 ${missing.length - 20}건` : "")
      );
    }
  }
}

// ── 렌더 중 «브라우저에만 있는 값» 읽기 = Hydration Error (POSTMORTEMS #30 부류 재발) ──
// 서버 렌더에는 document·navigator 가 없다. 컴포넌트 본문에서 이걸 읽으면 서버는 'en',
// 브라우저는 'ko'/'ru' 로 그려서 화면 전체가 어긋나고 React 가 Hydration Error 를 던진다.
// 실제로 센트리에 한 달간 23건 쌓였다(JAVASCRIPT-NEXTJS-3, /patient/*·/survey/*).
// 올바른 방법: useLang()(useSyncExternalStore — 하이드레이션 땐 서버값, 그 뒤 쿠키값) 또는
//             서버 컴포넌트가 헤더/쿠키를 읽어 prop 으로 내려주기.
// ponytail: 「들여쓰기 2칸 = 컴포넌트 본문」 휴리스틱. effect/핸들러 안(4칸 이상)은 안전하니 넘긴다.
//   한계 — 파일에 중첩 컴포넌트가 있어 본문이 4칸으로 들어가면 못 잡는다. 그때는 룰을 AST 로 올릴 것.
{
  // ⚠️ `document.cookie` 는 일부러 뺐다 — 컴포넌트가 아닌 모듈 최상단 쿠키 헬퍼(readCookie 등)가
  //    같은 2칸 들여쓰기라 오탐만 쏟아진다. 언어 쿠키는 getLangCodeFromCookie 로 이미 덮인다.
  const BROWSER_ONLY = /getLangCodeFromCookie\s*\??\.?\(|navigator\.(languages?|userAgent)\b|window\.(matchMedia\s*\(|inner(Width|Height)\b)|localStorage\.|sessionStorage\./;
  // 마운트 뒤에만 도는 훅 — 이 콜백은 렌더 중 실행되지 않으니 안전.
  const DEFERRED_HOOK = /useEffect|useLayoutEffect|useCallback/;
  // ⚠️ 반대로 이 둘의 콜백은 **렌더 중에** 실행된다(useState 지연 초기화·useMemo).
  //    `=>` 가 있다고 안전 처리하면 `useState(() => getLangCodeFromCookie())` 가 그대로 샌다.
  const RUNS_DURING_RENDER = /useState\s*\(|useMemo\s*\(/;
  for (const file of [...walk("app"), ...walk("src"), ...walk("components")]) {
    if (!/\.(jsx|tsx)$/.test(file)) continue;
    const norm = file.replace(/\\/g, "/");
    // 안전 패턴의 원본 — useSyncExternalStore 의 «클라이언트 스냅샷» 이라 쿠키를 읽는 게 맞다.
    if (norm.endsWith("src/lib/i18n/LangContext.jsx")) continue;
    const lines = stripCommentsWholeFile(readFileSync(join(ROOT, file), "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (!/^ {2}\S/.test(line)) return;          // 컴포넌트 본문 최상단만
      if (!BROWSER_ONLY.test(line)) return;
      // 순서 주의: 렌더 중 실행되는 훅이 먼저다 — `=>` 에게 구제받지 못하게.
      if (!RUNS_DURING_RENDER.test(line)) {
        if (DEFERRED_HOOK.test(line)) return;                 // effect 안이면 안전
        if (/=>|\bfunction\b|\basync\b/.test(line)) return;    // 핸들러·콜백 정의면 안전
      }
      errors.push(
        `[하이드레이션] ${norm}:${i + 1} — 컴포넌트 렌더 중에 브라우저 전용 값을 읽는다. ` +
          `서버 렌더엔 document/navigator 가 없어 서버('en')와 브라우저('ko')가 다른 화면을 그리고 ` +
          `React 가 Hydration Error 를 던진다(POSTMORTEMS #30 부류·센트리 23건). ` +
          `언어는 useLang(), 그 밖의 값은 useEffect 로 마운트 후 읽거나 서버가 prop 으로 내려줄 것.\n` +
          `    ${line.trim().slice(0, 120)}`
      );
    });
  }
}

// ── <html lang> 매핑이 활성 6개 언어를 전부 덮는가 (2026-07-27, PR #1047 독립 리뷰 발견) ──
// app/layout.jsx 의 HTML_LANG 은 우리 내부코드(kz) → BCP47(kk) 변환표다. 이게 LOCALES 보다
// 좁으면 「본문은 그 언어인데 <html lang> 은 en」 이 되고, 그 불일치는 브라우저 자동번역을
// 부르는 조건이다 — 자동번역은 아직 못 닫은 NotFoundError(POSTMORTEMS #133)의 유력 용의자.
// 실제로 언어 검증을 LANG_OPTIONS(21개)로 하는 바람에 15개 코드가 매핑 없이 새던 것을 잡았다.
{
  try {
    const layoutSrc = readFileSync(join(ROOT, "app/layout.jsx"), "utf8");
    const m = /const HTML_LANG = \{([^}]*)\}/.exec(layoutSrc);
    if (!m) {
      errors.push(`[html-lang] app/layout.jsx 에서 HTML_LANG 을 못 찾았다 — 이 가드가 무력화됐다. 룰을 고칠 것.`);
    } else {
      const mapped = new Set([...m[1].matchAll(/(\w+)\s*:/g)].map((x) => x[1]));
      const cfg = readFileSync(join(ROOT, "src/lib/i18n/config.js"), "utf8");
      const lm = /export const LOCALES = \[([^\]]*)\]/.exec(cfg);
      const locales = lm ? [...lm[1].matchAll(/"([a-z]{2})"/g)].map((x) => x[1]) : [];
      const missing = locales.filter((l) => !mapped.has(l));
      if (missing.length) {
        errors.push(
          `[html-lang] app/layout.jsx 의 HTML_LANG 에 활성 언어 ${missing.join("·")} 매핑 없음 → ` +
            `그 언어로 본문이 나가는데 <html lang> 은 en 으로 찍힌다(브라우저 자동번역 유발, POSTMORTEMS #133). HTML_LANG 에 추가할 것.`
        );
      }
      // 반대 방향: 서버 렌더 언어 검증은 LOCALES(6) 기준이어야 한다. LANG_OPTIONS(21)로 하면 위 불일치가 되살아난다.
      if (/const ssrLang = LANG_OPTIONS/.test(layoutSrc)) {
        errors.push(`[html-lang] app/layout.jsx 의 서버 렌더 언어 검증이 LANG_OPTIONS(21개) 기준이다 — LOCALES(활성 6개)로 할 것. 옛 언어 쿠키(vi·ar 등)가 <html lang="en"> + 그 언어 본문을 만든다.`);
      }
    }
  } catch (e) {
    errors.push(`[html-lang] 검사 실패: ${e.message}`);
  }
}

// ── 36) 결제·정산 경보는 저장소 문서로 달 수 없다 (반성문 #137 — 🔁 #96 부류 재발) ─────────
//     왜: 결제·정산·증빙의 정본(SoR)은 PO 로컬 폴더(`05. 비용 집행 > 02. 온라인 결제`)이고
//     어시는 그걸 못 본다. 저장소에 남는 건 전부 «특정 시점 스냅샷»이다.
//     실제 사고(2026-07-28): 어시가 2026-07-24 자 「전용카드 결제 거절」 기록을 브랜치에서
//     회수한 뒤 날짜를 확인하지 않고 🔴 «지금 문제다»로 PO 에게 보고했다. 그 사이 PO 는
//     이미 증빙을 정리해둔 상태였다. 손에 2026-07-27 실측이 있었는데도 대조하지 않았다.
//     → 결제·정산 얘기에 🔴/🛑 를 달려면 반드시 «시점»을 명시하게 강제한다.
{
  const PAY_DOCS = ["docs/KNOWN_ISSUES.md", "docs/PROJECT_CONTEXT.md", "docs/LAUNCH_GATES_PO.md"];
  //  «돈» 주제 낱말 — 이게 걸린 제목에만 적용한다(과탐 방지)
  const PAY_WORDS = /결제|정산|증빙|카드|청구|미납|환불/;
  //  시점을 밝혔다고 인정하는 표기
  const DATED = /20\d\d-\d\d-\d\d|시점|기준|현재 상태 아님|기록으로만|당시/;
  for (const rel of PAY_DOCS) {
    const abs = join(ROOT, rel);
    let raw;
    try { raw = readFileSync(abs, "utf8"); } catch { continue; }
    const lines = raw.split("\n");
    lines.forEach((line, i) => {
      // 문서 제목(##) 중 🔴·🛑 경보이면서 돈 주제인 것
      if (!/^#{2,3}\s*(🔴|🛑)/.test(line)) return;
      if (!PAY_WORDS.test(line)) return;
      if (DATED.test(line)) return;
      errors.push(
        `[결제경보] ${rel}:${i + 1} — 결제·정산 항목에 🔴/🛑 를 달면서 «시점»을 안 밝혔다.\n` +
          `    "${line.trim().slice(0, 80)}"\n` +
          `    결제·정산의 정본은 PO 로컬 폴더(05. 비용 집행 > 02. 온라인 결제)이고 어시는 못 본다.\n` +
          `    저장소 기록은 전부 스냅샷이다 → 제목에 날짜(2026-MM-DD)나 «N 기준»·«현재 상태 아님»을 붙이거나,\n` +
          `    확인 안 된 건 경보(🔴/🛑) 대신 📄/📌 로 낮춰라. (반성문 #137)`
      );
    });
  }
}

// ── §35) 사이트맵이 «리디렉션되는 URL» 을 광고하지 않는가 (2026-07-28, GSC) ────────
// next.config.js 가 301 로 옮겨버린 slug 를 sitemap 생성부가 계속 뱉고 있었다
// (면력 지점 4개 × 6언어 = 24 URL). 구글 색인 리포트 «리디렉션이 포함된 페이지» 의 정체.
// 리디렉션 목록과 URL 생성 목록은 서로를 모르는 두 파일이라 손으로는 계속 어긋난다.
{
  try {
    const cfgSrc = readFileSync(join(ROOT, "next.config.js"), "utf8");
    const block = /async redirects\(\)\s*\{([\s\S]*?)\n  \},/.exec(cfgSrc);
    if (!block) {
      errors.push(`[사이트맵-리디렉션] next.config.js 에서 redirects() 를 못 찾았다 — 이 가드가 무력화됐다. 룰을 고칠 것.`);
    } else {
      // source 패턴을 정규식으로. `${b}` 같은 보간부는 «같은 블록에 적힌 slug 리터럴들»로만
      // 넓힌다(.+ 로 넓히면 /treatments/${s} 가 살아있는 암종 목록까지 삼켜 오탐).
      const literals = [...block[1].matchAll(/['"]([a-z0-9][a-z0-9-]*)['"]/g)].map((m) => m[1]);
      if (!literals.length) {
        // 리터럴을 하나도 못 뽑으면 아래 정규식이 «빈 문자열» 로 넓혀져 조용히 아무것도 안 잡는다.
        // 가드가 죽은 채 초록이 되는 게 제일 나쁘다 → 명시적으로 실패시킨다.
        errors.push(`[사이트맵-리디렉션] redirects() 에서 slug 리터럴을 못 뽑았다(따옴표 스타일 변경?) — 이 가드가 무력화됐다. 룰을 고칠 것.`);
      }
      const anyLiteral = `(?:${literals.join("|")})`;
      const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // (:locale 접두 패턴은 언어 prefix 라 경로 비교에서 제외)
      const sources = literals.length
        ? [...block[1].matchAll(/source:\s*[`"']([^`"']+)[`"']/g)]
            .map((m) => m[1])
            .filter((s) => !s.startsWith("/:locale"))
            .map((s) => {
              // Next.js 경로 패턴 지원: `${x}` → 위 리터럴 union, `:p*` → 나머지 전부, `:p` → 한 세그먼트.
              // (안 하면 정규식 특수문자 때문에 조용히 안 맞거나 new RegExp 이 던진다 — 독립 리뷰 지적)
              const body = s
                .split(/(\$\{[^}]+\}|:[a-zA-Z]\w*\*?)/)
                .map((part) => {
                  if (/^\$\{/.test(part)) return anyLiteral;
                  if (/^:\w+\*$/.test(part)) return ".*";
                  if (/^:\w+$/.test(part)) return "[^/]+";
                  return escapeRe(part);
                })
                .join("");
              return new RegExp("^" + body + "$");
            })
        : [];
      const { getAllPartnerSlugs } = await import(
        pathToFileURL(join(ROOT, "src/lib/data/partnerHospitals.js")).href
      );
      const sitemapSrc = readFileSync(join(ROOT, "app/sitemap.js"), "utf8");
      const advertised = [
        ...getAllPartnerSlugs().map((s) => [`/hospitals/${s}`, "getAllPartnerSlugs()"]),
        // app/sitemap.js 정적 목록: localized('/foo') 형태
        ...[...sitemapSrc.matchAll(/localized\(\s*['"`](\/[^'"`]+)['"`]/g)].map((m) => [m[1], "app/sitemap.js 정적 목록"]),
      ];
      // DB에서 오는 병원 slug 는 정적 검사로 볼 수 없다 → 사이트맵이 제외목록을 «쓰는지»만 확인.
      // (면력 지점은 DB 행이 살아있어서, 이 필터가 빠지면 리디렉션 URL 24개가 되살아난다)
      for (const listName of ["REDIRECTED_PARTNER_SLUGS", "REDIRECTED_TREATMENT_SLUGS"]) {
        // import 만 남기고 실제 필터를 지우는 퇴화까지 잡으려면 «호출»을 봐야 한다.
        if (!sitemapSrc.includes(`${listName}.includes(`)) {
          errors.push(
            `[사이트맵-리디렉션] app/sitemap.js 가 ${listName} 를 안 쓴다 → DB에 행이 남거나 되살아난 ` +
              `영구이동 slug 가 사이트맵에 다시 실린다. 해당 DB 루프에서 제외할 것.`
          );
        }
      }
      for (const [path, where] of advertised) {
        if (sources.some((re) => re.test(path))) {
          errors.push(
            `[사이트맵-리디렉션] «${path}» 는 next.config.js 가 영구이동시키는데 ${where} 가 아직 사이트맵에 내보낸다 → ` +
              `구글이 «리디렉션이 포함된 페이지»로 잡는다(색인 안 됨). 그 목록에서 뺄 것(제휴병원이면 REDIRECTED_PARTNER_SLUGS 에 추가).`
          );
        }
      }
    }
  } catch (e) {
    errors.push(`[사이트맵-리디렉션] 검사 실패: ${e.message}`);
  }
}

// ── §35-b) 정규식에 «제어문자»가 박히는 사고 차단 (2026-08-27 신설) ──────────────
// 왜 (실측): 바로 아래 §36 의 비밀키 검출 정규식 4개가 \bsb_secret_… 를 의도했는데 백슬래시가
//     풀려 «백스페이스 문자(0x08)»가 박혀 있었다 → /(0x08)sb_secret_…/ 가 되어 Supabase secret ·
//     GitHub 토큰 · OpenAI 키 · 구글 API 키를 **절대 못 잡는** 상태였다. 이 저장소는 PUBLIC 이고
//     2분마다 git add -A 자동저장이 돈다. 같은 사고가 src/lib/chat/topicGuards.ts 의 병원 랭킹
//     가드에도 있어 영어 "best hospital" 질문에 하드가드가 안 켜졌다(한국어·러시아어는 정상).
//     둘 다 **눈으로는 안 보인다** — grep 출력에도 안 나타나서 오래 살아남았다. cat -A 로만 보인다.
// 왜 0x08 계열만 잡나: 정규식에서 흔한 \b(단어경계)·\0·\v·\f 가 풀릴 때 생기는 문자만 골랐다.
//     정당한 쓰임이 있는 0x1b(ESC 색상코드)·0x1e(레코드 구분자)·0x03·0x1a(파일 매직바이트)는
//     «일부러» 뺐다 — 넣으면 오탐 6건이 나고, 예외 목록이 늘면 결국 아무도 안 본다.
//     신설 시점 저장소 기준 이 규칙의 오탐은 0건이다.
{
  const CTRL_CHARS = /[\x00\x08\x0B\x0C]/;
  const codeFiles = execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((f) => /\.(?:js|mjs|cjs|jsx|ts|tsx|css|json)$/i.test(f));
  for (const f of codeFiles) {
    let src = "";
    try { src = readFileSync(join(ROOT, f), "utf8"); } catch { continue; }
    if (!CTRL_CHARS.test(src)) continue;
    src.split(/\r?\n/).forEach((line, i) => {
      const m = line.match(CTRL_CHARS);
      if (!m) return;
      const code = "0x" + m[0].charCodeAt(0).toString(16).padStart(2, "0");
      errors.push(`[제어문자] ${f}:${i + 1} — 소스에 제어문자 ${code} 가 박혀 있다. 정규식의 백슬래시-b/0/v/f 가 «풀려서» 실제 제어문자가 된 경우가 대부분이고, 그러면 그 규칙은 조용히 아무것도 안 잡는다(2026-08-27 실측: 비밀키 검출 4종·병원 랭킹 가드가 이 이유로 죽어 있었다). 백슬래시를 두 개로 쓸 것.`);
    });
  }
}

// ── §36) 공개 저장소에 «진짜 열쇠»가 들어오지 않게 (2026-07-28) ────────────────
// 왜: 이 저장소는 PUBLIC 이고 2분마다 도는 자동저장 훅이 `git add -A` 라, 열쇠 파일이 폴더에
//     들어오면 다음 사이클에 그대로 공개된다(2026-07-27 Firebase 키가 실제로 그럴 뻔했다).
//     .gitignore 는 «파일 이름»만 막는다 → 이름을 바꾸거나 코드에 문자열로 박으면 그대로 통과한다.
//     그래서 여기서는 «내용»으로 잡는다. 이름 규칙과 내용 규칙 두 겹.
// 통과시키는 것: anon 키(설계상 공개), 예시·자리표시자.
{
  const SECRET_PATTERNS = [
    [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, "개인키(PEM)"],
    [/"private_key"\s*:\s*"-----BEGIN/, "구글 서비스계정 JSON"],
    [/\bsb_secret_[A-Za-z0-9_-]{10,}/, "Supabase secret 키"],
    [/\bgh[pousr]_[A-Za-z0-9]{20,}/, "GitHub 토큰"],
    [/\bsk-(?:proj-)?[A-Za-z0-9]{20,}/, "OpenAI 키"],
    [/\bAIza[0-9A-Za-z_-]{30,}/, "구글 API 키"],
  ];
  // 저장소가 추적하는 «코드/설정» 파일만 본다(문서·바이너리는 제외 — 오탐만 늘린다).
  const files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((f) => !f.startsWith("docs/") && !/\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|pdf|docx|hwpx|xlsx|pptx|zip)$/i.test(f));
  for (const f of files) {
    let src = "";
    try { src = readFileSync(join(ROOT, f), "utf8"); } catch { continue; }
    if (src.length > 2_000_000) continue;
    for (const [re, label] of SECRET_PATTERNS) {
      // Firebase 클라이언트 설정 파일의 «구글 API 키»만 면제한다 (2026-08-27).
      // 왜: google-services.json / GoogleService-Info.plist 안의 API_KEY 는 설계상 앱 번들에
      //     담겨 배포되는 «식별자»다 — 구글 공식 안내도 이 파일을 앱에 포함하라고 한다.
      //     비밀이 아니므로 여기서 잡으면 영원히 빨간불이고, 그러면 사람이 검사를 꺼 버린다.
      // ⚠️ 면제는 «이 패턴 하나»로 좁힌다. 같은 파일에 PEM 개인키·구글 서비스계정 JSON·
      //     GitHub 토큰·OpenAI 키·Supabase secret 이 들어오면 그대로 잡힌다(실측 확인).
      //     파일을 통째로 빼면 그 구멍으로 진짜 비밀이 들어온다.
      // 🔴 대신 «콘솔»에서 지켜야 한다: 이 키는 노출돼도 되지만 제한이 없으면 남이 그 키로
      //     다른 구글 API 요금을 물릴 수 있다 → 2026-08-27 에 두 키 모두 앱 제한을 걸었다
      //     (Android: 패키지+SHA-1 3개 / iOS: 번들ID). 메모리 google-api-key-app-restrictions.
      if (label === "구글 API 키" && (f.endsWith("google-services.json") || f.endsWith("GoogleService-Info.plist"))) continue;
      if (re.test(src)) {
        errors.push(
          `[열쇠유출] ${f} 에 ${label} 로 보이는 값이 있다 — 이 저장소는 공개다. ` +
            `값을 지우고 .env.local(또는 GitHub Secrets)로 옮긴 뒤, 이미 커밋됐다면 그 열쇠를 «폐기·재발급»하라.`
        );
      }
    }
    // service_role JWT 는 형태가 anon 과 같아서 payload 를 열어야 구분된다.
    for (const m of src.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{20,})\.[A-Za-z0-9_-]{10,}/g)) {
      try {
        const payload = JSON.parse(Buffer.from(m[1], "base64").toString("utf8"));
        if (payload.role && payload.role !== "anon") {
          errors.push(
            `[열쇠유출] ${f} 에 role=${payload.role} 인 Supabase 키가 박혀 있다 — 공개 저장소에 두면 DB 전체가 열린다. ` +
              `즉시 키를 회전(rotate)하고 시크릿으로 옮길 것.`
          );
        }
      } catch { /* JWT 가 아니면 무시 */ }
    }
  }
}

// ── [분석누락] GA4 «조용히 버려지는» 부류 차단 (POSTMORTEMS #145, 2026-07-28) ──
//
// 왜 자동검사인가: 분석(GA4)은 «틀려도 화면이 멀쩡하다». 빌드도 통과하고 404 도 안 나고
// 사용자도 아무 불편이 없다 — 숫자만 조용히 틀린다. 사람 눈으로는 몇 달을 못 잡는 부류라
// 기계가 잡아야 한다. 두 가지를 본다.
{
  const CSP_REQUIRED = [
    ["https://*.google-analytics.com", "GA4 지역 라우팅(region1~N.google-analytics.com) 수집 요청"],
    ["https://*.analytics.google.com", "GA4 일부 구성의 수집 요청"],
  ];
  try {
    const cfg = readFileSync(join(ROOT, "next.config.js"), "utf8");
    // 주석에도 "connect-src" 라는 말이 나오므로 «실제 지시문 줄»만 고른다
    // (문자열 리터럴 시작 = 따옴표 + connect-src). 주석 줄을 잡으면 항상 오탐이 난다.
    const connectLine = cfg
      .split(/\r?\n/)
      .find((l) => /["'`]connect-src\s/.test(l));
    if (!connectLine) {
      errors.push(`[분석누락] next.config.js 에서 CSP connect-src 줄을 못 찾음 — 검사 스크립트 점검 필요`);
    } else {
      for (const [host, why] of CSP_REQUIRED) {
        if (!connectLine.includes(host)) {
          errors.push(
            `[분석누락] CSP connect-src 에 ${host} 가 없다 — ${why}이 브라우저에 차단된다. ` +
              `이 부류는 «데이터 없음»이 아니라 «일부 방문자만 통째로 빠진 숫자»로 보여서 눈으로는 못 잡는다. ` +
              `next.config.js 의 connect-src 에 추가할 것 (POSTMORTEMS #145)`
          );
        }
      }
    }
  } catch (e) {
    errors.push(`[분석누락] next.config.js 읽기 실패: ${e.message}`);
  }

  // GA4 는 이벤트 이름이 한 글자만 달라도 «다른 이벤트»로 조용히 쌓인다(오타를 아무도 안 알려줌).
  // → 이름은 src/lib/ga.ts 의 GA_EVENTS 카탈로그에서만 나오게 강제한다.
  // walk() 는 ROOT 기준 «상대경로»를 돌려준다(읽을 땐 join(ROOT, …) 필요).
  const gaCallers = walk("app").concat(walk("src"))
    .filter((f) => /\.(jsx?|tsx?)$/.test(f) && !/(^|[\\/])archive[\\/]/.test(f));
  for (const file of gaCallers) {
    let src = "";
    try { src = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    // @/lib/ga 의 event() 를 쓰는 파일만 검사 (DOM 이벤트 API 와 헷갈리지 않게)
    if (!/from ["']@\/lib\/ga["']/.test(src)) continue;
    const lines = stripCommentsWholeFile(src).split(/\r?\n/);
    lines.forEach((line, i) => {
      // safeEvent("...") / event("...") 처럼 이름을 문자열로 직접 타이핑한 경우
      const m = line.match(/\b(?:safeEvent|event)\(\s*["'`]([a-z0-9_]+)["'`]/i);
      if (m) {
        const rel = file.replace(/\\/g, "/");
        errors.push(
          `[분석누락] ${rel}:${i + 1} — GA 이벤트 이름 "${m[1]}" 을 문자열로 직접 씀. ` +
            `오타가 나면 GA4 가 «다른 이벤트»로 조용히 쌓아서 아무도 모른다. ` +
            `src/lib/ga.ts 의 GA_EVENTS 에 추가하고 상수로 부를 것 (POSTMORTEMS #145)\n    ${line.trim().slice(0, 120)}`
        );
      }
    });
  }
}

// ── [분석누락] 상태 갱신 함수 «안»에서 GA 를 쏘면 숫자가 2배가 된다 (POSTMORTEMS #147) ──
//
// 리액트는 `setX(prev => ...)` 의 갱신 함수를 «순수 함수»로 보고 **여러 번 부를 수 있다**
// (개발 모드는 항상 2번, 실서비스도 렌더 재시도 시 재호출 가능). 그 안에서 GA 를 쏘면
// 이벤트가 조용히 중복 발화된다 — 화면은 멀쩡하고 숫자만 틀리는, 이 문서 전체가 경계하는 부류다.
{
  const gaFiles = walk("app").concat(walk("src"))
    .filter((f) => /\.(jsx?|tsx?)$/.test(f) && !/(^|[\\/])archive[\\/]/.test(f));
  for (const file of gaFiles) {
    let src = "";
    try { src = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    if (!/from ["']@?[./\w]*lib\/ga["']/.test(src)) continue;
    const lines = stripCommentsWholeFile(src).split(/\r?\n/);

    // set*( (prev) => { … } ) 블록의 중괄호 깊이를 세어 «안쪽»인지 판정한다.
    let depth = 0;      // 갱신 함수 본문 안이면 > 0
    let brace = 0;      // 그 본문의 중괄호 균형
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (depth === 0 && /\bset[A-Z]\w*\(\s*\(?\s*\w*\s*\)?\s*=>\s*\{/.test(line)) {
        depth = 1; brace = 0;
      }
      if (depth > 0) {
        for (const ch of line) { if (ch === "{") brace++; else if (ch === "}") brace--; }
        // GA 발화가 이 안에 있으면 중복 위험
        if (/\b(ga|safeEvent|gaEvent|event)\(\s*GA_EVENTS\./.test(line)) {
          errors.push(
            `[분석누락] ${file.replace(/\\/g, "/")}:${i + 1} — 상태 갱신 함수(set…(prev => …)) «안»에서 GA 이벤트를 쏜다. ` +
              `리액트는 이 함수를 여러 번 부를 수 있어 **숫자가 조용히 2배**가 된다(화면은 멀쩡함). ` +
              `발화를 갱신 함수 «밖»으로 빼라 (POSTMORTEMS #147)\n    ${line.trim().slice(0, 120)}`
          );
        }
        if (brace <= 0) depth = 0;
      }
    }
  }
}

// ── [출처유실] 리다이렉트가 «주소 뒤 꼬리표»를 버리면 광고 출처가 증발한다 (2026-07-28 실측) ──
//
// permanentRedirect("/inquiry") 처럼 경로를 문자열로 새로 쓰면 들어올 때 붙어 있던
// ?utm_source=… 이 조용히 사라진다. 옛 주소(명함·QR·예전 광고 소재·검색결과에 남은 링크)로
// 들어온 광고 클릭이 «어느 광고에서 왔는지» 영영 안 잡힌다 — 화면은 멀쩡히 뜨고 사용자
// 불편도 0이라 «성과가 안 나오네»로만 보이는, 가장 비싼 종류의 조용한 실패.
// → 공개 화면의 리다이렉트는 반드시 withQuery() 를 거치게 강제한다.
{
  const publicRedirectFiles = walk("app")
    .filter((f) => /page\.(jsx?|tsx?)$/.test(f) && !/(^|[\\/])archive[\\/]/.test(f))
    // 직원 전용 화면은 광고가 닿지 않는다 → 대상 밖(오탐만 늘린다).
    .filter((f) => !/^app[\\/](admin|coordinator|hospital|agency|clinic|patient|api)[\\/]/.test(f));
  for (const file of publicRedirectFiles) {
    let src = "";
    try { src = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    const lines = stripCommentsWholeFile(src).split(/\r?\n/);
    lines.forEach((line, i) => {
      // permanentRedirect("/…") / redirect("/…") 처럼 «리터럴 경로»로 보내는 경우
      const m = line.match(/\b(permanentRedirect|redirect)\(\s*["'`](\/[^"'`?]*)["'`]\s*\)/);
      if (m) {
        errors.push(
          `[출처유실] ${file.replace(/\\/g, "/")}:${i + 1} — 공개 화면이 «${m[2]}» 로 보내면서 ` +
            `주소 뒤 꼬리표(?utm_source=… 등)를 버린다. 옛 주소로 들어온 광고 클릭의 출처가 ` +
            `조용히 증발한다(화면은 멀쩡해서 안 보임). ` +
            `withQuery("${m[2]}", await searchParams) 로 감쌀 것 — src/lib/url/withQuery.ts\n    ${line.trim().slice(0, 120)}`
        );
      }
    });
  }
}

// ── [빈라벨] 사전 «키»를 들고 있는데 «값» 필드로 읽으면 글자가 통째로 사라진다 (2026-07-29 실측) ──
//
// 실제 사고: 환자 하단 탭이 예전엔 { ko:'홈', en:'Home' } 같은 «값»을 직접 들고 있었는데
// 중앙 사전으로 옮기며 { labelKey: 'patientLayout.tab.home' } 로 바뀌었다. 그런데 읽는 쪽은
// 그대로 tab.label 이라 **항상 undefined → 빈 문자열**. 탭 이름이 6개 언어 전부 빈칸으로
// 나갔는데 빌드·타입검사(strict:false)·린트·테스트가 전부 초록이라 아무도 못 잡았다.
//
// 판정(좁게 — 오탐을 안 내려고 «그 배열»까지 특정한다):
//   ① `const NAME = [ … ]` 배열 리터럴의 원소가 `labelKey:` 는 갖고 `label:` 은 «안» 갖는다
//   ② 같은 파일에서 `NAME.map(x => …)` 로 돌린다
//   ③ 그 콜백 인자로 `x.label` 을 읽는다  → 있지도 않은 필드다.
// DB·매퍼에서 온 값(item.desc 처럼 mapTreatmentRow 가 실제로 채워주는 것)은 배열 리터럴이
// 아니므로 걸리지 않는다 — 처음 만든 넓은 규칙이 이걸로 오탐 2건을 냈어서 좁혔다.
{
  const KEY_BASES = ["label", "title", "name", "desc"];
  const files = walk("app").concat(walk("src"))
    .filter((f) => /\.(jsx?|tsx?)$/.test(f) && !/(^|[\\/])archive[\\/]/.test(f));
  for (const file of files) {
    let raw = "";
    try { raw = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    // 주석·문자열은 판정에서 뺀다 — 'intakeForm.fields.x.label' 같은 «사전 키 문자열»이
    // 코드의 .label 읽기로 오인되면 오탐만 쌓인다.
    const code = stripCommentsWholeFile(raw)
      .replace(/`(?:[^`\\]|\\.)*`/g, "``")
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    const lines = code.split(/\r?\n/);

    for (const base of KEY_BASES) {
      // ① 사전 키만 들고 있는 배열 리터럴 찾기
      const suspectArrays = [];
      const arrRe = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]*?)\]\s*;/g;
      let am;
      while ((am = arrRe.exec(code))) {
        const [, name, body] = am;
        if (!new RegExp(`\\b${base}Key\\s*:`).test(body)) continue;
        if (new RegExp(`\\b${base}\\s*:`).test(body)) continue; // 값도 같이 들고 있으면 정상
        suspectArrays.push(name);
      }
      if (!suspectArrays.length) continue;

      // ② 그 배열을 도는 콜백 인자 이름 모으기
      const params = new Set();
      for (const name of suspectArrays) {
        const mapRe = new RegExp(`\\b${name}\\s*\\.\\s*(?:map|forEach|filter|find|some|every)\\s*\\(\\s*\\(?\\s*([A-Za-z_$][\\w$]*)`, "g");
        let mm;
        while ((mm = mapRe.exec(code))) params.add(mm[1]);
      }
      if (!params.size) continue;

      // ③ 그 인자로 «값» 필드를 읽는 줄
      const read = new RegExp(`\\b(${[...params].join("|")})\\.${base}\\b(?!Key)`);
      lines.forEach((line, i) => {
        if (!read.test(line)) return;
        errors.push(
          `[빈라벨] ${file.replace(/\\/g, "/")}:${i + 1} — «${suspectArrays.join(", ")}» 는 사전 키(${base}Key)만 들고 있는데 ` +
            `코드가 «.${base}»(값)를 읽는다 → 항상 undefined → **화면에 빈 문자열**이 나간다. ` +
            `t(x.${base}Key, lang) 처럼 «키로 사전을 조회»하도록 고쳐라. ` +
            `⚠️ 이 부류는 빌드·타입검사·린트·테스트가 전부 초록이라 눈으로만 보인다 (2026-07-29 환자 탭 사고)\n    ${line.trim().slice(0, 120)}`
        );
      });
    }
  }
}

// ── [움직임줄이기] 어지럼·구역이 있는 환자를 위한 「움직임 줄이기」가 살아있는가 ──────
// 왜 (2026-08-04 실측): 움직임을 쓰는 파일 156개 중 사용자의 «움직임 줄이기» 설정을 존중하는
//   건 2개뿐이었다. 항암 중 구역·어지럼은 우리 환자에게 예외가 아니라 기본값에 가깝다.
//   지금은 src/index.css 한 블록이 CSS 움직임 전부를 덮는다 → **파일별 검사가 필요 없다.**
//   그래서 이 가드는 딱 두 가지만 본다(정직하게 = 이게 전부다):
//     ① 그 전역 블록이 아직 있는가 (리팩터·파일 교체로 조용히 사라지는 것 차단)
//     ② CSS 로 «못 끄는» 부류가 새로 들어오는가 — `behavior: "smooth"` 를 손으로 박는 것.
//        옵션으로 «부드럽게»를 넣으면 CSS 의 scroll-behavior:auto 가 이기지 못한다.
//        → scrollBehavior() (src/lib/a11y/prefersReducedMotion.js) 를 쓰라고 잡는다.
// 만들기 전 3문답(CLAUDE.md 규칙 7):
//   ①검출 조건: 문자열 존재 여부 — 기계적으로 명확 ✅
//   ②덮는 범위: CSS 움직임은 전역 블록이 100%, 이 가드는 «그 블록이 사라지는» 회귀 + JS 부류 신규 유입
//   ③회피 유인: 없음(대체 API 가 더 짧다)
// 못 잡는 것: requestAnimationFrame 으로 손수 그리는 움직임, 라이브러리 내부 애니메이션.
//   그건 코드리뷰 몫이다.
{
  const CSS_FILE = "src/index.css";
  let css = "";
  try { css = readFileSync(join(ROOT, CSS_FILE), "utf8"); } catch { css = ""; }
  if (!/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/.test(css) || !/animation-duration/.test(css)) {
    errors.push(
      `[움직임줄이기] ${CSS_FILE} 에 전역 «움직임 줄이기» 블록이 없다. ` +
        `@media (prefers-reduced-motion: reduce) 안에서 animation-duration/transition-duration 을 죽이는 블록이 사라지면 ` +
        `156개 파일의 움직임이 «줄이기를 켠 사용자»에게 그대로 재생된다(어지럼·구역). 지우지 말고 되살려라.`
    );
  }

  // 헬퍼 자신은 "smooth" 를 «돌려주는» 쪽이라 유일한 예외다. 파일 경로로만 뺀다.
  //   ⚠️ 2026-08-04 독립 리뷰 지적으로 고침: 원래는 «파일 안에 prefersReducedMotion 이라는
  //   글자가 있으면 그 파일 전체를 건너뛰기» 였다. 그러면 이번에 고친 5개 파일이 **영구 면제**가
  //   되어, 같은 파일에 나중에 behavior:"smooth" 를 새로 박아도 검사가 통과한다.
  //   → 파일 단위가 아니라 «줄 단위»로 본다.
  const HELPER_FILE = "src/lib/a11y/prefersReducedMotion.js";
  const files = walk("app").concat(walk("src"))
    .filter((f) => /\.(jsx?|tsx?)$/.test(f) && !/(^|[\\/])archive[\\/]/.test(f));
  for (const file of files) {
    const rel = file.replace(/\\/g, "/");
    if (rel === HELPER_FILE) continue;
    let raw = "";
    try { raw = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    raw.split(/\r?\n/).forEach((l, i) => {
      if (!/behavior\s*:\s*["']smooth["']/.test(l)) return;
      errors.push(
        `[움직임줄이기] ${rel}:${i + 1} — behavior:"smooth" 를 손으로 박았다. ` +
          `이건 CSS 의 prefers-reduced-motion 이 «못 끄는» 부류다(옵션이 이긴다). ` +
          `scrollBehavior() from "@/lib/a11y/prefersReducedMotion" 로 바꿔라 — 줄이기를 켠 사용자에겐 "auto" 를 준다.` +
          `\n    ${l.trim().slice(0, 120)}`
      );
    });
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
