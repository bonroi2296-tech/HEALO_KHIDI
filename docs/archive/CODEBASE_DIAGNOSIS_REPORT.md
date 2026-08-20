# healwith 코드베이스 진단 소견서

작성일: 2026-04-20  
진단자 관점: 외부 기술 검진 / 안정화 전 사전 점검  
대상: `C:\Users\user\Desktop\HEALO_KHIDI`

## 1. 주호소

현재 healwith 프로젝트는 Claude Code를 중심으로 기능 개발이 상당 부분 진행된 상태이며, 사용자는 Codex와도 이어서 작업 가능한지 확인하고자 했다.

주요 확인 요청은 다음과 같다.

- 현재 프로젝트가 실행 가능한 상태인지
- 환경변수와 개발 서버가 정상인지
- Claude Code가 말한 "별 문제 없음" 판단이 타당한지
- Codex가 직접 수정하면 기존 개발 흐름을 깨뜨릴 위험이 있는지

## 2. 활력 징후

현재 확인된 기본 상태는 다음과 같다.

| 항목 | 상태 | 소견 |
| --- | --- | --- |
| 개발 서버 | 정상 기동 확인 | `http://localhost:3000`에서 `200 OK` 응답 확인 |
| 필수 환경변수 | 통과 | Supabase, Google AI, 암호화 키 필수값 설정됨 |
| 의존성 설치 | 완료 | `npm install` 완료 |
| Next.js 컴파일 | 부분 양호 | `next build`에서 컴파일 단계는 성공 |
| 린트 | 이상 소견 | 실제 앱 코드 기준 `123 errors / 69 warnings` |
| TypeScript 안전성 | 저하 | `ignoreBuildErrors: true`로 타입 오류를 빌드에서 무시 중 |
| 배포 안정성 | 추가 확인 필요 | 샌드박스 권한 문제로 전체 production build 완료 여부는 미확정 |

## 3. 검사 결과

### 3.1 환경변수 검사

`npm run check:env` 기준으로 필수값은 통과했다.

정상 확인된 필수값:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY_V2`
- `GOOGLE_GENERATIVE_AI_API_KEY`

선택값은 일부 누락되어 있다.

- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `AWS_SES_REGION`
- `AWS_SES_ACCESS_KEY_ID`
- `AWS_SES_SECRET_ACCESS_KEY`
- `AWS_SES_FROM_EMAIL`

소견: 기본 개발은 가능하나, 지도, 분석, 이메일 발송 기능은 제한될 수 있다.

### 3.2 실행 검사

개발 서버는 정상적으로 기동되었고, 로컬 페이지 응답도 확인되었다.

```text
http://localhost:3000
status=200
```

소견: 프로젝트는 "실행 불능" 상태가 아니다. 실제 기능 검증은 화면별로 추가 확인이 필요하다.

### 3.3 빌드 검사

`npm run build` 실행 시 다음 상태를 확인했다.

- Next.js production compile 단계는 성공
- 이후 page data collection 단계에서 `spawn EPERM` 발생

소견: 이 에러는 코드 컴파일 에러라기보다 현재 Codex 샌드박스의 프로세스 실행 권한 문제일 가능성이 높다. 다만 실제 배포 환경에서 전체 build가 끝까지 완료되는지는 별도 확인이 필요하다.

### 3.4 린트 검사

초기 검사에서는 `.claude`, `design-system-export`, `output` 등 작업 산출물까지 포함되어 927개 문제가 보고되었다.

검사 범위를 실제 앱 코드 중심으로 정리한 뒤 현재 기준선은 다음과 같다.

```text
192 problems
123 errors
69 warnings
```

대표 유형:

- 사용하지 않는 변수
- React Hook dependency 누락
- render 중 `Date.now()` / `Math.random()` 사용
- `useEffect` 안의 즉시 `setState`
- 중복 객체 key
- 일부 JavaScript parsing error
- render 중 내부 컴포넌트 선언

소견: 당장 실행을 막는 중증 소견은 아니지만, 유지보수 중 회귀 버그를 만들 수 있는 만성 위험 신호다.

## 4. 진단명

### 주진단

**기능 구현은 진행되어 있으나, 검증 체계와 타입 안정성이 부족한 개발 진행형 코드베이스**

### 부진단

1. **린트 기준선 불량**
   - 실제 앱 코드에 아직 다수의 lint error가 남아 있다.

2. **TypeScript 안전장치 약화**
   - `typescript.ignoreBuildErrors: true`로 인해 타입 문제가 배포 전 차단되지 않는다.

3. **Supabase 타입 체계 미완성**
   - `database.types.ts` 부재로 DB 연동 타입 안정성이 낮다.

4. **Next.js 16 마이그레이션 경고**
   - `middleware.ts` convention이 deprecated 상태다.

5. **선택 기능 환경변수 미설정**
   - 지도, 분석, 이메일 기능은 실제 사용 시 추가 설정이 필요하다.

## 5. Claude Code 소견에 대한 재판독

Claude Code가 "별 문제 없다"고 판단했다면, 그것은 아마 다음 의미에서는 타당하다.

- 앱이 켜진다.
- 주요 컴파일 단계가 통과한다.
- 기능 파일들이 존재한다.
- 개발을 이어갈 수 있다.

하지만 아래 의미에서는 보수적으로 봐야 한다.

- 코드 품질이 깨끗하다는 뜻은 아니다.
- 타입 안정성이 확보됐다는 뜻은 아니다.
- 배포 전 검증이 완료됐다는 뜻은 아니다.
- 향후 수정이 안전하다는 뜻은 아니다.

종합 소견: Claude Code의 판단은 "실행 가능성" 관점에서는 크게 틀리지 않지만, "프로덕션 안정성" 관점에서는 미진하다.

## 6. 치료 원칙

현재 상태에서 가장 중요한 원칙은 **대량 수술 금지**다.

아래 작업은 당장 피하는 것이 좋다.

- 린트 에러 전체 자동 수정
- React Hook 경고 일괄 수정
- Supabase 타입을 한 번에 전면 적용
- 관리자/상담/KHIDI 플로우 구조 변경
- `middleware.ts`를 사전 검증 없이 즉시 `proxy`로 전환

이유: 현재 코드는 기능 구현 흐름이 이미 쌓여 있으므로, 광범위한 자동 수정은 겉보기와 달리 인증, 권한, 상담, 관리자 기능을 깨뜨릴 수 있다.

## 7. 권장 치료 계획

### 1단계: 안정 상태 유지

- 현재 정상 기동 상태를 기준선으로 유지한다.
- 앱 로직 파일은 즉시 대량 수정하지 않는다.
- 문서, 설정, 검증 스크립트처럼 안전한 영역부터 정리한다.

### 2단계: 핵심 기능 검진

화면별로 실제 동작을 확인한다.

- 메인 페이지
- 문의 / 상담 플로우
- 관리자 로그인
- 병원 목록 / 상세
- 치료 목록 / 상세
- KHIDI 상담 관련 화면
- 파일 업로드 / 문서 기능
- 이메일 발송 기능

### 3단계: 치명도 높은 오류부터 소량 교정

우선순위:

1. JavaScript parsing error
2. 중복 key
3. 실제 runtime 위험이 있는 undefined / unused 구조
4. React Hook 관련 오류
5. warning 정리

### 4단계: DB 타입 안정화

- Supabase schema 기준으로 `database.types.ts` 생성
- Supabase client에 타입 적용
- DB query 결과 타입 정리

### 5단계: TypeScript 빌드 안전장치 복구

- 현재는 `ignoreBuildErrors: true`
- 단계적으로 타입 문제를 줄인 뒤 최종적으로 `false` 전환 검토

### 6단계: Next.js 16 경고 대응

- `middleware.ts` 기능을 먼저 문서화
- 인증/권한/redirect 동작 테스트 확보
- 이후 `proxy` 방식 전환 검토

## 8. 예후

예후는 나쁘지 않다.

이 프로젝트는 이미 기능 구현량이 많고, 개발 서버도 정상 기동된다. 따라서 "폐기 후 재작성" 대상은 아니다.

다만 현재 상태는 다음에 가깝다.

```text
돌아가는 개발본
```

아직 다음 수준은 아니다.

```text
검증 완료된 안정 배포본
```

소량 교정, 반복 확인, 타입 안정화 순서로 진행하면 안정적인 프로젝트로 끌어올릴 수 있다.

## 9. 최종 소견

healwith 코드베이스는 현재 **개발 지속 가능 상태**다.

그러나 구조적 건강 상태는 "정상"이 아니라 "관찰 및 안정화 필요"에 가깝다.

Codex가 앞으로 개입할 때는 다음 원칙을 지켜야 한다.

- 한 번에 크게 고치지 않는다.
- 수정 전 현재 동작을 확인한다.
- 작은 단위로 고친다.
- 수정 후 같은 기능을 다시 확인한다.
- 기존 Claude Code 개발 흐름을 존중한다.

최종 판정:

```text
즉시 응급상황은 아님.
하지만 배포 전 정밀 검진과 단계적 안정화가 필요함.
```
