# Toast 사용법 가이드

## 🎯 Toast란?

Toast는 화면에 잠깐 나타났다 사라지는 알림 메시지입니다. 
기존의 `alert()` 대신 사용하는 더 예쁘고 사용자 친화적인 방법입니다.

## 📝 사용 방법

### 1. 컴포넌트에서 Toast 사용하기

```javascript
import { useToast } from '../components/Toast';

function MyComponent() {
  const toast = useToast(); // Toast 사용 준비
  
  // 성공 메시지
  toast.success("저장되었습니다!");
  
  // 에러 메시지
  toast.error("에러가 발생했습니다.");
  
  // 정보 메시지
  toast.info("알림: 새로운 기능이 추가되었습니다.");
  
  // 경고 메시지
  toast.warning("주의: 이 작업은 되돌릴 수 없습니다.");
}
```

### 2. 메시지 타입

- **success** (성공): 초록색 배경, 체크 아이콘
- **error** (에러): 빨간색 배경, X 아이콘
- **info** (정보): 파란색 배경, 정보 아이콘
- **warning** (경고): 노란색 배경, 경고 아이콘

### 3. 실제 사용 예시

#### 로그인 성공 시
```javascript
toast.success("로그인되었습니다!");
```

#### 저장 실패 시
```javascript
toast.error("저장에 실패했습니다: " + error.message);
```

#### 정보 알림
```javascript
toast.info("준비 중인 기능입니다.");
```

## ✅ 완료된 작업

- ✅ Toast 컴포넌트 생성
- ✅ App.jsx에 ToastProvider 추가
- ✅ 모든 `alert()` 호출을 `toast`로 교체
  - App.jsx (로그아웃)
  - AdminPage.jsx (저장, 업로드, 권한 체크)
  - InquiryPage.jsx (폼 검증, 에러)
  - AuthPages.jsx (로그인, 회원가입)

## 🎨 Toast 위치

Toast 메시지는 화면 **우측 상단**에 표시되며, 3초 후 자동으로 사라집니다.
사용자가 X 버튼을 클릭하면 즉시 사라집니다.

## 💡 팁

- 성공 메시지는 짧고 명확하게
- 에러 메시지는 사용자가 이해할 수 있도록 구체적으로
- 너무 긴 메시지는 피하세요 (최대 2줄 권장)
