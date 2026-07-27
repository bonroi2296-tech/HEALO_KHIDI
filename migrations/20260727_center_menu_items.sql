-- 면력한방병원 센터 메뉴판(치료·처방·검사 단가) — AI Agent가 참고할 원본 데이터
--
-- 출처: PO 제공 엑셀 「전지점_안면마비센터_센터메뉴판_fin.xlsx」·「전지점_수술후재활센터_센터메뉴판_fin.xlsx」
--       (최종수정 2026-07-22, 전지점 공통 = 강서·광명·성동·신촌 동일)
-- 성격: 국내 비급여 수납 단가(KRW). 외국인 국제수가가 아니다 — 그대로 견적으로 쓰면 안 됨
--       (src/lib/rag/buildDocument.ts 의 center_menu 문서가 이 경고를 문서 머리에 박아 넣는다).
--
-- ponytail: 센터 메타(이름·설명·개정일)를 정규화하지 않고 행마다 반복 저장한다.
--   센터 2개·항목 54개 규모라 조인 테이블이 얻는 게 없다. 센터가 10개 넘으면 그때 쪼개라.
create table if not exists public.center_menu_items (
  id uuid primary key default gen_random_uuid(),
  -- 센터 식별 (facial-palsy | post-surgery-rehab)
  center_slug text not null,
  center_name_ko text not null,
  center_summary_ko text,
  -- 전지점 공통이라 지점(hospital_id)에 묶지 않는다. 지점별로 갈리면 그때 컬럼 추가.
  hospital_brand text not null default '면력한방병원',
  category_ko text not null,          -- 'pDRN 신경주사' · '처방' · '검사' …
  frequency_ko text,                  -- '주2~3회' 같은 카테고리 권장 주기
  -- 항목명은 엑셀 원문 그대로(공백만 정리. 예: '자율신경(심박변이도)_양방비급여').
  -- 급여/비급여를 별도 컬럼으로 파싱하지 않는다 — 원문 보존이 사실 왜곡보다 안전하다.
  item_name_ko text not null,
  price_krw integer,                  -- null = 메뉴판에 금액 미기재
  display_order integer not null default 0,
  revised_on date not null,           -- 메뉴판 최종수정일
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint center_menu_items_price_nonneg check (price_krw is null or price_krw >= 0),
  constraint center_menu_items_uniq unique (center_slug, category_ko, item_name_ko)
);

create index if not exists center_menu_items_center_idx
  on public.center_menu_items (center_slug, display_order);

-- 내부 수납 단가 → 공개 조회 금지. 정책을 만들지 않으면 service_role 만 읽는다(RAG 적재 경로).
alter table public.center_menu_items enable row level security;

comment on table public.center_menu_items is
  '면력한방병원 센터별 메뉴판 단가(국내 비급여 KRW). RAG source_type=center_menu 로 적재됨.';
