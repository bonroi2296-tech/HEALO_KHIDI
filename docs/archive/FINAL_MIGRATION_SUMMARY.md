# 최종 마이그레이션 요약

## 마이그레이션 범위
- Vite + React(SPA)에서 Next.js App Router 기반으로 전환했습니다.
- 주요 공개 페이지를 Server Component로 구성해 SEO와 초기 로딩을 개선했습니다.
- 기존 문의(/inquiry) 흐름은 Client Component 래퍼를 통해 그대로 유지했습니다.

## 의존성 변경
- 추가: `next`
- React 버전: `react` / `react-dom`을 `18.2.0`으로 고정
- 제거: `react-helmet-async`, `react-router-dom`, `vite`, `@vitejs/plugin-react`

## 실행 방법
- 개발 서버: `npm run dev`
- 빌드: `npm run build`
- 프로덕션 실행: `npm run start`

## 남은 TODO / 리스크
- Google Maps 키는 Next 환경에서 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`를 사용해야 합니다.
- 기존 SPA 전용 파일을 제거했으므로 Vite 기반 개발로 되돌릴 수 없습니다.
- 문의(/inquiry)와 관리자(/admin) 페이지는 Client Component로 유지됩니다.
