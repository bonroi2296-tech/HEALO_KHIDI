# 🚫 Legacy Import 가드레일

## 목표

`src/legacy-pages/**`에 대한 **신규 import를 방지**하여 레거시 코드 확산을 차단합니다.

---

## 규칙

### ❌ 금지: 신규 파일에서 legacy-pages import

```javascript
// ❌ 금지
import { SomeComponent } from "../src/legacy-pages/SomeComponent";
import { AnotherPage } from "../../src/legacy-pages/AnotherPage";
```

**ESLint 경고:**
```
🚫 Legacy import detected: src/legacy-pages는 신규 import가 금지됩니다. 
기존 컴포넌트를 재사용하거나 새로운 구조로 작성하세요.
```

---

### ✅ 허용: Allowlist 파일들

다음 파일들은 기존 wrapper로서 예외 허용됩니다:

1. `src/AdminPage.jsx`
2. `app/login/page.jsx`
3. `app/signup/page.jsx`
4. `app/success/page.jsx`
5. `app/hospitals/[slug]/HospitalDetailClient.jsx`
6. `app/treatments/[slug]/TreatmentDetailClient.jsx`

---

## 대안

### 새로운 기능 구현 시

1. **컴포넌트 재작성:**
   ```javascript
   // ✅ 권장
   // app/new-feature/NewComponent.jsx
   export function NewComponent() {
     // 새로운 구조로 작성
   }
   ```

2. **app/_legacy/ 패턴 사용:**
   ```javascript
   // ✅ 허용 (inquiry 패턴)
   // app/inquiry/_legacy/InquiryPage.jsx (복사본)
   import { InquiryPage } from "./_legacy/InquiryPage";
   ```

3. **공통 로직 분리:**
   ```javascript
   // ✅ 권장
   // src/lib/common-logic.js
   export function sharedFunction() {
     // legacy와 new 모두 사용 가능
   }
   ```

---

## ESLint 설정

**파일:** `eslint.config.js`

```javascript
{
  rules: {
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: ['**/src/legacy-pages/**', '...'],
            message: '🚫 Legacy import detected: src/legacy-pages는 신규 import가 금지됩니다.',
          },
        ],
      },
    ],
  },
}
```

---

## 실행 방법

### Lint 실행
```bash
npm run lint
```

### Lint + 자동 수정
```bash
npm run lint:fix
```

---

## FAQ

### Q: 기존 파일을 수정할 때는?

**A:** Allowlist에 포함된 파일은 수정 가능합니다. 새로운 파일에서 legacy import만 금지됩니다.

### Q: 긴급하게 legacy를 사용해야 한다면?

**A:** 
1. **1순위:** `app/_legacy/` 폴더로 복사 후 사용
2. **2순위:** ESLint disable (최후의 수단)
   ```javascript
   // eslint-disable-next-line no-restricted-imports
   import { Component } from "../src/legacy-pages/Component";
   ```
3. **3순위:** Allowlist에 추가 (팀 승인 필요)

### Q: Warning vs Error?

**A:** 현재 `warn` 레벨로 설정되어 있습니다. 빌드는 통과하지만 경고가 표시됩니다. 팀이 안정화되면 `error`로 변경 예정입니다.

---

## 관련 문서


---

**✅ 작업 완료일:** 2026-01-13  
**✅ 담당자:** AI Assistant  
**✅ 목적:** Legacy 코드 확산 방지 및 코드베이스 현대화
