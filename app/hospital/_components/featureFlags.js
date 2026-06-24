// 병원 포털 기능 플래그.
// 공개 프론트(/hospitals·/treatments)가 병원 자가입력 콘텐츠를 노출할 준비가 되면 true 로.
// 그 전까진 "병원 정보"·"시술 카탈로그" 메뉴를 숨기고 직접 URL 접근도 대시보드로 돌린다.
// PO 결정 2026-06-24: 프론트 미연동 → 비활성. (코드는 보존, 재활성 = 이 값만 true)
export const HOSPITAL_CONTENT_ENABLED = false;
