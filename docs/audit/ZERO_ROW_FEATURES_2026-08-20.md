# 「만들어놓고 한 번도 안 쓴 기능」 지도 (2026-08-20 실측)

> ⚠️ **이 문서는 2026-09-10 까지 «본판에 없었다».** 2026-08-20 에 `fix/push-notification-icon`
> 작업본에만 커밋돼 있었고 신청서(PR)가 만들어진 적이 없어서, 기억 파일이 이 경로를 가리키는데도
> 3주 동안 아무도 열 수 없었다(2026-09-10 세션이 실제로 찾다가 못 찾아 발각). 그때 건져 왔다.
> → 교훈: **문서를 만들었으면 「커밋했다」가 아니라 「본판에 있나」로 확인해라.**

---

## 🔄 2026-09-10 재실측 — 27개 → **21개**

같은 SQL 로 다시 셌다(아래 「측정 방법」 참조). **6개가 그 사이 채워졌다.**

| 3주 전 🔴 였던 것 | 2026-09-10 | 판정 |
|---|---|---|
| 견적 이력 `cost_estimate_history` | **채워짐** | ✅ 닫힘 |
| 진행기록 `progress_records` | **채워짐** | ✅ 닫힘 |
| 챗 피드백 `chat_feedback` | **채워짐** | ✅ 닫힘 (버튼이 실제로 눌린다) |
| 사후관리 일정 `followup_schedules` | **채워짐** | ✅ 닫힘 |
| 비자 신청 `visa_applications` | **1건** | ⚠️ 아래 참조 |
| 치료 정보 `treatments` | **여전히 0** | 🟡 고장 아님(아래) |

### 새로 갈라본 「부모는 있는데 자식이 0」 — **둘 다 고장이 아니었다**

**① 비자: 신청 1건인데 이력·서류·점검표 전부 0**
- 겉보기엔 강한 신호였다. 상태가 `draft → approved` 로 바뀌었는데 이력이 한 줄도 없다.
- **그런데 그 1건은 `patient@test.com`(시험 계정)의 것이고, `created_at` 이 2026-05-21 인데 그 계정은 2026-06-21 에 만들어졌다.** 즉 **손으로 넣은 더미**다. 화면을 거쳐 만들어진 신청이 아니라서 이력이 없는 게 맞다.
- 🟡 **다만 진짜 약점이 하나 보인다**: `visa_status_history` insert 가 **네 곳 전부 오류를 안 본다**(`await ... .insert(...)` 결과를 안 읽는다). 실패하면 조용히 사라진다. 지금은 아무도 안 쓰는 기능이라 급하지 않지만, **쓰이기 시작하면 「기록이 새는데 아무도 모르는」 구조**다.

**② 병원 9곳인데 치료정보·의사·지점 전부 0**
- 화면의 「28명의 의사」는 `partner_doctors` 표가 아니라 **`hospitals.doctor_count` 숫자 칸**에서 온다. 표가 비어도 화면은 정상이다.
- `treatments` 를 읽는 코드는 **전부 `app/api/admin/...` 경로**다. 환자 화면(`/ru/treatments`)은 이 표를 안 쓴다.
- → **고객 피해 없음. 「병원이 아직 자기 치료 정보를 등록하지 않았다」가 전부다.**

### 2026-09-10 기준 0건인 표 21개

`account_deletion_requests, alert_counter_events, auto_job_events, consultation_recordings, coordinator_responses, crawl_jobs, crawl_raw_items, doc_glossary_terms, hospital_offer_enrich_jobs, hospital_offer_jobs, partner_branches, partner_doctors, patient_visa_checklist, playbook_patterns, playbook_responses, reviews, treatment_sources, treatments, visa_documents, visa_status_history, voice_notes`

> `reviews` 가 0건인데도 화면에 별점이 뜨는 것은 정상이다 — 별점은 `external_ratings.google_reviews` 에서 온다(`docs/KNOWN_ISSUES.md` 참조).

---

## 원본 (2026-08-20 실측)

## 실측 요약

| 항목 | 숫자 |
|---|---|
| 반성문 총 건수 | 175건 |
| 그중 재발(🔁) | 52건 = **29%** |
| 자동 검사 | 21개 (+오늘 1개 = 22개) |
| **행이 진짜 0건인 표**(백업·보관 제외) | **27개** |

측정 방법: `pg_stat_user_tables.n_live_tup` 은 **추정치라 틀린다**(병원 표가 0으로 나왔는데 화면엔 병원이 뜬다).
반드시 `count(*)` 로 세라.

```sql
do $$ declare r record; c bigint; t text := '';
begin
  for r in select tablename from pg_tables where schemaname='public'
           and tablename not like '\_backup%' and tablename not like '%archive%' order by 1 loop
    execute format('select count(*) from public.%I', r.tablename) into c;
    if c = 0 then t := t || r.tablename || ', '; end if;
  end loop;
  raise exception '0건인 표: %', t;
end $$;
```

---

## ① 고객(환자·에이전시)이 닿는 길인데 0건 — 9개

**여기가 우선순위다.** 고장나면 실제 환자가 피해를 본다.

| 표 | 무슨 기능인가 | 닿는 화면 |
|---|---|---|
| `cost_estimate_history` | 비용 견적 변경 이력 | 환자 `patient/cost-estimates` · 코디 `coordinator/cost-estimates` |
| `treatments` | 병원별 치료(시술) 정보 | 병원 `hospital/treatments` · 관리자 `admin/treatments` |
| `progress_records` | 환자 진행 기록 | 에이전시 `agency/PartnerPortal` |
| `visa_applications` | 비자 신청 | 환자 `patient/visa/applications` · 코디 `coordinator/visa` |
| `visa_status_history` | 비자 진행 이력 | 같음 |
| `patient_visa_checklist` | 비자 준비물 점검표 | 환자 `patient/visa` |
| `followup_schedules` | 사후관리 일정 | 환자 `patient/rebooking` |
| `chat_feedback` | 챗봇 답변 평가 | 환자 `inquiry/ThreadChat` |
| `account_deletion_requests` | 계정 삭제 요청 | 환자 `patient/account` |

### 🔴 그중 «진짜 고장 의심» 3개 — 부모는 있는데 자식이 0

0건 자체는 「아직 아무도 안 썼다」는 뜻일 수도 있다. 그래서 **부모 데이터가 있는데 자식만 0인 것**을 따로 갈랐다. 이건 「썼는데 안 남았다」는 뜻이라 고장 확률이 높다.

| 부모 | 부모 건수 | 자식 | 자식 건수 | 판정 |
|---|---|---|---|---|
| 견적 `cost_estimates` | **6** | 이력 `cost_estimate_history` | **0** | 🔴 견적을 6번 만들었는데 이력이 한 줄도 없다 |
| 병원 `hospitals` | **9** | 치료 `treatments` | **0** | 🔴 반성문 #103 이 「유령 컬럼 17개로 5개월간 0건」을 고쳤다는데 **아직도 0** |
| 문의 `inquiries`(실제) | **8** | 진행기록 `progress_records` | **0** | 🔴 에이전시 포털이 읽는 곳인데 비어 있다 |

**판단 보류(0이 정상일 수 있음)**

| 부모 | 부모 건수 | 자식 | 자식 건수 | 왜 보류인가 |
|---|---|---|---|---|
| 챗 메시지 | 1,068 | 챗 피드백 | 0 | 사용자가 「좋아요」를 눌러야 생긴다. 다만 1,068건에 정확히 0인 것은 버튼이 안 보이거나 저장이 막혔을 수도 있다 |
| 상담 세션 | 133 | 녹화 | 0 | 녹화를 안 켜면 0이 맞다 |
| 비자 신청 | 0 | 비자 이력 | 0 | 부모부터 0이라 아직 아무도 안 쓴 것 |
| 사후관리 일정 | 0 | | | **확인 완료(정상)**: 대상 조건이 `case_status IN ('follow_up','completed')` 인데 실제 환자 8명이 전부 접수·상담 단계다 |

---

## ② 내부(관리자·코디)만 쓰는데 0건 — 7개

`auto_job_events` · `crawl_jobs` · `partner_branches` · `partner_doctors` · `playbook_patterns` · `playbook_responses` · `symptom_alerts`

- `playbook_patterns` 는 **2026-08-20 확인 완료**: `auto_status="auto_extracted"` 가 DB 검사규칙 밖이라 저장이 통째로 거부되고 있었다(반성문 #169, 신청서 #1432 로 수정).
- `symptom_alerts` 는 같은 날 사후관리 검증에서 **정상 동작 확인**(만들었다가 시험 후 지움).

## ③ 코드는 있는데 화면 연결을 못 찾음 — 9개

`consultation_recordings` · `coordinator_responses` · `crawl_raw_items` · `hospital_offer_enrich_jobs` · `hospital_offer_jobs` · `rag_query_events` · `reviews` · `treatment_sources` · `visa_documents`

「죽은 코드일 수도, 내 추적기가 못 찾은 것일 수도」 있다. ①을 다 본 뒤에 본다.

## ④ 코드가 아예 없음(죽은 표) — 2개

`alert_counter_events` · `doc_glossary_terms`

**삭제 후보다.** 다만 DB 삭제는 PO 확인 사항이라 여기 적어만 둔다.

---

## 다음에 열어볼 순서

1. **`cost_estimate_history`** — 견적 6건이 실제로 있는데 이력만 0. 「썼는데 안 남았다」는 가장 강한 신호.
2. **`treatments`** — 반성문 #103 이 고쳤다고 적혀 있는데 여전히 0. **「고쳤다」가 사실인지 재확인**해야 한다.
3. **`progress_records`** — 에이전시가 보는 화면인데 비어 있다. 8/13 이대서울 미팅처럼 외부에 보여줄 일이 있는 화면이다.

각 건은 「실제로 눌러보기 → 저장되나 → 화면에 뜨나」로 확인한다(2026-08-20 사후관리 검증과 같은 방식).

## 이 지도의 한계

- ③번 9개는 **내 추적기가 화면 연결을 못 찾은 것**이지 「연결이 없다」가 아니다. 화면이 API 주소를 변수로 조립하면 못 잡는다.
- 「0건 = 고장」이 아니다. **아직 그 단계에 도달한 환자가 없어서** 0인 경우가 실제로 있었다(사후관리 일정).
- 이 문서의 숫자는 **2026-08-20 시점**이다. 옮겨 쓰기 전에 위 SQL 로 다시 세라.
