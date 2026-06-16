# 🗄️ archive — 수납함

여기는 **지금은 안 쓰지만 나중에 참고/복구할 수 있게 보관**하는 곳이야. **삭제가 아님.**

## dead-code/
사이트에서 더 이상 쓰지 않는 옛 컴포넌트들. 라우팅·빌드에 안 잡히게 `app/` 밖으로 빼서 보관.
- `app/inquiry/` — 구 문의 컴포넌트(InquiryClient/FormB/Wrapper). 현재는 `app/inquiry/_components/UnifiedInquiryFunnel.jsx`가 실사용.
- `app/intake/` — 구 인테이크(IntakeLegacy/Premium). 현재 `/intake`는 `/inquiry`로 리디렉트.
- `app/consult/start/` — 구 상담시작 래퍼.

## 복구하려면
필요한 파일을 원래 위치로 다시 옮기면 됨 (`git mv archive/dead-code/app/... app/...`).
git 히스토리에도 전부 남아있어서 영구 보존됨.

> 빌드/타입검사 제외 설정됨 (`tsconfig.json` exclude, `eslint.config.js` ignores).
