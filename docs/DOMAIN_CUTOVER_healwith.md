# 도메인 전환 체크리스트 — healwith.co.kr

> 서비스명 healwith 확정 + 도메인 `healwith.co.kr` 등록 예정(후이즈).
> **순서 중요**: 도메인이 Vercel에 "연결·검증 완료"된 다음에 코드/ENV를 바꾼다.
> (먼저 바꾸면 죽은 주소가 canonical로 나가 SEO 손해)

## 0. 사전 상태 (이미 됨)
- `sitemap.js`·`robots.js`·`layout.jsx` 는 `NEXT_PUBLIC_SITE_URL` 단일 스위치로 동작. (미설정 시 `khidi.healo.kr` 폴백 — localhost 유출 없음)
- 하드코딩된 `khidi.healo.kr` (구조화데이터 JSON-LD) 16곳은 **§3 명령어로 일괄 치환** 예정.

## 1. 후이즈에서 도메인 등록 (행정)
- `healwith.co.kr` 결제 (호스팅·메일 옵션 빼고 도메인만). 갱신비 확인.
- (선택) KIPRIS에서 "healwith"/"헬위드" 상표 충돌 확인 후 Madrid 출원 판단.

## 2. Vercel 도메인 연결
1. Vercel → 프로젝트 `healo-khidi` → Settings → Domains → `healwith.co.kr` (+`www`) 추가.
2. Vercel이 안내하는 DNS 레코드를 **후이즈 DNS 관리**에 입력:
   - 루트(`healwith.co.kr`): A 레코드 `76.76.21.21` (또는 Vercel 안내 ALIAS/ANAME)
   - `www`: CNAME → `cname.vercel-dns.com`
   - (또는 네임서버를 Vercel로 위임)
3. Vercel에서 "Valid Configuration"·SSL 발급 확인 (수분~수시간).
4. 프로덕션 도메인을 `healwith.co.kr`로 지정(Primary).

## 3. 코드/ENV 전환 (도메인 검증 완료 후)
1. **Vercel 환경변수**: `NEXT_PUBLIC_SITE_URL = https://healwith.co.kr` (Production·Preview 둘 다) → 재배포.
   → sitemap·robots·canonical·OG 전부 자동 반영.
2. **하드코딩 URL 일괄 치환** (작업 브랜치에서):
   ```bash
   grep -rl "khidi.healo.kr" app --include=*.jsx --include=*.js \
     | xargs perl -i -pe 's{https://khidi\.healo\.kr}{https://healwith.co.kr}g'
   ```
   대상: 구조화데이터 JSON-LD (`app/page.jsx`, `hospitals/immune`, `ru/`, `kk/`, `specialties/*`).
   ※ `sitemap.js`·`robots.js`·`layout.jsx` 폴백도 같이 바뀜(무방 — 이미 env 우선).
3. **푸터 연락 이메일**: `src/lib/siteSettings.js` `legal.contactEmail` `contact@healo.com` → `contact@healwith.co.kr` (메일박스 먼저 개설).
4. **이메일 발신**: Vercel `HEALO_EMAIL_FROM` 발신자명/도메인 점검 + **Resend 도메인 인증**(healwith.co.kr).
5. 빌드(`npx next build --webpack`) → 프리뷰 확인 → 머지.

## 4. 전환 후 검증
- `https://healwith.co.kr/sitemap.xml` → loc 가 healwith.co.kr 인지 (localhost·khidi 아님).
- `https://healwith.co.kr/opengraph-image` → 200/PNG.
- 카톡·텔레그램에 링크 붙여 OG 미리보기 확인.
- **Google Search Console** + **Yandex Webmaster** 에 새 도메인 등록·sitemap 제출 + 인증코드 `layout.jsx` verification 에 입력.
- 구 도메인(`khidi.healo.kr`) 유지 시 301 리다이렉트 → healwith.co.kr (SEO 자산 이전).

## 5. 남은 브랜드 자산 (도메인과 별개)
- PNG 앱아이콘(`public/icons/*`, apple-touch-icon, favicon-16/32) 옛 `H` → 새 svg 기준 재생성.
