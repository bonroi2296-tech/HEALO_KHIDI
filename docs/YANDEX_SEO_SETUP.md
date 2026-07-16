# Yandex SEO 설정 가이드

**러시아** 사용자 유입을 위한 Yandex 검색엔진 최적화 설정 가이드.

> ⚠️ **범위 주의 — "카자흐=얀덱스"는 틀린 상식이다(2026-07-16 정정).** 리서치 결과 **카자흐스탄은 Google 약 70% / Yandex 약 28%** → **카자흐 노출은 구글에서 푼다.** Yandex가 주력인 곳은 **러시아**(66~73%). 이 문서는 러시아용으로 읽을 것. (채널 SoR: `docs/GROWTH_PLAN.md` §C · `docs/marketing/paid-ads-plan.md`)
>
> ✅ **등록 상태: 이미 완료** — 2026-06-22 도메인 컷오버 때 Yandex Webmaster 소유권 인증 + sitemap 제출 끝(구글·네이버도 함께). 아래 절차는 **재설정용 참고**이지 지금 해야 할 일이 아니다. 새 페이지를 빨리 넣고 싶으면 `Индексирование → Переобход страниц`(재크롤 요청)만 누르면 된다.
>
> ⚠️ 아래 본문의 도메인 예시는 옛 `khidi.healo.kr` — 실도메인은 **`healwith.co.kr`** 로 읽을 것.

---

## 1. Yandex Webmaster 계정 등록

### 1-1. 계정 생성
1. https://webmaster.yandex.com 접속
2. 오른쪽 상단 "Войти(로그인)" 클릭 → Yandex ID로 로그인 (없으면 회원가입)
3. 러시아 전화번호 없이 가입 가능 (이메일만으로 가능하나 제한 있음)

### 1-2. 사이트 추가
1. 로그인 후 "Добавить сайт(사이트 추가)" 클릭
2. `https://khidi.healo.kr` 입력 후 "Добавить" 클릭

### 1-3. 소유권 검증 (HTML 메타 태그 방식)
1. 검증 방법 중 "Метатег" 선택
2. 발급된 코드 (예: `a1b2c3d4e5f6g7h8`) 복사
3. `app/layout.jsx` 의 `verification.yandex` 값 교체:
   ```js
   verification: {
     yandex: "a1b2c3d4e5f6g7h8",  // ← 여기에 붙여넣기
   },
   ```
4. 코드 배포 후 Yandex Webmaster에서 "Проверить(검증)" 클릭
5. "Сайт подтверждён(검증 완료)" 메시지 확인

---

## 2. Sitemap 제출

검증 완료 후:
1. Yandex Webmaster 좌측 메뉴 → "Индексирование(색인)" → "Файлы Sitemap(사이트맵 파일)"
2. "Добавить файл Sitemap" 클릭
3. 입력: `https://khidi.healo.kr/sitemap.xml`
4. "Добавить" 클릭

재제출이 필요할 때는 같은 URL을 다시 등록.

---

## 3. 색인 요청 (우선 크롤링)

신규 페이지 (특히 러시아어·카자흐어 랜딩):
1. Yandex Webmaster → "Индексирование" → "Переобход страниц(페이지 재크롤)"
2. 아래 URL을 순서대로 제출:
   - `https://khidi.healo.kr/ru/for-russian-patients`
   - `https://khidi.healo.kr/kk/for-kazakh-patients`
   - `https://khidi.healo.kr/hospitals/immune`

---

## 4. Yandex Direct (러시아 유료 광고)

### 4-1. 계정 생성
1. https://direct.yandex.com 접속
2. Yandex ID로 로그인 (Webmaster와 동일 계정 사용 가능)
3. 국가: "Россия" 또는 "Казахстан" 선택 → 화폐 단위 설정

### 4-2. 캠페인 기초 세팅
- **캠페인 유형**: "Текстово-графические объявления(텍스트·그래픽 광고)"
- **지역**: Казахстан, Россия, Кыргызстан 선택
- **주요 키워드**:
  - лечение рака в Корее
  - медицинский туризм Корея
  - онкология Южная Корея
  - иммунотерапия Корея
  - лечение рака за рубежом
  - Кореядағы рак емдеу (카자흐어)
- **랜딩 URL**: `https://khidi.healo.kr/ru/for-russian-patients`

### 4-3. 예산 가이드
- 최소 일 예산: ₽500–1,000 (약 $5–10)
- 카자흐스탄 캠페인: 별도로 통화 KZT 선택하여 분리 운영 권장

---

## 5. 속도 최적화 현황 (Yandex Core Web Vitals)

### next/font 현황
- 현재 `next/font` 미사용 — CDN (cdn.jsdelivr.net) 방식으로 Pretendard 폰트 로드 중
- Yandex는 페이지 속도를 중요 신호로 사용
- **권장 사항**: `app/layout.jsx` 에서 CDN 대신 `next/font/local`로 Pretendard 전환 시 LCP 개선 가능
  ```js
  // 예시 (직접 변환은 별도 작업):
  import localFont from 'next/font/local';
  const pretendard = localFont({ src: './fonts/PretendardVariable.woff2' });
  ```
- 실제 변환은 별도 PR로 진행 (현 작업 범위 외)

### next/image 현황
- `app/search/SearchResultsClient.jsx` 에서 `next/image` 사용 중 (정상)
- 대형 이미지 자동 최적화 활성화 상태

---

## 6. 검증 코드 교체 위치 요약

```
app/layout.jsx
  verification: {
    yandex: "REPLACE_WITH_YANDEX_WEBMASTER_CODE",  ← 이 값 교체
  },
```

---

## 7. 작업된 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `app/layout.jsx` | yandex verification, geo 메타태그 추가 |
| `app/robots.js` | Yandex, YandexImages, YandexVideo 봇 명시적 허용 |
| `app/sitemap.js` | hreflang alternates 추가, ru/kk 랜딩 URL 포함 |
| `app/hospitals/immune/page.jsx` | Cyrillic alternateName, availableLanguage, areaServed, geo 좌표 추가 |
| `app/ru/for-russian-patients/page.jsx` | 러시아어 의료관광 랜딩 신설 |
| `app/kk/for-kazakh-patients/page.jsx` | 카자흐어 의료관광 랜딩 신설 |
