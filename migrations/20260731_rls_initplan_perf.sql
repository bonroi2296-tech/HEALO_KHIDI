-- 접근권한 규칙(RLS) 성능 수정 — auth.uid()/auth.role() 을 행마다 재평가하던 정책 19건 (2026-07-31)
--
-- 무엇이 문제였나: 정책 조건에 auth.uid() 를 «맨몸»으로 쓰면 Postgres 가 **조회되는 행마다**
--   그 함수를 다시 부른다. 행이 100개면 100번, 10만 개면 10만 번이다. 지금은 데이터가 적어
--   체감이 없지만 환자·상담·알림이 쌓이면 조회가 눈에 띄게 느려지는 종류의 문제다.
--   (select auth.uid()) 로 감싸면 Postgres 가 InitPlan 으로 «한 번만» 계산해 재사용한다.
--
-- ⚠️ 동작은 한 글자도 안 바뀐다. 누가 무엇을 볼 수 있는지의 «조건»은 그대로고, 그 조건을
--    몇 번 계산하느냐만 달라진다. Supabase 공식 권장 형태다.
--
-- 왜 drop/create 가 아니라 alter policy 인가: 지웠다 다시 만들면 그 사이 아주 짧은 순간
--    정책이 없는 상태가 생긴다(= 접근이 열리거나 막히는 구멍). alter 는 제자리 교체라 그 틈이 없다.
--
-- 손대지 않은 4건: admin_audit_logs_archive · consultation_admissions ·
--   consultation_guest_tokens · rate_limit_buckets 는 이미 (select auth.jwt() ->> 'role')
--   형태로 감싸져 있다. 검사기가 여전히 경고를 내지만 실제 정의를 읽어보면 이미 최적화 상태라
--   오탐이다. 멀쩡한 걸 건드리지 않는다.
--
-- 되돌리기: 각 alter 에서 (select auth.x()) 를 auth.x() 로 되돌리면 끝. 데이터는 안 건드린다.
--
-- ✅ 2026-07-31 실DB 적용 완료. 적용 전후 대조:
--    정책 수 90 → 90 (동일) · 정책 목록 지문 6afeed30… → 6afeed30… (동일)
--    = 「누가 무엇에 대해 어떤 권한을 갖는지」는 한 글자도 안 바뀌었다.
--    맨몸 auth.uid()/auth.role() 호출 19건 → 0건.
--    화면 실측: 로컬에서 코디 계정 로그인 → /coordinator 대시보드 정상(알림 배지·문의 52건 표시).
--    알림은 브라우저가 DB 를 직접 조회하는 자리라 정책이 깨졌으면 즉시 빈칸이 된다.

begin;

-- ── 서비스 전용(서버만 접근) 정책 — auth.role() ─────────────────────────────
alter policy "anr_service_only" on public.admin_notification_recipients
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy "normalized_inquiries_service_only" on public.normalized_inquiries
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy "playbook_patterns_service_only" on public.playbook_patterns
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy "playbook_responses_service_only" on public.playbook_responses
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy "pue_service_only" on public.playbook_usage_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy "reviews_service_write" on public.reviews
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

-- ── 「내 것만」 정책 — auth.uid() ────────────────────────────────────────────
alter policy "notifications_select_own" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "notifications_update_own" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "pvc_select_own" on public.patient_visa_checklist
  using ((select auth.uid()) = user_id);

alter policy "pvc_insert_own" on public.patient_visa_checklist
  with check ((select auth.uid()) = user_id);

alter policy "pvc_update_own" on public.patient_visa_checklist
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "pvc_delete_own" on public.patient_visa_checklist
  using ((select auth.uid()) = user_id);

alter policy "profiles_self_read" on public.profiles
  using ((select auth.uid()) = id);

alter policy "healo_profiles_self_select" on public.profiles
  using ((select auth.uid()) = id);

alter policy "profiles_self_update" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can read own roles" on public.user_roles
  using ((select auth.uid()) = user_id);

alter policy "healo_user_roles_self_select" on public.user_roles
  using ((select auth.uid()) = user_id);

-- ── 하위 조회 안에 auth.uid() 가 들어간 것 ──────────────────────────────────
-- 상담 참여자만 그 상담의 메시지를 읽는다. 참여자 칸이 7개(환자·의사·코디 신구 컬럼)라
-- 예전 형태에서는 행마다 최대 7번 auth.uid() 를 불렀다.
alter policy "consultation_messages_participant_read" on public.consultation_messages
  using (
    exists (
      select 1
      from public.consultation_sessions s
      where s.id = consultation_messages.session_id
        and (
          s.patient_user_id = (select auth.uid())
          or s.doctor_user_id = (select auth.uid())
          or s.coordinator_user_id = (select auth.uid())
          or s.translator_id = (select auth.uid())
          or s.patient_id = (select auth.uid())
          or s.doctor_id = (select auth.uid())
          or s.coordinator_id = (select auth.uid())
        )
    )
  );

alter policy "Admins can manage all roles" on public.user_roles
  using (
    exists (
      select 1
      from public.user_roles user_roles_1
      where user_roles_1.user_id = (select auth.uid())
        and user_roles_1.role = 'admin'
    )
  );

commit;
