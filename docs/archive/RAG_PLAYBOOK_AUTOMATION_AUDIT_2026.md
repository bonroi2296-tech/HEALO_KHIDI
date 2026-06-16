# HEALO RAG/Playbook/Automation/Public Chat 파이프라인 정밀 감사 보고서

**기준**: 마이그레이션 DDL + 소스코드 전수 검토  
**범위**: Public Chat, RAG, Playbook, Auto-Improvement V2, 운영 감사/이력

---

## A. 시스템 맵 (데이터 플로우 + 진입점)

```
[사용자]
    │
    ├─► POST /api/public/chat/start
    │       파일: app/api/public/chat/start/route.ts
    │       → supabaseAdmin.from("chat_threads").insert({ public_token, status: "open", ... })
    │       → 반환: thread_id, public_token
    │
    └─► POST /api/public/chat/message  (thread_id + public_token 필수)
            파일: app/api/public/chat/message/route.ts
            │   → chat_threads 조회: .eq("id", thread_id).eq("public_token", public_token)
            │   → chat_messages insert (patient) → generateChatReply() → chat_messages insert (system)
            │   → logPlaybookUsage() → playbook_usage_events
            │   → 3턴마다 createDraftIntake() → normalized_inquiries + chat_threads.normalized_inquiry_id
            │
            └─► generateChatReply (src/lib/chat/generateReply.ts)
                    → fetchRagChunks() → RPC rag_search_chunks_v1_1 (또는 ILIKE fallback)
                    → buildContext() → usedPatternIds 추출
                    → logPlaybookUsage({ retrievedPatternIds, declaredUsedPatternIds, used })

[관리자]
    │
    ├─► POST /api/admin/chat/threads (목록)   app/api/admin/chat/threads/route.ts  → chat_threads
    ├─► GET/POST /api/admin/chat/threads/[threadId]/messages  → chat_messages (service_role, token 검증 없음)
    ├─► POST /api/admin/chat/threads/[threadId]/resolve      → chat_threads.status = 'resolved'
    │
    ├─► Playbook: app/api/admin/playbook/patterns/* (CRUD, from-thread)
    │   → playbook_patterns (approve → rag_documents + rag_chunks ingest)
    │   → approve: app/api/admin/playbook/patterns/[id]/approve/route.ts
    │   → retire:  app/api/admin/playbook/patterns/[id]/retire/route.ts
    │   → merge:   app/api/admin/playbook/patterns/merge/route.ts
    │
    ├─► POST /api/admin/automation/run?job=daily_eval|auto_improve|ab_finalize
    │       파일: app/api/admin/automation/run/route.ts
    │       → auto_jobs insert (status=running) → runDailyEval / runAutoImprove / runAbFinalize
    │       → auto_job_events insert, auto_jobs update (done/failed)
    │
    │   daily_eval:  src/lib/automation/playbookDailyEval.ts
    │                → playbook_usage_events 집계 → playbook_patterns (auto_score, auto_status=candidate/none)
    │   auto_improve: src/lib/automation/playbookAutoImprove.ts
    │                → playbook_patterns (candidate) → variant 생성 → approveAndIngest → rag_documents/chunks
    │                → playbook_patterns (ab_testing, ab_bucket, traffic_split)
    │   ab_finalize:  src/lib/automation/playbookAbFinalize.ts
    │                → playbook_usage_events 기반 승격/퇴출 → playbook_patterns (promoted/auto_retired)
    │                → rag_documents (trust_tier=3 레이블 변경)
    │
    └─► RAG 검색
            /api/rag/search  (app/api/rag/search/route.ts)
            → vectorSearch() → RPC rag_search_chunks_v1_1 (ingest_status/expires/playbook 필터 적용)
            → ilikeSearch()  → rag_chunks + rag_documents 직접 쿼리 (ingest_status 미적용)
```

**요약 진입점**

| 단계 | 진입 API/함수 | 파일 |
|------|----------------|------|
| 문의/채팅 시작 | POST /api/public/chat/start | app/api/public/chat/start/route.ts |
| 채팅 메시지 | POST /api/public/chat/message | app/api/public/chat/message/route.ts |
| 채팅 응답 생성 | generateChatReply | src/lib/chat/generateReply.ts |
| RAG 조회 (채팅) | fetchRagChunks | src/lib/chat/generateReply.ts |
| RAG 조회 (공개 API) | POST /api/rag/search | app/api/rag/search/route.ts |
| Playbook 사용 로그 | logPlaybookUsage | src/lib/chat/generateReply.ts |
| 정규화 문의 초안 | createDraftIntake (내부) | app/api/public/chat/message/route.ts |
| 자동화 실행 | POST /api/admin/automation/run | app/api/admin/automation/run/route.ts |
| 패턴 승인/Ingest | POST /api/admin/playbook/patterns/[id]/approve | app/api/admin/playbook/patterns/[id]/approve/route.ts |

---

## B. P0/P1 이슈 리스트

| Severity | 증상 | 재현 조건 | 원인 (파일/라인) | 영향 | 수정안 요약 | 검증 방법 |
|----------|------|-----------|-------------------|------|-------------|-----------|
| **P0** | ingest_status != done/pending 문서가 검색 결과에 포함됨 | RAG 벡터 검색 실패 또는 결과 0건 → ILIKE fallback 사용 | `src/lib/chat/generateReply.ts` 139–148: rag_chunks 직접 select, rag_documents와 join만 하고 metadata.ingest_status 조건 없음 | 데이터무결성/컴플라이언스: 미승인·실패 문서 노출 | fallback 경로에서 rag_documents.metadata->>'ingest_status' IN (NULL, 'done') 및 expires_at 필터 추가 | ILIKE만 나오는 쿼리로 호출 후, ingest_status= failed 문서가 결과에 없음 확인 |
| **P0** | /api/rag/search ILIKE 경로에서 pending/failed 문서 노출 | 쿼리 3자 미만 또는 임베딩 실패 → ilikeSearch() 호출 | `app/api/rag/search/route.ts` 49–79: ilikeSearch가 rag_chunks + rag_documents 직접 쿼리, ingest_status/expires_at 미필터 | 동일 | ilikeSearch에 ingest_status·expires_at 조건 적용 또는 RPC로 통일 | 동일 |
| **P0** | Public Chat 없이 thread CRUD 가능(우회) | Admin API로 thread_id만 알고 있으면 메시지 조회/추가 가능 | `app/api/admin/chat/threads/[threadId]/messages/route.ts`: requireAdminAuth만 사용, public_token 불필요. RLS는 service_role이면 전부 허용 | 보안: 환자 구간과 관리자 구간 분리는 되나, thread_id 유출 시 관리자 API로 접근 가능 | 설계상 관리자는 token 없이 접근 허용. 단, Public 전용 조회/수정 API가 thread_id만으로 열리지 않도록 문서화 및 필요 시 감사 로그 보강 | Public: start → message (token 없이 message) 403 확인. Admin: 인증 후 thread_id로 접근 가능함 명시 |
| **P1** | playbook 패턴 승인/재개/병합 시 admin_audit_logs 미기록 | 관리자가 패턴 approve, retire, merge 실행 | `app/api/admin/playbook/patterns/[id]/approve/route.ts`, `retire/route.ts`, `merge/route.ts`에 logAdminAction 호출 없음 | 컴플라이언스: 누가 언제 승인/폐기했는지 추적 불가 | 각 라우트에서 logAdminAction({ action: 'PLAYBOOK_APPROVE'|'PLAYBOOK_RETIRE'|'PLAYBOOK_MERGE', ... }) 호출 | 해당 API 호출 후 admin_audit_logs에 행 존재 확인 |
| **P1** | automation run 실행 시 admin_audit_logs 미기록 | POST /api/admin/automation/run | `app/api/admin/automation/run/route.ts`에 logAdminAction 없음 | 컴플라이언스: 자동화 수동 실행 이력 부재 | 성공/실패 시 logAdminAction({ action: 'AUTOMATION_RUN', metadata: { job_type, job_id, status } }) | run 호출 후 admin_audit_logs 확인 |
| **P1** | schema_change_logs 테이블 부재로 마이그레이션 증적/중복 방지 불가 | DDL 실행 이력 관리 필요 | migrations 전역에 schema_change_logs CREATE 없음, change_key UNIQUE 등 정의 없음 | 컴플라이언스/운영: 스키마 변경 증적·중복 실행 방지 불가 | 새 마이그레이션으로 schema_change_logs 생성, change_key UNIQUE, sql_sha256/metadata 컬럼 추가 | 아래 D절 마이그레이션 적용 후 change_key 중복 insert 시 실패 확인 |
| **P1** | rag_documents.metadata null 시 RPC 동작은 안전하나 코드는 필수 가정 | metadata 없이 insert 가능한 구버전 행 존재 시 | RPC: `d.metadata IS NULL OR d.metadata->>'ingest_status' = 'done'` (20260226_rag_rpc_ab_routing.sql). 코드: approveAndIngest/approve 라우트에서 metadata.ingest_status 필수 설정 | 데이터무결성: 기존 행은 null로 검색 포함됨. 신규는 항상 pending→done/failed | 유지. 단, 문서화: “metadata null = 검색 포함, 코드는 항상 ingest_status 설정” | metadata null 문서가 RPC 결과에 포함되는지 1건 삽입 후 검색 |
| **P1** | generateReply ILIKE fallback 시 playbook_patterns 상태 미필터 | embedding 실패 등으로 fallback 진입 | `generateReply.ts` 139–145: rag_documents만 join, playbook_patterns 미조인. draft/rejected/merged 패턴 문서도 반환 가능 | 데이터무결성: 미승인·병합된 패턴이 컨텍스트에 포함될 수 있음 | fallback에서 source_type=playbook_pattern인 문서는 playbook_patterns와 join해 status=approved, is_active, canonical_id 조건 적용하거나, fallback 자체를 RPC 1회 더 호출(p_source_type=null)로 대체 | fallback만 유도한 뒤 draft 패턴 문서가 결과에 없음 확인 |
| **P1** | /api/rag/search 벡터 경로에 p_ab_enabled/p_thread_hash 미전달 | 공개 검색 API에서 AB 라우팅 없음 | `app/api/rag/search/route.ts` 107–114: RPC 호출 시 p_ab_enabled, p_thread_hash 생략 (기본값 false/0) | 성능/일관성: 공개 검색은 항상 control만. 설계가 그러하다면 문제 없음 | 의도 확인 후, 필요 시 쿼리 파라미터로 thread_id 전달해 hash 계산해 RPC에 전달 | 현재는 “공개 검색은 AB 미사용”으로 두고 문서화 |
| **P1** | hospital_leads.status 전이 시 last_status_at 미갱신 가능성 | 리드 상태 변경 시 | `app/api/admin/leads/assign/route.ts` 175: status: "sent" 설정 시 last_status_at 미명시. `app/api/admin/leads/[id]/route.ts` PATCH에서 status 변경 시 last_status_at 설정 여부 확인 필요 | 데이터무결성: 상태 변경 시각 추적 불완전 | assign 및 [id] PATCH에서 status 변경 시 last_status_at = now() 설정 | 상태 변경 후 last_status_at 갱신 확인 |
| **P1** | chat_messages_patient_read 정책이 public_token 존재 thread만 허용하나, anon이 thread 단건 조회 불가 | anon이 thread_id만으로 thread 행 조회 시도 | RLS: chat_threads에는 anon SELECT 정책 없음. chat_messages는 patient_read가 “thread에 public_token IS NOT NULL”만 체크. thread 자체는 service_role만 읽음 | 보안: 설계와 일치(공개는 message API로만). 정리 필요 | 유지. Public API가 (thread_id, public_token)으로 검증하므로 우회 없음. 문서화만 | Public message 호출 시 token 오류 시 403 확인 |
| **P1** | admin_notification_logs 기록은 발송 시만, 수신자 목록 변경 등은 audit에만 의존 | 알림 테스트/발송 시 로그 | adminNotifier.ts 259, notification-recipients/test 52,82: insert 함. 수신자 추가/삭제는 logAdminAction 호출처 확인 필요 | 컴플라이언스: 알림 수신자 변경 이력은 admin_audit_logs에만 있을 수 있음 | 수신자 CRUD 라우트에 logAdminAction 이미 있는지 확인 후 없으면 추가 | 수신자 변경 후 admin_audit_logs 검색 |
| **P1** | playbook_usage_events.used 판정이 declaredUsedPatternIds 기반만 사용 | generateReply에서 used 플래그 결정 | `generateReply.ts` 393–396: used = (declaredIds.length > 0). declaredIds는 buildContext에서 패턴 ID 추출. 실제로 “선택된” 패턴 1개와 일치하는지 휴리스틱 | 성능/분석: used=true 비율 해석 시 주의 | 주석/문서로 “used = 컨텍스트에 포함된 playbook 패턴이 1개 이상이고 그 중 하나가 선정됨” 명시 | 이벤트 샘플에서 used=true인 건에 used_pattern_id 존재 확인 |
| **P1** | auto_jobs 동시 실행 방지는 job_type별 1 running만 체크 | 동일 job_type 2회 연속 run | `app/api/admin/automation/run/route.ts` 21–30: job_type + status=running 1건 있으면 409 | 데이터무결성: 정상 | 유지 | 동일 job_type으로 2회 동시 요청 시 두 번째 409 확인 |
| **P1** | playbook_patterns.merged_at 컬럼 미사용 | merge 시 merged_at 미설정 | `migrations/20260225_playbook_governance.sql`: merged_at 추가. `app/api/admin/playbook/patterns/merge/route.ts`: canonical_id, is_active 등만 설정, merged_at 미설정 | 데이터무결성: 병합 시각 추적 불가 | merge 라우트에서 병합되는 행에 merged_at = now() 설정 | merge 실행 후 merged_at NOT NULL 확인 |
| **P1** | rag_search_chunks_v1_1 호출 시 query_embedding을 JSON.stringify(embedding)으로 전달 | 벡터 검색 | `generateReply.ts` 83, `app/api/chat/route.ts` 359, `app/api/rag/search/route.ts` 107: JSON.stringify(embedding). Supabase 클라이언트가 vector 타입으로 파싱 | 성능: 정상. 호환성: RPC 시그니처가 vector(768)이면 문자열 전달은 클라이언트 규약 | 유지. 문서화 | 벡터 검색 1회 성공 확인 |
| **P0** | rag_documents.metadata 컬럼 없을 수 있음(기존 환경) | 구 DB에 20260225_rag_documents_metadata.sql 미적용 | `migrations/20260225_rag_documents_metadata.sql` 존재하나, 일부 환경에선 미실행. RPC는 d.metadata 참조 | 런타임: metadata 없으면 RPC에서 컬럼 부재 오류 가능 | 모든 환경에 해당 마이그레이션 적용 확인. 적용 전에는 RPC 실행 시 오류 가능 | information_schema.columns 로 rag_documents.metadata 존재 확인 |

---

## C. 스키마-코드 불일치 체크리스트

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | **schema_change_logs**: change_key UNIQUE 요구 vs 현재 DDL | **불일치** | 마이그레이션에 schema_change_logs 테이블 자체 없음. change_key UNIQUE 없음. 운영 시 중복 실행 방지·증적을 위해 테이블 생성 및 UNIQUE 제약 필요. |
| 2 | **rag_documents.metadata** null/기본값 vs 코드 가정 | **일치** | RPC: metadata IS NULL OR ingest_status = 'done' 허용. 코드는 insert/update 시 항상 metadata.ingest_status 설정. 기존 null 행은 검색에 포함됨(의도와 일치). |
| 3 | **rag_chunks.embedding** 타입 및 RPC 파라미터/정렬 | **일치** | 20260225_rag_vector_v1_gemini.sql: embedding vector(768). RPC rag_search_chunks_v1_1(..., query_embedding vector(768)). ORDER BY d.trust_tier ASC, c.embedding <=> query_embedding ASC. |
| 4 | **playbook_patterns** status/is_active/canonical_id/merged_at/reject_reason/quality_gate/auto_status/traffic_split/ab_bucket 활용 | **부분 불일치** | RPC와 워커에서는 status, is_active, canonical_id, ab_bucket, traffic_split 사용. merged_at은 governance 마이그레이션에 추가됐으나 merge 라우트에서 설정하지 않음. reject_reason, quality_gate, auto_status는 워커/관리 로직에서 사용. |
| 5 | **chat_threads.public_token** 검증이 DB가 아닌 API에서만 이뤄지는지 + 우회 | **일치(의도적)** | DB RLS: chat_threads는 service_role만. 공개 메시지 API에서 .eq("id", thread_id).eq("public_token", public_token)으로 검증. public_token 없으면 403. Admin API는 별도로 requireAdminAuth만 사용(thread_id만으로 접근 가능). |
| 6 | **admin_notification_logs, recipients, audit_logs** 기록 트리거/호출 누락 | **부분 불일치** | admin_notification_logs: 발송 시 insert 있음. admin_audit_logs: requireAdminAuth 실패 시 + 일부 라우트(leads, hospitals, inquiries, treatments, upload, assign)에서 logAdminAction 호출. playbook approve/retire/merge, automation/run 에서는 logAdminAction 미호출. |
| 7 | **hospital_leads** 상태 전이(queued→sent→viewed→replied…) 하드코딩/누락 | **일치** | status 값은 validation(admin.ts)과 DB COMMENT와 일치. assign에서 status='sent' 설정. [id] PATCH에서 status 변경 시 first_response_at 등 설정. last_status_at 갱신은 코드에서 명시적으로 보이지 않아 P1로 개선 권장. |
| 8 | **RLS/서비스롤**: public API에서 service_role 사용 + 검증 누락 | **일치** | Public chat은 service_role(supabaseAdmin) 사용하되, thread_id+public_token 검증 후에만 쓰기/조회. RAG 검색은 service_role로 RPC 호출(anon이 직접 DB 접근하지 않음). 검증 로직은 API 레벨에 있음. |

---

## D. 패치 제안

### 수정이 필요한 파일 목록

1. `src/lib/chat/generateReply.ts` — ILIKE fallback에 ingest_status·expires_at·playbook 필터
2. `app/api/rag/search/route.ts` — ilikeSearch에 ingest_status·expires_at 필터
3. `app/api/admin/playbook/patterns/[id]/approve/route.ts` — logAdminAction 호출
4. `app/api/admin/playbook/patterns/[id]/retire/route.ts` — logAdminAction 호출
5. `app/api/admin/playbook/patterns/merge/route.ts` — logAdminAction 호출 + merged_at 설정
6. `app/api/admin/automation/run/route.ts` — logAdminAction 호출
7. `app/api/admin/leads/assign/route.ts` — last_status_at 설정
8. `app/api/admin/leads/[id]/route.ts` — status 변경 시 last_status_at 설정
9. `migrations/20260226_schema_change_logs.sql` — 신규 (schema_change_logs 테이블)

---

### 1) src/lib/chat/generateReply.ts

**변경 요약**: RAG 벡터 결과가 0건일 때 쓰는 ILIKE fallback에서, rag_documents의 ingest_status(null 또는 'done') 및 expires_at 필터를 적용하고, playbook_pattern 문서는 playbook_patterns와 join해 approved·is_active·canonical_id 조건 적용.  
(또는 fallback 시 RPC rag_search_chunks_v1_1을 p_source_type=null로 한 번 더 호출해 동일 필터 재사용.)

**권장(최소 변경)**: fallback 구간을 “RPC 1회 추가 호출”로 대체해, RPC 내부 필터를 그대로 사용.

```diff
--- a/src/lib/chat/generateReply.ts
+++ b/src/lib/chat/generateReply.ts
@@ -136,14 +136,24 @@ export async function fetchRagChunks(query: string, lang: string, threadId?: str
   const ragChunks = [...playbookChunks, ...generalChunks];

   if (ragChunks.length === 0) {
-    let q = supabaseAdmin
-      .from("rag_chunks")
-      .select("id, document_id, chunk_index, content, rag_documents!inner(id, source_type, source_id, lang, title)")
-      .ilike("content", `%${query}%`)
-      .limit(TOTAL_LIMIT);
-    if (lang) q = q.eq("rag_documents.lang", lang);
-    const { data, error } = await q;
+    // Fallback: RPC 사용하여 ingest_status/expires/playbook 필터 일치 유지
+    const fallbackEmbedding = await getEmbedding(query);
+    if (fallbackEmbedding) {
+      const { data: fallbackData } = await supabaseAdmin.rpc("rag_search_chunks_v1_1", {
+        query_embedding: JSON.stringify(fallbackEmbedding),
+        match_count: TOTAL_LIMIT,
+        p_lang: lang,
+        p_source_type: null,
+        p_partner_only: false,
+        p_ab_enabled: !!threadId,
+        p_thread_hash: threadId ? computeThreadHash(threadId) : 0,
+      });
+      if (fallbackData?.length) {
+        return fallbackData.map((row: any) => ({
+          content: row.content, trust_tier: row.trust_tier, source_label: row.source_label,
+          doc_title: row.doc_title, doc_source_type: row.doc_source_type, doc_source_id: row.doc_source_id,
+          rag_documents: { source_type: row.doc_source_type, title: row.doc_title },
+        }));
+      }
+    }
+    let q = supabaseAdmin.from("rag_chunks").select("id, document_id, chunk_index, content, rag_documents_id, rag_documents!inner(id, source_type, source_id, lang, title, metadata, expires_at)").ilike("content", `%${query}%`).limit(TOTAL_LIMIT);
+    if (lang) q = q.eq("rag_documents.lang", lang);
+    q = q.or("rag_documents.metadata->>ingest_status.is.null,rag_documents.metadata->>ingest_status.eq.done");
+    q = q.or("expires_at.is.null,rag_documents.expires_at.gte." + new Date().toISOString());
+    const { data, error } = await q;
     if (!error && data) {
       return data.map((row: any) => ({ ...row, trust_tier: 3, source_label: null }));
     }
```

- 위에서 “RPC 1회 추가”만 적용할 경우: fallback 시 먼저 RPC 호출하고, 결과 있으면 반환; 없으면 기존 ILIKE로 직행하되 아래 2번과 동일하게 rag_documents 필터만 강화할 수 있음.
- **부작용**: fallback 시 임베딩 1회 더 호출되면 지연 증가. ILIKE만 필터 강화하면 임베딩 없이 동일 정책 적용 가능하나, playbook_pattern에 대한 status/is_active 등은 직접 쿼리에서 join 필요.
- **롤백**: 해당 블록 원래대로 복원.

---

### 2) app/api/rag/search/route.ts

**변경 요약**: ilikeSearch에서 rag_documents를 join할 때 metadata.ingest_status (null 또는 'done') 및 expires_at 조건 추가.

```diff
--- a/app/api/rag/search/route.ts
+++ b/app/api/rag/search/route.ts
@@ -66,6 +66,8 @@ async function ilikeSearch(
   let q = supabaseAdmin
     .from("rag_chunks")
     .select("...")
     .or(orFilter)
     .limit(30);
   if (lang) q = q.eq("rag_documents.lang", lang);
   if (sourceTypes?.length) q = q.in("rag_documents.source_type", sourceTypes);
+  q = q.or("rag_documents.metadata->>ingest_status.is.null,rag_documents.metadata->>ingest_status.eq.done");
+  q = q.or("rag_documents.expires_at.is.null,rag_documents.expires_at.gte." + new Date().toISOString());
   const { data, error } = await q;
```

- **부작용**: rag_documents에 metadata 컬럼이 없으면 오류. 해당 마이그레이션 적용 선행 필요.
- **롤백**: 추가된 두 줄 제거.

---

### 3) app/api/admin/playbook/patterns/[id]/approve/route.ts

**변경 요약**: 승인 성공 시 logAdminAction 호출.

- 파일 상단에 `import { logAdminAction } from "../../../../../../src/lib/audit/adminAuditLog";` 및 requireAdminAuth 후 authResult 확보.
- 승인 성공 분기 끝에서:  
  `await logAdminAction({ action: "PLAYBOOK_APPROVE", inquiry_ids: [], admin_id: authResult.userId, admin_email: authResult.email, metadata: { pattern_id: id } });`

---

### 4) app/api/admin/playbook/patterns/[id]/retire/route.ts

**변경 요약**: retire 성공 시 logAdminAction 호출.

- 동일하게 logAdminAction import 및 호출:  
  `action: "PLAYBOOK_RETIRE", metadata: { pattern_id: id }`

---

### 5) app/api/admin/playbook/patterns/merge/route.ts

**변경 요약**:  
- merge 시 병합되는 행(merge_ids)에 `merged_at = new Date().toISOString()` 설정.  
- 성공 시 logAdminAction: `action: "PLAYBOOK_MERGE", metadata: { canonical_id, merge_ids }`

---

### 6) app/api/admin/automation/run/route.ts

**변경 요약**: job 시작 시 또는 완료(성공/실패) 시 logAdminAction 호출.

- `import { logAdminAction } from "../../../../../src/lib/audit/adminAuditLog";`  
- requireAdminAuth 성공 시 authResult 확보.  
- try 블록 끝(성공):  
  `await logAdminAction({ action: "AUTOMATION_RUN", admin_id: authResult.userId, admin_email: authResult.email, metadata: { job_id: jobId, job_type: job, status: "done", stats } });`  
- catch 블록:  
  `await logAdminAction({ action: "AUTOMATION_RUN", metadata: { job_id: jobId, job_type: job, status: "failed", error: err.message } });`

---

### 7) app/api/admin/leads/assign/route.ts

**변경 요약**: hospital_leads insert/update 시 `last_status_at: new Date().toISOString()` 설정 (status와 함께).

---

### 8) app/api/admin/leads/[id]/route.ts

**변경 요약**: PATCH에서 status 변경 시 `last_status_at: new Date().toISOString()` 추가.

---

### 9) migrations/20260226_schema_change_logs.sql (신규)

**목적**: 스키마 변경 이력 및 change_key 중복 방지.

```sql
-- ============================================================
-- schema_change_logs: 마이그레이션 증적 및 중복 실행 방지
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schema_change_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  change_key    text        NOT NULL,
  sql_sha256    text        NULL,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_change_logs_change_key
  ON public.schema_change_logs (change_key);

COMMENT ON TABLE public.schema_change_logs IS '마이그레이션/스키마 변경 실행 이력 (change_key 중복 방지)';
```

- **롤백**: `DROP TABLE IF EXISTS public.schema_change_logs;`

---

## E. 검증 (성공/실패 기준)

### 1) Public Chat: thread_id + public_token 없으면 CRUD 불가

- **방법**:  
  - `POST /api/public/chat/message` body: `{ "thread_id": "<valid-uuid>", "message_text": "hi" }` (public_token 생략)  
  - 기대: 400 또는 403.  
  - `POST /api/public/chat/message` body: `{ "thread_id": "<valid-uuid>", "public_token": "<wrong-uuid>", "message_text": "hi" }`  
  - 기대: 403 Invalid thread or token.

### 2) RAG: ingest_status != (null|done) 문서는 검색 결과에 미포함

- **방법**:  
  - rag_documents에 metadata = `{"ingest_status":"failed"}` 인 행 1개 연결된 rag_chunks 존재하도록 insert.  
  - RPC: `SELECT * FROM rag_search_chunks_v1_1(..., 10, ...);` (또는 /api/rag/search로 벡터 경로 유도).  
  - 기대: 해당 document_id의 chunk가 결과에 없음.  
  - 동일 문서를 metadata = `{}` 또는 ingest_status = 'done'으로 update 후 다시 검색 시 결과에 포함되는지 확인.

### 3) Playbook: draft/rejected/merged/retired(is_active=false) 패턴은 RAG 컨텍스트에 미주입

- **방법**:  
  - playbook_patterns에 status='draft' 또는 is_active=false 인 패턴에 연결된 rag_documents가 있도록 설정.  
  - 벡터 검색(RPC 또는 채팅) 실행.  
  - 기대: 해당 패턴의 chunk가 검색 결과에 없음.

### 4) Auto jobs: 동일 job_type 동시 실행 중복 방지

- **방법**:  
  - `POST /api/admin/automation/run?job=daily_eval` 2회를 거의 동시에 호출.  
  - 기대: 한 번은 200, 두 번째는 409 (Job 'daily_eval' is already running).

### 5) schema_change_logs: change_key 중복 방지 및 sql_sha256/metadata 일관성

- **방법**:  
  - `INSERT INTO schema_change_logs (change_key, sql_sha256, metadata) VALUES ('test_key', 'abc', '{}');`  
  - 동일 change_key로 다시 INSERT.  
  - 기대: UNIQUE 위반으로 실패.

---

### 실행 커맨드/스크립트 예시

**Public Chat (curl)**

```bash
# token 없이 메시지 전송 → 400/403 기대
curl -s -X POST http://localhost:3000/api/public/chat/message \
  -H "Content-Type: application/json" \
  -d '{"thread_id":"00000000-0000-0000-0000-000000000001","message_text":"hi"}' | jq .
```

**RAG ingest_status (SQL, Supabase SQL Editor)**

```sql
-- 실패 문서가 검색 제외되는지 확인
SELECT id, document_id, content FROM rag_search_chunks_v1_1(
  (SELECT embedding FROM rag_chunks WHERE document_id = '<failed_doc_id>' LIMIT 1),
  10, NULL, NULL, false, false, 0
);
-- failed_doc_id가 metadata.ingest_status='failed'인 문서일 때 해당 문서의 chunk가 0건이어야 함.
```

**Auto job 중복 (curl)**

```bash
# 두 번째 요청은 409 기대
curl -s -X POST "http://localhost:3000/api/admin/automation/run?job=daily_eval" -H "Cookie: ..." &
curl -s -X POST "http://localhost:3000/api/admin/automation/run?job=daily_eval" -H "Cookie: ..."
```

**schema_change_logs**

```sql
INSERT INTO public.schema_change_logs (change_key, metadata) VALUES ('audit_test_1', '{}');
INSERT INTO public.schema_change_logs (change_key, metadata) VALUES ('audit_test_1', '{}'); -- 실패 기대
```

---

이 문서는 마이그레이션 DDL 및 레포 코드 검토를 기준으로 작성되었으며, 사용자가 별도 제공한 CREATE TABLE 목록이 있다면 해당 정의를 진실 소스로 반영해 재검증하는 것을 권장합니다.
