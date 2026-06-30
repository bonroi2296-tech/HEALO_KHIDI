// 일회성: 검증된 구조화 데이터(treatments·hospitals)를 실제 RAG 파이프라인(ingestSources)으로
// rag_documents/rag_chunks 에 적재 + 임베딩. AI 생성 콘텐츠가 아니라 기존 DB 데이터만 사용.
// 실행: npx tsx scripts/seed-rag-once.mjs
import dotenv from "dotenv";
// .env.local 은 공용 메인 폴더에만 있음(워크트리엔 없음) → 절대경로로 로드.
dotenv.config({ path: "C:/Users/user/Desktop/HEALO_KHIDI/.env.local" });

const { ingestSources } = await import("../src/lib/rag/ingest.ts");

console.log("=== RAG 적재 시작 (treatment, hospital) ===");
const res = await ingestSources(["treatment", "hospital"]);
console.log("적재 결과(업데이트된 문서 수):", res);
console.log("=== 완료 ===");
