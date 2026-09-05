import { supabaseAdmin } from "./supabaseAdmin";
import { buildDocument } from "./buildDocument";
import { chunkText } from "./chunker";
import { getEmbedding } from "../chat/generateReply";
import { CANCER_DETAILS, ITCRN_FRAMEWORK } from "../data/immuneCancerDetails";

type SourceType =
  | "treatment"
  | "hospital"
  | "review"
  | "normalized_inquiry"
  | "policy"
  | "faq"
  | "center_menu"
  | "cancer_info";

const nowIso = () => new Date().toISOString();

// 신뢰등급(1=공공/공식, 2=제휴 승인, 3=공개 수집 — migrations/20260225_rag_trust_tier.sql).
// 우리 DB의 검증된 구조화 데이터(hospitals·treatments)는 2. 명시하지 않으면 DB 기본값 3이 박혀
// 검색(RPC가 trust_tier 우선 정렬)에서 뒤로 밀리고 모델도 미검증 취급한다 — 실사고(2026-07-23):
// 성동점 신규 적재가 tier 3으로 들어가 "지점 어디어디 있어"류 답변에서 성동점만 누락.
// (playbook 승인 라우트는 trust_tier:2 를 명시하는데 이 파일만 빠져 있었다.)
const TRUST_TIER_BY_SOURCE: Partial<Record<SourceType, number>> = {
  hospital: 2,
  treatment: 2,
  // 자사 제휴병원이 준 공식 메뉴판(엑셀 원본) — hospital/treatment 와 같은 등급.
  center_menu: 2,
  // 제휴병원 공식 사이트에서 옮겨온 암종별 치료 안내 — 위와 같은 등급.
  cancer_info: 2,
};

const fetchSourceRows = async (sourceType: SourceType, sourceId?: string) => {
  switch (sourceType) {
    case "treatment": {
      // is_published=true 만 적재 — 공개 페이지(treatments.js·dbSearch)와 동일 가시성.
      // 이게 없으면 미게시 초안·TEST 더미가 RAG 검색으로 환자에게 노출됨(병렬 세션 발견, POSTMORTEMS #47).
      let q = supabaseAdmin
        .from("treatments")
        .select(
          "id, slug, name, description, full_description, tags, benefits, price_min, price_max, hospitals(name, location_en, location_kr)"
        )
        .eq("is_published", true);
      if (sourceId) q = q.eq("id", sourceId);
      return q;
    }
    case "hospital": {
      // is_published=true 만 적재 — 공개 페이지(hospitals.js·dbSearch)와 동일 가시성(TEST 병원 노출 차단).
      let q = supabaseAdmin
        .from("hospitals")
        .select(
          "id, slug, name, description, location_en, location_kr, address_detail, tags, operating_hours, doctor_profile"
        )
        .eq("is_published", true);
      if (sourceId) q = q.eq("id", sourceId);
      return q;
    }
    case "review": {
      let q = supabaseAdmin
        .from("reviews")
        .select("id, treatment_id, user_name, country, rating, content, created_at");
      if (sourceId) q = q.eq("id", sourceId);
      return q;
    }
    case "normalized_inquiry": {
      let q = supabaseAdmin
        .from("normalized_inquiries")
        .select(
          // raw_message(암호문)·contact(PII)는 RAG 문서에 넣지 않으므로 조회도 제외
          "id, language, country, treatment_id, treatment_slug, objective, constraints, extraction_confidence, missing_fields"
        );
      if (sourceId) q = q.eq("id", sourceId);
      return q;
    }
    case "center_menu": {
      // 메뉴판은 (센터 × 카테고리) 하나를 문서 1건으로 묶는다 — 이유는 buildDocument 주석 참고.
      // sourceId 는 center_slug 로 해석(한 센터만 재적재할 때).
      // src/types/database.types.ts 는 생성물이라 신규 테이블이 아직 없다 → 이 쿼리만 캐스팅.
      // 타입 재생성(supabase gen types) 시 이 캐스팅을 지워라.
      let q: any = (supabaseAdmin.from as any)("center_menu_items")
        .select(
          "center_slug, center_name_ko, center_summary_ko, hospital_brand, category_ko, frequency_ko, item_name_ko, price_krw, display_order, revised_on"
        )
        .eq("is_active", true)
        .order("center_slug")
        .order("display_order");
      if (sourceId) q = q.eq("center_slug", sourceId);
      const { data, error } = await q;
      if (error) return { data: [], error };

      const groups = new Map<string, any>();
      for (const row of (data || []) as any[]) {
        const key = `${row.center_slug}:${row.category_ko}`;
        if (!groups.has(key)) {
          groups.set(key, { ...row, items: [] });
        }
        groups.get(key).items.push({
          item_name_ko: row.item_name_ko,
          price_krw: row.price_krw,
        });
      }
      return { data: [...groups.values()], error: null };
    }
    case "cancer_info": {
      // 원본은 DB가 아니라 코드 안의 정본(src/lib/data/immuneCancerDetails.js) —
      // 같은 파일을 암종 상세 화면(app/treatments/[slug])도 쓴다. 그래서 표를 새로 만들지 않고
      // 화면과 같은 정본에서 파생시킨다(두 벌 관리 방지). 파일이 바뀌면 이 적재만 다시 돌리면 된다.
      // sourceId 는 암종 slug(female·digest·liver·lung·thyroid·etc) 또는 치료축 키로 해석.
      const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];
      const rows: any[] = [];

      for (const [slug, d] of Object.entries<any>(CANCER_DETAILS)) {
        if (sourceId && sourceId !== slug) continue;
        for (const lang of LANGS) {
          const title = d?.title?.[lang];
          if (!title) continue; // 그 언어 번역이 없으면 문서를 만들지 않는다
          const lines: string[] = [];
          if (d?.intro?.[lang]) lines.push(d.intro[lang]);
          const comps = (d?.complications || [])
            .map((c: any) =>
              c?.name?.[lang] ? `${c.name[lang]}: ${c?.desc?.[lang] || ""}`.trim() : null
            )
            .filter(Boolean);
          if (comps.length) lines.push(`주요 합병증·증상 / Complications: ${comps.join(" | ")}`);
          const progs = d?.focusPrograms?.[lang] || [];
          if (progs.length) lines.push(`중점 프로그램 / Focus programs: ${progs.join(", ")}`);
          rows.push({ slug, lang, title, lines, source_url: d?.immuneSourceUrl });
        }
      }

      // 치료 5축(ITCRN) — 2026-09-05 부터 잎이 {ko,en,…} 객체다. RAG 문서는 예전처럼 한국어 하나만 만든다
      // (다른 언어 환자에게는 위 암종별 문서의 focusPrograms 가 같은 역할). 문자열/객체 둘 다 받는다.
      const koOf = (x: any): string => (typeof x === "string" ? x : typeof x?.ko === "string" ? x.ko : "");
      const AXIS_LABEL: Record<string, string> = {
        cellular: "세포면역",
        humoral: "체액면역",
        methods: "치료법",
        programs: "프로그램",
        evidence: "근거",
        before: "항암 전",
        during: "항암 중",
        after: "항암 후",
      };
      for (const [axis, a] of Object.entries<any>(ITCRN_FRAMEWORK)) {
        if (sourceId && sourceId !== axis) continue;
        const title = a?.title?.ko;
        if (!title) continue;
        const lines: string[] = [];
        if (a?.desc?.ko) lines.push(a.desc.ko);
        for (const [key, val] of Object.entries<any>(a)) {
          if (key === "title" || key === "desc") continue;
          const label = AXIS_LABEL[key] || key;
          if (Array.isArray(val) && val.length) {
            const items = val.map(koOf).filter(Boolean);
            if (items.length) lines.push(`${label}: ${items.join(", ")}`);
          } else if (koOf(val)) lines.push(`${label}: ${koOf(val)}`);
        }
        if (!lines.length) continue;
        rows.push({ slug: `itcrn-${axis}`, lang: "ko", title, lines });
      }

      return { data: rows, error: null };
    }
    default:
      return { data: [], error: null };
  }
};

const upsertDocumentAndChunks = async (doc: {
  source_type: SourceType;
  source_id: string;
  lang: string;
  title: string | null;
  content: string;
}) => {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("rag_documents")
    .select("id, content, version, trust_tier")
    .eq("source_type", doc.source_type)
    .eq("source_id", doc.source_id)
    .eq("lang", doc.lang)
    .maybeSingle();

  if (existingError) throw existingError;

  const needsUpdate = !existing || existing.content !== doc.content;
  let documentId = existing?.id;
  let version = existing?.version ?? 1;

  const trustTier = TRUST_TIER_BY_SOURCE[doc.source_type];

  if (!existing) {
    const { data: inserted, error } = await supabaseAdmin
      .from("rag_documents")
      .insert({
        source_type: doc.source_type,
        source_id: doc.source_id,
        lang: doc.lang,
        title: doc.title,
        content: doc.content,
        version: 1,
        ...(trustTier != null ? { trust_tier: trustTier } : {}),
        created_at: nowIso(),
        updated_at: nowIso(),
      })
      .select("id, version")
      .single();

    if (error) throw error;
    documentId = inserted.id;
    version = inserted.version ?? 1;
  } else if (needsUpdate) {
    const { data: updated, error } = await supabaseAdmin
      .from("rag_documents")
      .update({
        title: doc.title,
        content: doc.content,
        version: version + 1,
        // 내부 데이터는 갱신 때도 등급을 바로잡는다(과거 tier 3 오적재분 자기치유).
        ...(trustTier != null ? { trust_tier: trustTier } : {}),
        updated_at: nowIso(),
      })
      .eq("id", existing.id)
      .select("id, version")
      .single();

    if (error) throw error;
    documentId = updated.id;
    version = updated.version ?? 1;
  } else if (trustTier != null && existing.trust_tier !== trustTier) {
    // 내용은 동일하지만 등급만 틀어진 문서(과거 tier 3 오적재분) — 재청킹·재임베딩 없이
    // 등급만 바로잡는다(자기치유). version 은 내용 변경이 아니므로 안 올림.
    const { error } = await supabaseAdmin
      .from("rag_documents")
      .update({ trust_tier: trustTier, updated_at: nowIso() })
      .eq("id", existing.id);
    if (error) throw error;
  }

  if (!documentId) return { updated: false, documentId: null };

  if (needsUpdate) {
    await supabaseAdmin.from("rag_chunks").delete().eq("document_id", documentId);

    const chunks = chunkText(doc.content);
    if (chunks.length > 0) {
      const payload: any[] = [];
      for (const chunk of chunks) {
        let embedding: number[] | null = null;
        try {
          embedding = await getEmbedding(chunk.content);
        } catch (e) {
          console.warn("[ingest] embedding failed for chunk, skipping:", e);
        }
        payload.push({
          document_id: documentId,
          chunk_index: chunk.index,
          content: chunk.content,
          // embedding 만 컬럼. 모델/시각 부기정보는 rag_chunks 에 전용 컬럼이 없으므로 metadata 로 보관.
          // (과거 코드가 없는 컬럼 embedding_model/embedded_at 에 insert 하려다 PGRST204 로 적재가 통째 실패했음.)
          ...(embedding ? { embedding: JSON.stringify(embedding) } : {}),
          metadata: {
            source_type: doc.source_type,
            source_id: doc.source_id,
            lang: doc.lang,
            title: doc.title,
            version,
            ingest_status: "done",
            ...(embedding ? { embedding_model: "gemini-embedding-001", embedded_at: nowIso() } : {}),
          },
        });
      }
      const { error } = await supabaseAdmin.from("rag_chunks").insert(payload);
      if (error) throw error;
    }
  }

  return { updated: needsUpdate, documentId };
};

export const ingestSources = async (
  sourceTypes: SourceType[] = [
    "treatment",
    "hospital",
    "review",
    "normalized_inquiry",
    "center_menu",
    "cancer_info",
  ],
  sourceId?: string
) => {
  const results: Record<string, number> = {};

  for (const sourceType of sourceTypes) {
    const { data, error } = await fetchSourceRows(sourceType, sourceId);
    if (error) throw error;

    let updatedCount = 0;
    for (const row of data || []) {
      const doc = buildDocument(sourceType, row);
      if (!doc.content) continue;
      const result = await upsertDocumentAndChunks(doc);
      if (result.updated) updatedCount += 1;
    }
    results[sourceType] = updatedCount;
  }

  return results;
};
