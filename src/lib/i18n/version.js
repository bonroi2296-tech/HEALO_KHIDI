// `/i18n/<lang>.js` 주소에 붙일 판본 문자열.
//
// 사전은 배포할 때만 바뀐다 → 배포 식별자를 그대로 쓰면 «사전이 바뀌면 주소가 바뀐다»가 성립하고,
// 그 덕에 스크립트를 1년 immutable 로 캐시해도 낡은 문구가 박제되지 않는다.
// (next/image 가 `?dpl=` 로 하는 것과 같은 방식.)
export const I18N_VERSION =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  "dev";
