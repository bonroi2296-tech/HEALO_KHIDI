# Task Card 템플릿 + 예시

> 잡무/서브 세션에 작업 배정할 때 쓰는 표준 포맷.
> 복붙해서 세부 내용만 바꿔서 사용.

---

## 📝 표준 포맷

```markdown
## [TASK-YYYYMMDD-NN] 짧은 제목

### 배경
(왜 필요한지 1~2줄)

### 담당 영역
- 수정 가능 파일: `path/to/file.ext`
- 건드리면 안 되는 파일: (메인 세션 영역)

### 상세 단계
1. ...
2. ...

### 검증
- [ ] `npx next build --webpack` 성공
- [ ] `npm run test:run` 통과
- [ ] (기능별 체크)

### 제약
- 자기 브랜치에만 push
- main 건드리지 말 것

### 완료 후
`docs/HANDOUT_*.md` §4.5 양식으로 보고
```

---

# 🌐 번역 정책 (중요)

**번역은 구조 안정화 후 일괄 처리.** 현재는 아래만 유지:
- 한국어 (주 운영)
- 영어 (국제)
- 일본어 (2차 타깃)

러시아어 / 카자흐어 / 중국어 번역 task 는 **지금 배정하지 말 것**.
구조가 여전히 자주 바뀌어서 재번역 낭비.

---

# 🔧 잡무용 Task 예시

## [TASK-20260421-DISABLED-01] i18n ru / kz 번역 채우기 — 🚫 지금 하지 않음

### 배경
현재 `src/lib/i18n/index.js` 의 ru / kz 블록은 누락 키 많음. 
`npm run check:i18n` 실행 시 리포트 나옴. 러시아/카자흐 환자 메인 타겟 언어라 우선순위 높음.

### 담당 영역
- 수정 가능: `src/lib/i18n/index.js` 의 ru / kz 언어 블록만
- 건드리면 안 됨: en / ko 블록, 다른 파일

### 상세 단계
1. `npm run check:i18n` 실행해 현재 누락 키 리스트 확보
2. en 블록에 있고 ru/kz 에 없는 키 각각 번역
3. 러시아어: 의료 용어는 국제 표준 사용, 친숙 어조
4. 카자흐어: Қазақша 국가어 기준, 러시아어와 혼동 금지
5. 각 언어 블록은 기존 ko 블록과 동일한 key 순서/구조 유지

### 검증
- [ ] `npm run check:i18n` 결과 ru/kz 에 누락 키 0
- [ ] `npx next build --webpack` 성공
- [ ] 브라우저에서 `/?lang=ru` / `/?lang=kz` 접속 시 번역 출력 확인

### 제약
- 다른 언어 블록 수정 금지
- 새 key 추가 금지 (기존 key 만 번역)
- 코드 로직 / JSX 수정 금지
- `git push origin claude/자기브랜치` 만

---

## [TASK-20260421-DISABLED-02] /telemedicine 페이지 다국어화 — 🚫 지금 하지 않음

### 배경
`/telemedicine` 랜딩 페이지가 en / ko 만 있음. 메인 타겟이 러시아어/카자흐어 환자라 필수.

### 담당 영역
- 수정 가능: `app/telemedicine/TelemedicineClient.jsx` 의 COPY 객체만
- 건드리면 안 됨: 컴포넌트 구조 / 스타일 / 다른 파일

### 상세 단계
1. 해당 파일 열어 COPY 객체 구조 파악
2. en / ko 블록을 참고해 ru / kz / zh / ja 블록 추가
3. 의료 용어는 국제 통용 (oncology, telemedicine, consultation 등)
4. 문화권 맞게 적절한 어조 (러시아어: 격식, 카자흐어: 정중)
5. 배경 이미지 / 스타일 코드는 건드리지 말 것

### 검증
- [ ] `npx next build --webpack` 성공
- [ ] `/telemedicine?lang=ru` / `?lang=kz` / `?lang=zh` / `?lang=ja` 각각 접속해 번역 확인
- [ ] 긴 텍스트로 인해 레이아웃 깨지지 않음

### 제약
- COPY 객체만 수정, 다른 부분 X
- 이미지 / 링크 / 컴포넌트 import 수정 금지

---

## [TASK-20260421-03] /privacy 페이지 PIPA §28조의8 조항 본문 추가

### 배경
최근 회원가입 폼에 PIPA §28조의8 (국외이전 동의) UI 추가 완료.
이에 맞춰 `/privacy` 페이지 본문에도 동일 조항 명시 필요. 법무 리뷰 전 초안.

### 담당 영역
- 수정 가능: `src/lib/policies.js` 또는 `app/privacy/**`
- 건드리면 안 됨: 가입 폼, 기타 페이지

### 상세 단계
1. `app/privacy/**` 파일 구조 파악
2. `src/lib/policies.js` 에 정책 문구가 있다면 거기 추가
3. 6가지 고지 항목 필수:
   - 이전 목적: 의료 상담 매칭, 번역, AI 챗봇, 원격진료 호스팅
   - 이전 항목: 이름, 이메일, 전화번호, 병력, 치료 선호도, 상담 영상/음성
   - 수탁자: Google LLC (US), LiveKit Inc. (US), Amazon Web Services (US)
   - 이전 방법: 암호화된 HTTPS / TLS 1.3
   - 보유·이용 기간: 계정 삭제 시 또는 3년간 미활동 시
   - 거부권: 거부 가능하나 매칭/번역/원격진료 기능 제공 불가
4. 한국어 / 영어 병기
5. 상단에 "법무팀 최종 검토 전 초안" 주석

### 검증
- [ ] `/privacy` 접속 시 해당 섹션 표시
- [ ] `npx next build --webpack` 성공
- [ ] 링크 / 레이아웃 깨지지 않음

### 제약
- `app/signup/` 건드리지 말 것 (이미 메인 세션이 작업)
- 정책 이외 UI 수정 금지

---

## [TASK-20260421-04] 환자 대시보드 UX 개선 (한/일 중심)

### 배경
`/patient` 환자 포털의 로딩 / 빈 상태 / 에러 상태가 부실.
파일럿 심사용 데모를 위해 UX 세련되게 정리.

### 담당 영역
- 수정 가능: `app/patient/**/*.jsx` (로딩/빈/에러 상태 UI)
- 건드리면 안 됨: 관리자 페이지, `app/consultation/**`, `app/api/**`

### 상세 단계
1. `app/patient/` 하위 각 페이지 로딩 시 skeleton UI 추가
2. 빈 상태 (empty state) 명확한 안내 + CTA 추가
3. 에러 상태에 재시도 버튼
4. 모바일 반응형 체크
5. 기존 한국어 / 영어 / 일본어 카피 유지 (다른 언어 추가 금지)

### 검증
- [ ] `npx next build --webpack` 성공
- [ ] `/patient` 접속 → 로딩 / 빈 / 정상 / 에러 각 상태 확인
- [ ] 모바일 브레이크포인트 (< 768px) 에서 레이아웃 정상

### 제약
- /patient 영역만 (관리자 consultations 건드리면 안됨)
- 기능 로직 / API 호출 코드 건드리지 말 것
- **번역 추가 금지** (ko/en/ja 기존 텍스트만)

---

## [TASK-20260421-05] 병원 데이터 시드 3개 추가

### 배경
DB `hospitals` 테이블에 삼성서울 / 아산 / 세브란스 데이터 누락.
파일럿 심사용 데모를 위해 실제 병원 데이터 필요.

### 담당 영역
- 수정 가능: `scripts/seed-hospitals.mjs` (새 파일 생성)
- 절대 실행 금지: DB INSERT 는 메인 세션이 함

### 상세 단계
1. `scripts/seed-hospitals.mjs` 생성
2. 3개 병원 데이터 정의 (name, address, website, phone, specialty 등)
3. 각 필드 기존 `hospitals` 테이블 스키마 맞춤
4. INSERT SQL 또는 `supabase.from("hospitals").insert([...])` 코드 작성
5. **파일만 만들고 실행 X** — 메인 세션이 리뷰 후 실행

### 검증
- [ ] 파일 문법 오류 없음 (node --check)
- [ ] 데이터 필드 완전성 확인

### 제약
- DB 에 실제 INSERT 금지
- Supabase Dashboard 접속 금지

---

# 📖 서브용 Task 예시

## [TASK-20260421-06] 코드 품질 감사 리포트

### 목표
현재 코드베이스 품질 스냅샷을 `docs/CODE_QUALITY_AUDIT_2026-04-21.md` 로 작성.

### 수행
```bash
npm run lint > /tmp/lint.txt 2>&1
npm run typecheck > /tmp/tsc.txt 2>&1
npx next build --webpack > /tmp/build.txt 2>&1
```

분석 후 리포트 작성:
- 린트 에러 / 경고 카테고리별 카운트
- 타입 에러 파일별 TOP 10
- 빌드 경고 종류
- 각 우선순위 (Critical / Major / Minor)
- 메인 세션에게 넘길 작업 우선순위 top 5

### 제약
- 코드 수정 금지 (docs/ 만)
- 자기 브랜치에 commit

---

## [TASK-20260421-07] 보안 감사 리포트

### 목표
`docs/SECURITY_AUDIT_2026-04-21.md` 작성.

### 체크 포인트
1. **RLS 정책 확인**
   ```sql
   -- Supabase Dashboard 접속 금지, 대신 마이그레이션 파일 읽어서 확인
   ls migrations/
   ```
   
2. **service_role 키 노출 검사**
   ```bash
   grep -rn "SUPABASE_SERVICE_ROLE_KEY" app src components --include="*.jsx"
   ```
   클라이언트 컴포넌트 ('use client') 에서 사용되면 🚨

3. **Rate limit 커버리지**
   - `app/api/**/route.ts` 읽고 각 route 가 rate limit 붙였는지

4. **인증 게이트**
   - public / auth 있음 / admin only 분류

5. **Audit log**
   - admin 작업이 admin_audit_logs 에 기록되는지

### 제약
- DB 직접 쿼리 금지
- 코드 수정 금지

---

## [TASK-20260421-08] API surface inventory

### 목표
`docs/API_INVENTORY_2026-04-21.md` — 모든 API 엔드포인트 목록 + 보안 프로필.

### 수행
```bash
find app/api -name "route.ts" -o -name "route.js" | sort
```

각 route 에 대해:
- 경로 (예: POST /api/khidi/consultation/invite)
- 인증 요구: public / auth / admin / guest-token
- Rate limit: 있음/없음 + 설정
- Input validation: zod / 수동 / 없음
- Response: 200 / error codes
- 민감도 (낮음 / 중간 / 높음)

### 제약
- 코드 읽기만, 수정 금지

---

## [TASK-20260421-09] 성능 / 번들 분석

### 목표
`docs/PERFORMANCE_REPORT_2026-04-21.md` 작성.

### 수행
```bash
npx next build --webpack
# .next/analyze 있으면 확인

# 큰 의존성
du -sh node_modules/* | sort -rh | head -20

# 큰 소스 파일
find app src -name "*.jsx" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20
```

- 번들 사이즈 top 10
- 큰 컴포넌트 파일 top 10
- 이미지 최적화 여부 (public/ 하위)
- N+1 쿼리 가능성 (API route 내 loop + fetch 패턴)

### 제약
- 수정 금지

---

## [TASK-20260421-10] 테스트 gap 분석

### 목표
`docs/TEST_COVERAGE_GAP_2026-04-21.md` 작성.

### 수행
```bash
find src app -name "*.test.ts" -o -name "*.test.tsx" | sort
find app/api -name "route.ts" | sort
```

- 테스트 있는 API / 없는 API 리스트
- Security 관련 API 중 테스트 없는 것 우선순위
- 권장 테스트 시나리오 3~5개

### 제약
- 테스트 작성 금지 (리포트만)

---

# 🔄 Task 배정 팁

## 동시에 주면 안 되는 조합

- 두 잡무 세션에게 같은 파일 task
- 메인이 작업 중인 파일에 잡무 task
- 서브 + 잡무 가 같은 영역 조사/수정

## 순차적으로 하면 좋은 조합

1. **서브 → 감사 리포트** 작성
2. **메인 → 리포트 기반 우선순위** 설정
3. **잡무 → 우선순위 높은 작은 작업** 처리
4. **메인 → 리뷰 + 머지 + 배포**

---

## 🏁 최종 체크리스트 (사용자용)

Task 줄 때마다:

- [ ] Task ID 부여 (날짜 + 번호)
- [ ] 담당 영역이 메인 작업과 겹치지 않는지 확인
- [ ] 파일 명시 (범위 고정)
- [ ] 검증 체크리스트
- [ ] 제약사항 재확인
- [ ] 완료 보고 양식 상기
