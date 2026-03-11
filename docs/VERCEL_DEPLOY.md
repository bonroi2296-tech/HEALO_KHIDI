# Vercel 배포 시 필수 설정

## 필수 환경 변수 (배포 전 확인)

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ADMIN_EMAIL_ALLOWLIST` | 관리자 이메일 (쉼표 구분) |
| `GOOGLE_GENERATIVE_AI_API_KEY` 또는 `OPENAI_API_KEY` | 시술 자동생성용 (하나만 있으면 됨) |

환경 변수 변경 후 **Redeploy** 필요.

---

## 어드민 로그인 403 해결

Vercel URL(`https://healo-nu.vercel.app`)에서 로그인은 되는데 **어드민 페이지 접속 시 403**이 나오면, 아래를 확인하세요.

### 1. Vercel 환경 변수

**프로젝트 → Settings → Environment Variables** 에 다음이 반드시 있어야 합니다.

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| **`ADMIN_EMAIL_ALLOWLIST`** | **관리자 이메일 (쉼표 구분)** 예: `admin@healo.com` |

- **`ADMIN_EMAIL_ALLOWLIST`** 가 없으면, Supabase 사용자에 `user_metadata.role` 또는 `app_metadata.role = "admin"` 이 있어야만 어드민으로 인식됩니다.
- 이메일만으로 허용하려면 Vercel에 `ADMIN_EMAIL_ALLOWLIST=admin@healo.com` 를 추가한 뒤 **재배포**하세요.

### 2. Supabase URL 설정

Supabase 대시보드 → **Authentication → URL Configuration**:

- **Site URL**: `https://healo-nu.vercel.app`
- **Redirect URLs**: `https://healo-nu.vercel.app/**` 포함

### 3. site_settings 400 에러

`site_settings` 테이블이 Supabase에 없으면 400이 날 수 있습니다.  
`migrations/20260204_create_site_settings.sql` 를 Supabase SQL Editor에서 실행했는지 확인하세요.

### 4. 시술 자동생성 실패 로그 저장 (선택)

실패 사유를 DB에 남기고 「건너뛰기」 표시를 쓰려면  
Supabase SQL Editor에서 `migrations/20260226_offers_auto_fail_log.sql` 내용을 실행하세요.  
**미적용 시에도 시술 자동생성·확정 저장은 동작**하며, 관리자 UI에 적용 안내가 표시됩니다. 자세한 내용은 `docs/시술_자동생성_RUNBOOK.md` 참고.
