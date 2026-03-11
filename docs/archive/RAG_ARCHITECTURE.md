# RAG Architecture (HEALO)

## 1) Why Platformization
HEALO receives inquiries from multiple channels (AI agent text, inquiry form, and external human touchpoints). These inputs vary in structure and quality. Platformization means unifying all inbound inquiries into a single canonical schema so they can be:
- audited consistently,
- processed by the same rules,
- and connected to downstream retrieval and matching systems.

This prevents channel-specific logic, reduces operational drift, and creates a stable foundation for analytics and decision support.

## 2) Data Flow
**Raw input → Normalized inquiry → RAG documents → Retrieval**

1. **Raw input**
   - Unstructured text (AI agent) or structured form submissions.
   - External human touchpoints are logged minimally for outcomes, not treated as a data asset.

2. **Normalized inquiry**
   - Stored in `normalized_inquiries` as the canonical record.
   - Captures language, country, treatment intent, constraints, and raw message.

3. **RAG documents**
   - Source records (treatments, hospitals, reviews, normalized inquiries) are converted to uniform text documents.
   - Stored in `rag_documents` with versioning.
   - Chunked into `rag_chunks` for retrieval.

4. **Retrieval**
   - Basic text search over chunk content (ILIKE/FTS).
   - Results are used to support matching decisions, not to generate medical advice.

## 3) Why This Is NOT a Medical Chatbot
The system does not diagnose, prescribe, or replace clinical judgment. It is a retrieval and normalization layer that supports:
- consistent intake of inquiries,
- structured data for matching,
- and reference material for operational decision-making.

Any response logic is constrained to presenting existing information, not generating medical guidance.

## 4) Compliance Guardrails
- **No medical advice**: Retrieval results are informational and non-prescriptive.
- **Least-privilege access**: Elevated operations use service role keys; public read is limited to safe source types.
- **Auditability**: Normalized inquiries keep raw input and confidence metadata.
- **Data minimization**: Human touchpoints are logged only for outcomes and status.
- **Separation of concerns**: Raw input and normalized data are stored distinctly to preserve traceability.

## 5) Roadmap
1. **pgvector integration**
   - Add embeddings storage and vector similarity search.
   - Hybrid retrieval (vector + keyword).

2. **Multilingual expansion**
   - Language-aware chunking and retrieval.
   - Per-language indexing and filtering.

3. **Ranking optimization**
   - Weighted relevance signals (recency, source quality, outcome success).
   - Offline evaluation metrics for retrieval quality.
