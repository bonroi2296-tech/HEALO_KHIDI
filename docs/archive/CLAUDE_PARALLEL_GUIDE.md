> 🗄 **보관됨 (2026-08-27). 정본은 `docs/PARALLEL_SESSIONS.md` 다.**
> 이 문서는 2026-04-21 기준이라 담당 영역표가 **지금은 존재하지 않는 파일**을 가리킨다
> (`app/home/HomeClientPremium.jsx`·`components/healo/Nav.jsx`·`Footer.jsx` — 폐기된 premium 톤 잔재로 전부 삭제됨).
> **그 표를 보고 파일을 찾아가지 마라.** 병렬 세션 운영 규칙은 `docs/PARALLEL_SESSIONS.md` 를 읽는다.

# HEALO — Claude 병렬 세션 운영 지침서

> **대상**: 여러 Claude Code 세션을 동시에 돌리는 프로덕트 오너 (본인)
> **목적**: 3 세션 (메인 / 잡무 / 서브) 병렬 운영 시 충돌 · 중복 · 사고 방지
> **작성**: 2026-04-21

---

## 1. 역할 구조

### 🎯 메인 (Release Manager)
- 신규 기능 / 큰 리팩터 / 스키마 변경 / 패키지 설치
- **유일하게 `main` 브랜치 push 권한**
- 잡무/서브 작업 머지 + 배포 담당
- DB 마이그레이션 · 환경변수 조정 담당

### 🔧 잡무 (Worker)
- 독립 파일 단위 수정 (i18n / 카피 / 데이터 시드 / UI 세부)
- 자기 worktree + 자기 브랜치에만 커밋
- **main 브랜치 절대 건드리지 않음**
- npm install / DB 변경 / env 수정 금지

### 📖 서브 (Auditor / Researcher)
- **코드 수정 없음** — 읽기 + 리포트 작성만
- 문서, 분석, 조사 작업 전용
- 새 파일 생성은 `docs/` 하위에서만 허용
- 커밋해도 되지만 main push 금지

---

## 2. 세션 간 기본 규칙

### 절대 금지 (잡무 / 서브 공통)

```
❌ git push origin main
❌ git checkout main
❌ main 으로 force push
❌ Supabase Dashboard 접속해서 DB 수정
❌ Vercel Dashboard 접속해서 env 수정 / redeploy
❌ npm install <새 패키지>
❌ package.json / package-lock.json 수정
❌ 마이그레이션 파일 실행 (migrations/*.sql)
❌ .env.local / .env.example 수정
```

### 허용

```
✅ git commit (자기 브랜치)
✅ git push origin <자기브랜치>
✅ 파일 읽기 / 수정 (담당 범위 내)
✅ 로컬 `npm run lint` / `npm run test:run` / `npx next build --webpack`
✅ 분석 / 리포트 작성 (docs/)
```

---

## 3. 세션 간 충돌 방지 — 영역 분할

### 메인 세션 (저) 이 담당 중인 영역 (2026-04-21 기준)

| 영역 | 파일 / 디렉터리 |
|------|----------------|
| 원격협진 (telemedicine) | `app/telemedicine/**`, `app/consultation/**` |
| 관리자 consultation | `app/admin/consultations/**` |
| Consultation API | `app/api/khidi/consultation/**`, `app/api/livekit/**` |
| 이메일 시스템 | `src/lib/email/**` |
| 초대 토큰 | `src/lib/auth/guestToken.ts`, `src/lib/auth/requireConsultationAccess.ts` |
| 홈 히어로 / 히어로 배너 | `app/home/HomeClientPremium.jsx` (히어로 / USP 섹션) |
| Nav / Footer 구조 | `components/healo/Nav.jsx`, `components/healo/Footer.jsx` |
| DB 스키마 | `consultation_*`, `hospitals`, `partner_doctors` 테이블 |

**이 영역은 잡무/서브가 건드리면 안 됨.**

### 잡무 세션 안전 영역

| 영역 | 파일 / 디렉터리 |
|------|----------------|
| i18n 번역 | `src/lib/i18n/index.js` (기존 ko/en 외 추가) |
| i18n 보조 | `src/lib/i18n/langs-fixes.js` |
| 법적 문구 | `src/lib/policies.js`, `/privacy`, `/terms`, `/cookies` 페이지 |
| 병원 데이터 | `src/lib/hospitals/*` (정적 데이터) |
| 디자인 튜닝 | `components/healo/Primitives.jsx` 색상/폰트 |
| 브랜딩 | public/images, public/icons |
| 환자 대시보드 | `app/patient/**` (관리자 consultation 제외) |
| 공개 페이지 카피 | `/about`, `/faq`, `/stories`, `/contact` |

### 서브 세션 안전 영역 (읽기 전용)

| 영역 | 작업 |
|------|------|
| 전체 코드베이스 | 읽기만 |
| `docs/**` | 새 파일 생성 허용 (기존 수정 X) |
| 감사 리포트 | lint / typecheck / 보안 / 성능 분석 |

---

## 4. 작업 프로토콜

### 잡무 세션이 작업 받으면

```bash
# 1. 현재 브랜치 확인 (claude/... 여야 함)
git branch --show-current

# 2. 작업 전 main 에서 최신 받기 (rebase 권장)
git fetch origin
git rebase origin/main

# 3. 작업 수행

# 4. 로컬 빌드 확인 (배포는 안 되지만 빌드 깨졌는지 확인)
npx next build --webpack

# 5. 테스트 통과 확인
npm run test:run

# 6. 커밋
git add -A
git commit -m "fix(i18n): ru/kz 번역 추가 — 337개 키 커버"

# 7. 자기 브랜치에만 push
git push origin <자기브랜치명>

# 8. 사용자에게 보고
```

### 보고 양식 (복붙용)

```markdown
## 작업 완료 보고

**브랜치**: claude/busy-ritchie
**커밋**: abc123d
**작업**: [한 줄 요약]

**수정 파일**:
- src/lib/i18n/index.js (+120 lines)

**검증**:
- ✅ next build: compiled successfully
- ✅ vitest: 486/486 passed
- ✅ 기능 확인: /ru 로 접속 시 번역 표시됨

**메인 세션 확인 필요 사항**:
- (있으면 기재, 없으면 "없음")
```

### 서브 세션이 작업 받으면

```bash
# 1. 절대 기존 파일 수정 X
# 2. docs/<주제>_<YYYY-MM-DD>.md 만 생성
# 3. 리포트 작성
# 4. 커밋 + push 자기 브랜치
# 5. 사용자에게 보고 (리포트 요약 + 파일 링크)
```

---

## 5. 비상 정지 조건

아래 상황이면 **즉시 작업 중단 + 사용자에게 보고**:

1. **`git pull` 실패 / 충돌 발생**
2. **테스트 실패율 10% 이상 증가**
3. **빌드 실패**
4. **예상보다 많은 파일이 수정됨** (예상 3개인데 20개 수정됨)
5. **DB / env / secret 관련 파일이 수정됨**
6. **다른 세션이 이미 건드린 파일임을 뒤늦게 발견**

중단 방식:
```bash
# 커밋 전이면:
git stash  # 작업 보관
git status  # 확인

# 이미 커밋했으면:
git reset --soft HEAD~1  # 커밋 되돌리기 (파일은 유지)
```

---

## 6. Task card 표준 포맷

메인 세션이 잡무/서브에게 task 줄 때 이 포맷 사용:

```markdown
## [Task ID] 짧은 제목

### 배경
왜 이 작업이 필요한지 1~2줄

### 작업 범위
- 수정 파일: (명시된 파일만 건드릴 것)
- 안 건드릴 파일: (메인 세션 작업 영역 명시)

### 상세 단계
1. ...
2. ...
3. ...

### 검증
- [ ] npm run test:run 통과
- [ ] npx next build --webpack 성공
- [ ] (기능별 추가 체크)

### 제약 사항
- push 는 `claude/<자기브랜치>` 로만
- main 브랜치 건드리지 말 것
- 새 패키지 설치 금지
- (기타)

### 완료 후
보고 양식 (§4.2) 에 따라 보고
```

---

## 7. 메인 세션 (저) 이 해야 하는 것

잡무/서브가 push 한 후 메인 세션에서:

```bash
# 1. 다른 브랜치 작업 가져오기
git fetch origin

# 2. 리뷰
git log origin/claude/busy-ritchie --oneline
git diff main..origin/claude/busy-ritchie

# 3. 테스트 환경에서 머지 시뮬
git checkout -b test-merge-busy-ritchie main
git merge origin/claude/busy-ritchie
# 충돌 있으면 해결

# 4. 검증
npm run test:run
npx next build --webpack

# 5. OK 면 main 에 정식 머지
git checkout main
git merge --no-ff origin/claude/busy-ritchie
git push origin main

# 6. (선택) 브랜치 삭제
git branch -d test-merge-busy-ritchie
```

---

## 8. FAQ

**Q: 잡무/서브가 실수로 main 에 push 하면?**
A: 메인 세션이 `git revert` 로 되돌림. Force push 는 안 씀 (히스토리 보존).

**Q: 두 세션이 같은 파일 건드렸으면?**
A: 먼저 push 한 쪽이 이김. 나중 push 는 rebase 강요받음. 리베이스 중 충돌 해결은 각 세션이 책임.

**Q: DB 변경이 꼭 필요한 task 는?**
A: 메인 세션에게 넘김. 메인이 마이그레이션 + 코드 변경을 같이.

**Q: 서브가 찾은 버그를 고쳐도 될까?**
A: 안 됨. 버그 리포트만. 메인이 고침.

**Q: 새 디자인 시스템 컴포넌트 만들어도 돼?**
A: 메인과 상의. 새 파일 생성 자체는 안전하지만 import 관계가 꼬일 수 있음.

---

## 9. 버전

이 지침서는 2026-04-21 작성. 상황 변하면 메인 세션이 업데이트.

현재 메인 세션 작업 중인 영역은 **§3 에서 항상 최신화** 됨.
