// 코디네이터 사후관리·만족도 화면 — 어드민 만족도 대시보드와 동일 화면 재사용(2026-07-15).
// KHIDI 성과지표(사후관리 120·만족도 90)는 코디 업무인데 그동안 어드민에만 있었음.
// API(/api/admin/khidi/satisfaction)는 requirePortalAuth(staffOnly)로 admin+coordinator 허용.
export { default } from "../../admin/khidi/satisfaction/page";
