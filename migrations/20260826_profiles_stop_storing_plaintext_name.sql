-- profiles.full_name 에 «평문 이름»을 더 이상 쌓지 않는다.
--
-- 왜 (2026-08-26 PO 지시 「암호화까지 해라」):
--   이 칸은 가입할 때 데이터베이스 자동 장치(handle_new_user)가 인증 표의 값을 그대로
--   복사해 넣던 자리다. 우리 암호화 열쇠는 «앱 쪽 환경변수»에 있어서 데이터베이스 안에서는
--   쓸 수 없다. 그래서 암호화 대신 «애초에 저장하지 않는» 쪽을 택했다.
--   같은 이름은 인증 표(auth.users)에 남지만, 그 표는 손님 열쇠로 못 읽고 서비스 열쇠로만 열린다.
--   이름이 필요한 유일한 코드(리마인더 대상 만들기)는 이미 그 사용자를 인증 표에서
--   가져오고 있어서, 거기서 이름을 읽도록 같이 고쳤다(반쪽 금지).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
BEGIN
  -- full_name 은 일부러 넣지 않는다 (평문 개인정보를 안 쌓는다).
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'user'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

update public.profiles set full_name = null where full_name is not null;

comment on column public.profiles.full_name is
  '2026-08-26 이후 채우지 않는다. 평문 개인정보를 안 쌓기로 했고, 이름은 auth.users 에서 읽는다.';
