# 도메인 전환 체크리스트 — healwith.co.kr

> ## ✅ 완료 (2026-06-22 컷오버). 아래 1~4단계는 **끝난 일의 기록**이지 할 일 목록이 아니다.
> | 항목 | 실측값 | 잰 날 |
> |---|---|---|
> | 등록일 | **2026-06-18** | 2026-08-19 (국가 등록기관 KISA 조회) |
> | 만기일 | **2027-06-18** (갱신 필요) | 〃 |
> | 등록대행사 | **가비아**(Gabia) — ns.gabia.co.kr | 〃 |
> | 소유자 | 강주영 / roiimmunelab@naver.com | 〃 |
> | 루트 A 레코드 | 216.198.79.1 | 2026-08-19 (구글 DNS 조회) |
> | sitemap 출력 주소 | `https://healwith.co.kr/...` | 2026-08-19 (실제 호출) |
>
> ⚠️ **「후이즈에서 등록」이라고 적혀 있던 건 계획 단계의 오기 — 실제 구입처는 가비아다**(2026-08-19 정정).
> 「후이즈(whois)」는 등록정보 조회 서비스 이름이기도 해서 혼동하기 쉽다.
>
> 옛 `khidi.healo.kr`은 살아있던 적이 없는 죽은 주소 → 301 되돌림(리다이렉트) 불필요(이전할 검색 자산 0).
> 코드에 남은 `khidi.healo.kr`은 번역 API 허용목록 2곳뿐 — **의도적 유지**(지우지 마라).

---

## 이하 = 당시 계획 원문 (기록용)

> 서비스명 healwith 확정 + 도메인 `healwith.co.kr` 등록 예정(가비아).
> **순서 중요**: 도메인이 Vercel에 "연결·검증 완료"된 다음에 코드/ENV를 바꾼다.
> (먼저 바꾸면 죽은 주소가 canonical로 나가 SEO 손해)

## 0. 사전 상태 (이미 됨)
- `sitemap.js`·`robots.js`·`layout.jsx` 는 `NEXT_PUBLIC_SITE_URL` 단일 스위치로 동작. (미설정 시 폴백 — localhost 유출 없음)
- 하드코딩된 `khidi.healo.kr` (구조화데이터 JSON-LD) 16곳은 **§3 명령어로 일괄 치환** 예정.

## 1. 가비아에서 도메인 등록 (행정) ✅
- `healwith.co.kr` 결제 (호스팅·메일 옵션 빼고 도메인만). 갱신비 확인.
- (선택) KIPRIS에서 "healwith"/"헬위드" 상표 충돌 확인 후 Madrid 출원 판단. ← **아직 안 함**

## 2. Vercel 도메인 연결 ✅
1. Vercel → 프로젝트 `healo-khidi` → Settings → Domains → `healwith.co.kr` (+`www`) 추가.
2. Vercel이 안내하는 DNS 레코드를 **가비아 DNS 관리**에 입력:
   - 루트(`healwith.co.kr`): A 레코드 (실제 들어간 값 = `216.198.79.1`)
   - `www`: CNAME → `cname.vercel-dns.com`
   - 네임서버는 가비아 유지(`ns.gabia.co.kr`) — Vercel로 위임하지 않음.
3. Vercel에서 "Valid Configuration"·SSL 발급 확인 (수분~수시간).
4. 프로덕션 도메인을 `healwith.co.kr`로 지정(Primary).

## 3. 코드/ENV 전환 (도메인 검증 완료 후) ✅
1. **Vercel 환경변수**: `NEXT_PUBLIC_SITE_URL = https://healwith.co.kr` → 재배포.
   ※ 실제로는 **미설정이어도 코드 폴백이 healwith라 정상 동작 중**.
2. **하드코딩 URL 일괄 치환** — 완료(합치기 신청서 #226). 구조화데이터·canonical·OG 전부 새 주소.
3. ~~푸터 연락 이메일 `contact@healo.com` 교체~~ → **해당 없음**: `siteSettings.js`가 개편되며 그 항목 자체가 사라졌고, 화면에 노출되는 `healo.com` 주소는 0건(2026-08-19 확인. 남은 건 시험 코드 속 가짜 계정뿐).
4. **이메일 발신**: Resend 도메인 인증(healwith.co.kr) — 완료(2026-07-01 DNS 확인).
5. 빌드(`npx next build --webpack`) → 확인 → 본판에 합침.

## 4. 전환 후 검증 ✅
- `https://healwith.co.kr/sitemap.xml` → loc 가 healwith.co.kr ✅ (2026-08-19 재확인)
- `https://healwith.co.kr/opengraph-image` → 200/PNG ✅
- 구글 서치콘솔·얀덱스 웹마스터·네이버 서치어드바이저 소유확인 + sitemap 제출 ✅
- ~~구 도메인 301 되돌림~~ → 불필요(위 배너 참조).

## 5. 남은 브랜드 자산 (도메인과 별개)
- PNG 앱아이콘(`public/icons/*`, apple-touch-icon, favicon-16/32) 옛 `H` → 새 svg 기준 재생성.
