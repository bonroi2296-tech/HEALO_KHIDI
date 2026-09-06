# 주요 라우트 · 주요 시스템 (지형도)

> **트리거:** 라우트·페이지·URL 구조·어드민 메뉴·회원관리·원격협진·화면 위치 찾기
> **원래 위치:** `CLAUDE.md` 「프로젝트 개요」의 라우트·시스템 부분 (2026-07-28 이관 — 내용 변경 없음)
> **`CLAUDE.md` 에 남은 것:** 한 줄 소개 + 기술 스택

---

**주요 라우트:** (2026-05 피벗·통합 반영)
- `/` 홈
- `/inquiry` **통합 문의 퍼널** — 진입 시 AI Agent / Human Agent / Inquiry Form 선택. `/intake`·`/consult/start`는 여기로 redirect (통폐합 완료). Human Agent = WhatsApp·Telegram·WeChat·LINE 4채널.
  - `/inquiry/referral` **환자 의뢰서** (2026-08 전면 개편, Inquiry Form 이 여기로) — 갈림길(「상담만 6칸」/「전체 20칸」) → 문턱 «둘»(접수 6칸만 막고 나머지는 진행률). 자료 먼저 올리면 AI 판독으로 칸 자동채움. 칸 정의 SoR `src/lib/inquiry/referralSchema.js` · 문구는 사전 `referral.*`(코디 편집기로 수정) · 접수 API `app/api/inquiries/referral` · 코디 화면 「의뢰서」 카드 `app/coordinator/inbox/[id]/ReferralSection.jsx` · 설계 `docs/design/INQUIRY_FORM_REDESIGN.md`.
- `/care-journey` 치료 여정 안내 (정적, 6개 언어)
- `/telemedicine` 원격협진 (헤더 전면 배치, NEW)
- `/hospitals` `/treatments` 목록 | `/treatments/[slug]` 암종 상세(비암종 slug = 한방 프로그램 상세, 한방 특화 페이지에서 링크 — 잔재 아님 2026-07-14 확인) | `/search` **비활성**(옛 프로젝트 잔재, `/hospitals` 리다이렉트, 코드 보존 2026-07-14)
- `/consultation/[id]` **LiveKit 영상 상담방** (게스트 초대 링크로 계정 없이 입장)
- `/patient/*` 환자 | `/admin/*` 어드민 | `/coordinator/*` 코디네이터 | `/hospital/*` 국내병원(구 `/partner`, 리다이렉트) | `/agency` 해외 에이전시 · `/clinic` 해외 의료기관 | `/doctor` 비활성화(상담방 초대링크 참여)
- `/stories` 후기 — **비활성화**(홈 리다이렉트, 코드는 보존)

**주요 시스템:**
- **원격협진(LiveKit)**: 코디가 `/coordinator/consultations`(어드민은 `/admin/consultations`)에서 상담 생성(필수 입력은 환자와 예약 시각 둘 — 의사 고르는 칸은 없어졌다, 2026-08-25 확인) → 게스트 초대 링크 발송 → `/consultation/[id]`에서 영상. 예약시각은 KST 입력·KST+UTC 병기 안내.
- **회원관리**: `/admin/staff`(코디네이터 — role=coordinator 부여, 비활성=app_metadata.disabled 토글, 소프트 삭제. 의사는 계정 없이 상담방 초대링크 참여 — doctor 계층은 #334에서 폐지) / `/admin/users`(환자 — 상담이력·소프트 ban). 계정 생성은 임시비번 직접 발급(최소 6자).
- **어드민 메뉴**(정본 = `app/admin/_components/AdminNav.jsx`, 2026-07-24 재편): 홈(대시보드·KHIDI 리포트·문의 통계·광고 예산) / 상담·문의 / 파트너·회원 / 콘텐츠 / AI 품질 / 시스템 / 비활성 화면(메뉴에서 숨겼지만 주소로는 열리는 9종 — `npm run check:dead-screens` 가 매달 실DB 와 대조)
