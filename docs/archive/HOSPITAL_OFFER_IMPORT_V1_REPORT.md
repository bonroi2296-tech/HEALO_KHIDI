# HOSPITAL_OFFER_IMPORT_V1 구현 보고

## 1) 변경/추가된 파일 목록

### 신규 추가
- `migrations/20260226_treatment_sources.sql` — 출처 저장 테이블
- `src/lib/hospitalOffers/types.ts` — 미리보기/Apply 페이로드 타입
- `src/lib/hospitalOffers/ssrfSafeFetch.ts` — SSRF 방지 fetch
- `src/lib/hospitalOffers/crawlPipeline.ts` — 병원 웹사이트 크롤(키워드 링크 수집)
- `src/lib/hospitalOffers/extractOffersLLM.ts` — LLM으로 대표 시술 3개 추출
- `app/api/admin/hospitals/[id]/offers/preview/route.ts` — 미리보기 API (DB 미반영)
- `app/api/admin/hospitals/[id]/offers/apply/route.ts` — 미리보기 payload DB 반영
- `app/admin/hospitals/_client/HospitalOffersPreview.jsx` — 미리보기 모달 + 카드/근거 토글
- `docs/HOSPITAL_OFFER_IMPORT_V1_REPORT.md` — 본 보고서

### 수정
- `app/admin/hospitals/_client/HospitalManager.jsx` — 오퍼 미리보기 버튼·상태·모달 연동

---

## 2) 새로 추가한 API 라우트 + Request/Response 예시

### GET/POST `/api/admin/hospitals/[id]/offers/preview`

- **목적:** 해당 병원의 `website` 기준으로 크롤·LLM 추출 후 **미리보기만** 반환 (DB 반영 없음).
- **권한:** `requireAdminAuth` + ADMIN rate limit.
- **Request:**  
  - `[id]`: 병원 UUID (path).  
  - Body 없음 (GET 또는 POST).
- **Response 200 (성공):**
```json
{
  "ok": true,
  "hospital_id": "uuid",
  "captured_at": "2026-02-26T12:00:00.000Z",
  "sources": [
    { "url": "https://hospital.example.com", "type": "html", "title": null }
  ],
  "offers": [
    {
      "treatment": {
        "name": "보톡스",
        "slug": "botox",
        "description": null,
        "full_description": null,
        "duration": 30,
        "anesthesia_type": "국소",
        "recovery_time_min": 0,
        "recovery_time_max": 1,
        "side_effects": [],
        "precautions": [],
        "price_min": 200000,
        "price_max": 400000,
        "currency": "KRW",
        "price_includes": ["상담", "시술"],
        "tags": [],
        "images": []
      },
      "evidence": {
        "name": {
          "source_url": "https://hospital.example.com/treatments",
          "snippet_or_ocr_text": "보톡스 시술 안내..."
        }
      },
      "confidence": 0.85
    }
  ]
}
```
- **Response 200 (웹사이트 없음):** `sources: []`, `offers: []`.
- **Response 404:** `hospital_not_found`.

---

### POST `/api/admin/hospitals/[id]/offers/apply`

- **목적:** 미리보기 payload를 받아 `treatments` upsert + `treatment_sources` 삽입.
- **권한:** `requireAdminAuth` + ADMIN rate limit.
- **Request:**  
  - `[id]`: 병원 UUID (path).  
  - Body: Preview와 동일한 구조 (`hospital_id`, `captured_at`, `sources`, `offers`).
- **Response 200:**
```json
{
  "ok": true,
  "created": 2,
  "updated": 1,
  "treatment_ids": ["uuid1", "uuid2", "uuid3"]
}
```
- **Response 400:** `hospital_id_mismatch` 또는 `invalid_json`.
- **Response 404:** `hospital_not_found`.

---

## 3) DB 변경 사항 (Migration SQL)

- **선택:** Option B — 신규 테이블 `public.treatment_sources` 사용.  
  출처/근거를 `treatments.i18n`에 넣지 않고 별도 테이블로 관리해 스키마가 명확하고, 감사/중복 방지에 유리함.

- **파일:** `migrations/20260226_treatment_sources.sql` (전문은 해당 파일 참고).

- **롤백:**
```sql
DROP POLICY IF EXISTS "treatment_sources_all_service_role" ON public.treatment_sources;
DROP TABLE IF EXISTS public.treatment_sources;
```

---

## 4) UI 설명 (어떤 화면에 무엇이 추가됐는지)

- **위치:** 관리자 > **병원관리** 탭에서 병원을 **선택해 편집 화면**을 연 상태.
- **추가된 요소:**
  - 상단 sticky 헤더(병원 정보 수정 / 신규 병원 등록 제목 옆)에 **「대표 시술 3개 자동 생성 (OCR 포함)」** 버튼이 추가됨.  
    (데이터 수집 버튼 왼쪽, 병원 선택 시에만 표시.)
  - 클릭 시:
    1. `POST /api/admin/hospitals/{id}/offers/preview` 호출.
    2. **미리보기 모달**이 열리고, 수집 시점(`captured_at`), **Source 보기** 링크 목록, **최대 3개 시술 카드**가 표시됨.
    3. 각 카드: 시술명, 가격범위, 소요시간, 회복, 마취, 포함항목, 이미지 썸네일(있을 때), **「근거 텍스트 보기/숨기기」** 토글로 evidence 스니펫 확인 가능.
    4. **「확정 저장」** 클릭 시 `POST .../offers/apply`로 위 payload를 그대로 보내 DB 반영.  
  - **닫기**로 모달만 닫을 수 있으며, 확정 저장 전에는 DB에 반영되지 않음.

---

## 5) 성공/실패 검증 기준 + 로컬 재현 절차

### 성공 기준
- Preview 200 응답, `offers` 0~3개 반환.
- Apply 후 `treatments`에 0~3개 생성/업데이트, `hospital_id` 연결.
- 각 treatment에 대해 `treatment_sources`에 출처 1건 이상 존재.
- SSRF 차단: `file://`, `http://127.0.0.1` 등 사설/로컬 URL 거부.
- 출처 없는 필드는 null 유지; "verified" 문구/확정가 표현 없음.
- `npm run build` 통과.

### 실패 기준
- 출처 없이 가격/회복/마취 등 임의 생성.
- 외부 URL fetch에서 SSRF 취약.
- Preview 없이 바로 DB 반영 (반영은 Apply 전용).
- Apply 시 같은 병원에서 반복 실행 시 동일 slug로 업데이트되며, 새 slug는 충돌 방지(접미사)로 처리되어 중복 폭발 없음.

### 로컬 재현 절차
1. **마이그레이션 적용**  
   Supabase SQL Editor에서 `migrations/20260226_treatment_sources.sql` 실행.
2. **환경 변수**  
   LLM 사용 시 `GOOGLE_GENERATIVE_AI_API_KEY` 또는 `OPENAI_API_KEY` 설정. (없으면 Preview는 200이지만 `offers`는 빈 배열일 수 있음.)
3. **관리자 로그인**  
   `/admin` 로그인 후 **병원관리** 이동.
4. **병원 선택**  
   웹사이트 URL이 있는 병원 선택 후 편집 화면 진입.
5. **Preview**  
   「대표 시술 3개 자동 생성 (OCR 포함)」 클릭 → 모달에서 수집 시점·sources·0~3개 카드 확인.
6. **Apply**  
   「확정 저장」 클릭 → `treatments` 및 `treatment_sources`에 반영 확인.
7. **SSRF 테스트 (선택)**  
   `ssrfSafeFetch`에 `http://127.0.0.1` 또는 `file:///etc/passwd` 등 넣어 호출 시 `ok: false`, `error` 반환 확인.

---

## 참고
- **크롤:** 현재는 fetch 기반으로 메인 URL + 키워드(treatment/procedure/program/price 등) 링크 상위 페이지만 수집. PDF/이미지 OCR은 추후 확장 가능.
- **Playwright:** 동적 렌더링이 필요하면 `crawlPipeline.ts`에서 Playwright를 선택적으로 사용하도록 확장 가능.
