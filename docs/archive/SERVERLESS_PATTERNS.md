# 서버리스 환경 안전 패턴 가이드

> 작성일: 2026-01-29  
> 대상: Vercel, AWS Lambda 등 서버리스 환경  
> 목적: 데이터 유실 방지 및 예측 가능한 동작 보장

---

## 핵심 원칙

**서버리스 환경에서는 응답(Response) 반환 후 모든 작업이 즉시 중단될 수 있습니다.**

따라서:
1. **중요한 작업(DB 저장, 외부 API 호출)은 응답 전에 반드시 완료**
2. **백그라운드 작업은 신뢰할 수 없음**
3. **"나중에 처리"는 "절대 처리 안 될 수도 있음"과 같음**

---

## ❌ 위험한 패턴들

### 1. IIFE (Immediately Invoked Function Expression) 백그라운드 실행

```typescript
// ❌ 위험: 응답 후 작업이 중단될 수 있음
export async function POST(request: Request) {
  // 백그라운드로 DB 저장 시도
  void (async () => {
    await db.insert({ data });  // ⚠️ 저장 안 될 수 있음
  })();

  return Response.json({ ok: true });  // 응답 후 함수 종료 → 위의 작업 중단
}
```

**문제점**:
- 응답 반환 후 서버리스 환경이 즉시 종료
- `db.insert()`가 완료되지 않을 수 있음
- 에러 발생해도 알 수 없음

**언제 발생하나**:
- "나중에 로그 남기면 되지"
- "사용자 응답은 빨리 주고 DB는 천천히"
- "백그라운드에서 알림 보내면 되지"

---

### 2. Promise.resolve() / fire-and-forget

```typescript
// ❌ 위험: 에러 처리 없이 실행
export async function POST(request: Request) {
  Promise.resolve(db.logEvent({ event }));  // ⚠️ 에러 발생 시 무시됨
  
  return Response.json({ ok: true });
}
```

**문제점**:
- 에러가 발생해도 catch되지 않음
- 서버리스 환경에서 완료 보장 안 됨

---

### 3. setTimeout / setInterval

```typescript
// ❌ 위험: 타이머는 실행되지 않음
export async function POST(request: Request) {
  setTimeout(async () => {
    await sendEmail();  // ⚠️ 절대 실행 안 됨
  }, 1000);
  
  return Response.json({ ok: true });  // 응답 후 즉시 종료
}
```

**문제점**:
- 서버리스 환경에서 타이머는 응답 후 무효화됨
- 1초 후에 실행될 것 같지만 절대 실행 안 됨

---

## ✅ 안전한 패턴들

### 1. await로 응답 전 완료

```typescript
// ✅ 안전: 응답 전에 모든 작업 완료
export async function POST(request: Request) {
  const data = await request.json();
  
  // ✅ 중요한 작업은 await로 완료
  await db.insert({ data });
  
  // ✅ 외부 API 호출도 완료
  await externalApi.notify({ data });
  
  // 모든 작업 완료 후 응답
  return Response.json({ ok: true });
}
```

**장점**:
- 데이터 유실 없음
- 에러 발생 시 catch 가능
- 예측 가능한 동작

---

### 2. try-catch로 에러 처리

```typescript
// ✅ 안전: 에러 처리 + 사용자 경험 유지
export async function POST(request: Request) {
  const query = await request.json();
  
  // ✅ 중요하지 않은 작업: 실패해도 응답은 유지
  try {
    await db.logQuery({ query });
  } catch (error) {
    console.error('Log failed (non-critical):', error);
    // 계속 진행
  }
  
  // ✅ 중요한 작업: 실패 시 에러 반환
  try {
    const result = await processQuery(query);
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json({ ok: false, error }, { status: 500 });
  }
}
```

**장점**:
- 중요도에 따라 에러 처리 분리
- 비중요 작업 실패 시에도 사용자 경험 유지
- 중요 작업 실패는 명확히 전달

---

### 3. 작업 분류 및 명시적 주석

```typescript
export async function POST(request: Request) {
  const data = await request.json();
  
  // ========================================
  // ✅ CRITICAL: 응답 전 반드시 완료해야 하는 작업
  // ========================================
  try {
    // 개인정보 암호화 (실패 시 저장 안 함)
    const encrypted = await encryptData(data);
    
    // DB 저장 (반드시 완료)
    await db.insert({ encrypted });
  } catch (error) {
    // 실패 시 즉시 에러 반환
    return Response.json({ error: 'critical_failure' }, { status: 500 });
  }
  
  // ========================================
  // ✅ NON-CRITICAL: 실패해도 계속 진행
  // ========================================
  try {
    // 분석 로그 (실패해도 괜찮음)
    await analytics.track({ event: 'inquiry_received' });
  } catch (error) {
    console.error('Analytics failed (non-critical):', error);
  }
  
  // 모든 작업 완료 후 응답
  return Response.json({ ok: true });
}
```

**장점**:
- 다음 개발자가 코드 의도를 명확히 이해
- 작업 우선순위가 명확
- 유지보수 용이

---

## 📋 체크리스트

API route를 작성할 때 다음을 확인하세요:

### 응답 전 완료해야 하는 작업 (CRITICAL)
- [ ] DB 저장 (insert, update, delete)
- [ ] 개인정보 암호화
- [ ] 결제 처리
- [ ] 외부 API 호출 (중요한 것)
- [ ] 파일 업로드/다운로드

### 실패해도 괜찮은 작업 (NON-CRITICAL)
- [ ] 분석/로그 (analytics, tracking)
- [ ] 알림 (실패 시 재시도 가능한 것)
- [ ] 캐시 업데이트
- [ ] 비중요 외부 API 호출

### 절대 하지 말아야 할 것
- [ ] ~~void IIFE~~
- [ ] ~~fire-and-forget Promise~~
- [ ] ~~setTimeout/setInterval~~
- [ ] ~~백그라운드 작업 의존~~

---

## 🔍 코드 리뷰 시 확인 사항

```typescript
// ❌ 이런 패턴 발견 시 즉시 수정
void (async () => { ... })();
Promise.resolve(...);
setTimeout(() => { ... }, ...);

// ❌ await 없이 DB 저장
db.insert({ data });  // await 없음!

// ❌ catch 없는 중요한 작업
await criticalOperation();  // try-catch 없음!
```

---

## 💡 실전 예시

### Before (위험)

```typescript
export async function POST(request: Request) {
  const inquiry = await request.json();
  
  // ❌ 백그라운드로 저장
  void (async () => {
    await db.insert({ inquiry });
  })();
  
  // 빠른 응답
  return Response.json({ ok: true });
}
```

### After (안전)

```typescript
export async function POST(request: Request) {
  const inquiry = await request.json();
  
  // ✅ 응답 전 저장 완료
  try {
    await db.insert({ inquiry });
  } catch (error) {
    console.error('DB insert failed:', error);
    return Response.json({ 
      ok: false, 
      error: 'storage_failed' 
    }, { status: 500 });
  }
  
  // 저장 완료 후 응답
  return Response.json({ ok: true });
}
```

---

## 📚 참고: Vercel 공식 문서

> "All code inside a Serverless Function is run during the request-response cycle. 
> After the response is sent, the execution environment is frozen."

출처: https://vercel.com/docs/functions/serverless-functions

**해석**: 응답을 보낸 후에는 실행 환경이 즉시 정지됩니다. 
따라서 응답 후 실행되어야 하는 코드는 절대 신뢰할 수 없습니다.

---

## ✅ 이 프로젝트에 적용된 패턴

### 수정 전 (P0 작업 전)
```typescript
// ❌ chat API
void (async () => {
  await supabaseAdmin.from("normalized_inquiries").insert({...});
})();
```

### 수정 후 (P0 작업 후)
```typescript
// ✅ chat API
try {
  await supabaseAdmin.from("normalized_inquiries").insert({...});
} catch (error) {
  console.error('Insert failed:', error);
  // 로그 남기고 계속 진행 (채팅 응답은 유지)
}
```

---

## 🎯 결론

### 기억해야 할 핵심 3가지

1. **중요한 작업은 응답 전에 await로 완료**
2. **백그라운드 작업은 서버리스에서 신뢰할 수 없음**
3. **에러는 반드시 try-catch로 처리**

### 의심스러울 때는

"이 작업이 실패하면 사용자/운영에 문제가 되나?"
- **예** → await로 응답 전 완료
- **아니오** → 그래도 await (더 안전)

**원칙**: 서버리스 환경에서는 "빠른 응답"보다 "확실한 처리"가 우선입니다.
