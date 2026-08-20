# 「만들어놓고 한 번도 안 쓴 기능」 지도 (2026-08-20 실측)

> **왜 만들었나.** PO 지적: *"뭘 맨날 기계가 막게 했다면서 막을게 계속 생기는거야?"*
> 재보니 맞는 말이었다. 자동 검사는 **코드의 모양**을 보지 **기능이 도는지**는 안 본다.
> 그래서 검사를 21개에서 22개로 늘려도 **이미 잠들어 있는 기능**은 그대로 잠들어 있고,
> 하나씩 열어볼 때마다 고장이 나온다(2026-08-20 하루에 2건이 이렇게 나왔다).
>
> **이 문서는 「검사를 더 만들자」가 아니라 「어디를 열어봐야 하나」의 지도다.**

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
