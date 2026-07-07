# /insurance 롤백 절차 — Madanes/МСР가 거부할 경우

> **작성 2026-07-07.** PO 결정: 서면허가 전 머지하되, 거부 시 즉시 되돌릴 수 있게 기록(PR #668).
> 거부 범위에 따라 A안(브랜드만 제거) 또는 B안(전체 원복)을 고른다. **오래 방치하면 다른 커밋과 충돌 위험 — 걔들 응답 오면 바로 실행.**

## A안 — Madanes/МСР 흔적만 제거 (페이지·탭은 유지)

"로고·이름을 빼달라"는 수준의 거부일 때. 페이지는 살리고 걔들 브랜드만 걷어낸다.

> (2026-07-07 갱신: 대리석 아트 2장(justice·partners.jpg)은 PO 지시로 이미 제거됨 — Unsplash 사진으로 교체. 남은 Madanes 노출 = 로고 2종 + МСР 상품 카드 + disclaimer 사명.)

1. `app/insurance/InsuranceClient.jsx`
   - B2B 섹션: 로고 `<Image>` 2개(managedcare-ru-logo, madanes-global-logo) 제거
   - 상품 카드: `{i === 2 && (<Image ... managedcare-ru-logo ... />)}` 제거
   - 3번째 상품 카드(МСР) 자체를 뺄 경우: `c.products.items.map` → `c.products.items.slice(0, 2).map`
2. `public/images/insurance/` 에서 삭제: `managedcare-ru-logo.png`, `madanes-global-logo.png` (hero-consult·policy-review·partnership.jpg는 Unsplash — 유지)
3. `app/insurance/copy.js` — 6개 언어 각각 `disclaimer.body`의 "ManagedCare Russia" 사명 제거(카드를 뺐다면 함께). 카드 유지 시엔 그대로.
4. `npm run check:content` + `npx next build --webpack` → PR → 머지.

## B안 — 전체 원복 (보험 가이드 탭 폐기, 암 치료 가이드 복귀)

"협력 안 한다" 수준일 때. PR #668 스쿼시 머지 커밋 하나만 되돌리면 끝.

```bash
git checkout -b work/rollback-insurance origin/main
git log --oneline --grep="#668" -3   # PR #668 스쿼시 머지 커밋 SHA 확인
git revert <그 SHA>                   # 충돌 없으면 한 방
npx next build --webpack && npm run check:content
git push -u origin work/rollback-insurance   # → PR → 머지
```

되돌아오는 것: 헤더 "암 치료 가이드"(`nav.education`) 탭, sitemap의 /education 항목. /insurance 는 404가 되고 sitemap에서 빠짐(색인은 수일 내 자동 소멸— 서치콘솔에서 제거 요청하면 더 빠름).

## 참고

- `/education` 라우트·환자앱은 이 기능과 무관하게 계속 살아 있음(머지가 건드린 건 헤더 탭·sitemap 노출뿐).
- i18n `nav.insurance` 키는 B안 revert에 포함돼 같이 사라짐 — 별도 정리 불필요.
- 수집 원본 자료·이미지는 `docs/marketing/madanes-insurance/assets/` 보관(코드와 무관, 롤백 대상 아님).
