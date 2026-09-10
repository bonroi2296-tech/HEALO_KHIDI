-- 2026-09-10 — inquiries.contact_key (연락처 지문) 컬럼·인덱스.
--
-- 왜: 한 분이 25분 동안 네 번 접수했는데(#328~#331) 매번 새 건이 생겼다. 이메일은
--     AES-256-GCM 이라 같은 값도 매번 다른 암호문이 되어 `where email = ?` 로는 못 찾는다.
--     그래서 «찾기 전용» HMAC 지문을 따로 둔다 (src/lib/inquiry/contactKey.ts).
--
-- 🛑 이 값은 사람에게 보여주지 않는다. 쓰임새는 DB 조회 한 가지뿐이다.
--
-- 적용 기록:
--   · 실서비스(hvwwlkawaxabhtumjhrg): 2026-09-09 적용 완료 (기존 40행 백필됨). 이 파일은 «뒤늦은 기록»이다.
--   · 검사 전용(aawpxzhlytrgqmdsbcni): 2026-09-10 적용. 이게 없어서 #1710 스모크가
--     "Could not find the 'contact_key' column" 으로 계속 빨간불이었다.

alter table public.inquiries add column if not exists contact_key text;

-- 조회는 언제나 「이 지문 + 최근 N시간」이라 두 칸을 한 인덱스로 묶는다.
create index if not exists idx_inquiries_contact_key_recent
  on public.inquiries (contact_key, created_at desc)
  where contact_key is not null;
