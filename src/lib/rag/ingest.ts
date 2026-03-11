import { supabaseAdmin } from "./supabaseAdmin";
import { buildDocument } from "./buildDocument";
import { chunkText } from "./chunker";
import { getEmbedding } from "../chat/generateReply";

type SourceType =
  | "treatment"
  | "hospital"
  | "review"
  | "normalized_inquiry"
  | "policy"
  | "faq";

const nowIso = () => new Date().toISOString();

const fetchSourceRows = async (sourceType: SourceType, sourceId?: string) => {
  switch (sourceType) {
    case "treatment": {
      let q = supabaseAdmin
        .from("treatments")
        .select(
          "id, slug, name, description, full_description, tags, benefits, price_min, price_max, hospitals(name, location_en, location_kr)"
        );
      if (sourceId) q = q.eq("id", sourceId);
      return q;
    }
    case "hospital": {
      let q = supabaseAdmin
        .from("hospitals")
        .select(
          "id, slug, name, description, location_en, location_kr, address_detail, tags, operating_hours, doctor_profile"
        );
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
          "id, language, country, treatment_id, treatment_slug, objective, constraints, raw_message, extraction_confidence, missing_fields, contact"
        );
      if (sourceId) q = q.eq("id", sourceId);
      return q;
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
    .select("id, content, version")
    .eq("source_type", doc.source_type)
    .eq("source_id", doc.source_id)
    .eq("lang", doc.lang)
    .maybeSingle();

  if (existingError) throw existingError;

  const needsUpdate = !existing || existing.content !== doc.content;
  let documentId = existing?.id;
  let version = existing?.version ?? 1;

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
        created_at: nowIso(),
        updated_at: nowIso(),
      })
      .select("id, version")
      .single();

    if (error) throw error;
    documentId = inserted.id;
    version = inserted.version;
  } else if (needsUpdate) {
    const { data: updated, error } = await supabaseAdmin
      .from("rag_documents")
      .update({
        title: doc.title,
        content: doc.content,
        version: version + 1,
        updated_at: nowIso(),
      })
      .eq("id", existing.id)
      .select("id, version")
      .single();

    if (error) throw error;
    documentId = updated.id;
    version = updated.version;
  }

  if (!documentId) return { updated: false, documentId: null };

  if (needsUpdate) {
    await supabaseAdmin.from("rag_chunks").delete().eq("document_id", documentId);

    const chunks = chunkText(doc.content);
    if (chunks.length > 0) {
      const payload = [];
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
          ...(embedding ? {
            embedding: JSON.stringify(embedding),
            embedding_model: "gemini-embedding-001",
            embedded_at: nowIso(),
          } : {}),
          metadata: {
            source_type: doc.source_type,
            source_id: doc.source_id,
            lang: doc.lang,
            title: doc.title,
            version,
            ingest_status: "done",
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
