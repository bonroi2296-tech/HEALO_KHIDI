"use client";

// 2026-09-07 리뉴얼 7단계: 어드민 AI 채팅 화면(660줄)을 코디 화면 재수출로 바꿨다.
// 두 화면이 «API 만 공유하고 화면은 따로»(형태③)라 검수 단추는 어드민에만, 6개 언어는 코디에만 있었다.
// 이제 한 화면 — 관리자면 검수·정정 단추가 보인다(usePortalContext.isAdmin, API 는 requireAdminAuth).
export { default } from "../../coordinator/chat/page";
