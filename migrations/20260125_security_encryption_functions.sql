-- HEALO: pgcrypto 기반 암호화 함수
-- 환경변수 SUPABASE_ENCRYPTION_KEY를 서버에서만 주입하여 사용
-- 주의: 키는 DB에 저장하지 않고, 서버 환경변수에서만 관리

-- ==========================================
-- 1. pgcrypto extension 활성화
-- ==========================================

create extension if not exists pgcrypto;

-- ==========================================
-- 2. 암호화 함수 (서버에서 키 주입)
-- ==========================================

-- 주의: 이 함수들은 서버에서만 호출하며, 암호화 키는 환경변수에서 주입
-- 예: select encrypt_text('plaintext', 'your-encryption-key-from-env');

-- 암호화 함수 (plaintext, encryption_key)
create or replace function encrypt_text(
  plaintext text,
  encryption_key text
) returns text as $$
begin
  if plaintext is null or encryption_key is null then
    return null;
  end if;
  return encode(
    pgp_sym_encrypt(plaintext, encryption_key),
    'base64'
  );
end;
$$ language plpgsql;

-- 복호화 함수 (ciphertext, encryption_key)
create or replace function decrypt_text(
  ciphertext text,
  encryption_key text
) returns text as $$
begin
  if ciphertext is null or encryption_key is null then
    return null;
  end if;
  begin
    return pgp_sym_decrypt(
      decode(ciphertext, 'base64'),
      encryption_key
    );
  exception when others then
    -- 복호화 실패 시 null 반환 (키 불일치 등)
    return null;
  end;
end;
$$ language plpgsql;

-- ==========================================
-- 3. 해시 함수 (검색용)
-- ==========================================

-- email_hash 생성 함수 (검색용, 복호화 불가)
create or replace function email_hash(email text) returns text as $$
begin
  if email is null then
    return null;
  end if;
  return encode(
    digest(lower(trim(email)), 'sha256'),
    'hex'
  );
end;
$$ language plpgsql;

-- ==========================================
-- 4. 사용 예시 (서버에서만 실행)
-- ==========================================

-- 암호화:
-- select encrypt_text('user@example.com', current_setting('app.encryption_key'));

-- 복호화:
-- select decrypt_text('encrypted_base64_string', current_setting('app.encryption_key'));

-- 해시:
-- select email_hash('user@example.com');

-- 주의사항:
-- 1. encryption_key는 서버 환경변수(SUPABASE_ENCRYPTION_KEY)에서만 관리
-- 2. DB에 키를 저장하지 않음
-- 3. 서버 API route에서만 이 함수들을 호출
-- 4. 키는 최소 32자 이상의 강력한 랜덤 문자열 권장
