type SourceType =
  | "treatment"
  | "hospital"
  | "review"
  | "normalized_inquiry"
  | "policy"
  | "faq"
  | "center_menu"
  | "cancer_info";

type BuildInput = {
  source_type: SourceType;
  source_id: string;
  lang: string;
  title: string | null;
  content: string;
};

const joinLines = (lines: Array<string | null | undefined>) =>
  lines.filter(Boolean).join("\n").trim();

export const buildDocument = (sourceType: SourceType, row: any): BuildInput => {
  switch (sourceType) {
    case "treatment": {
      // Fields used:
      // id, slug, name, description, full_description, tags, benefits,
      // price_min, price_max, hospitals.name, hospitals.location_en/location_kr
      const title = row?.name || null;
      const content = joinLines([
        `Treatment: ${row?.name || ""}`,
        row?.slug ? `Slug: ${row.slug}` : null,
        row?.description ? `Summary: ${row.description}` : null,
        row?.full_description ? `Details: ${row.full_description}` : null,
        row?.tags?.length ? `Tags: ${row.tags.join(", ")}` : null,
        row?.benefits?.length ? `Benefits: ${row.benefits.join(", ")}` : null,
        row?.price_min != null ? `Price Min: ${row.price_min}` : null,
        row?.price_max != null ? `Price Max: ${row.price_max}` : null,
        row?.hospitals?.name ? `Hospital: ${row.hospitals.name}` : null,
        row?.hospitals?.location_en
          ? `Hospital Location (EN): ${row.hospitals.location_en}`
          : null,
        row?.hospitals?.location_kr
          ? `Hospital Location (KR): ${row.hospitals.location_kr}`
          : null,
      ]);
      return {
        source_type: sourceType,
        source_id: row.id,
        lang: "en",
        title,
        content,
      };
    }
    case "hospital": {
      // Fields used:
      // id, slug, name, description, location_en, location_kr, address_detail,
      // tags, operating_hours, doctor_profile
      const title = row?.name || null;
      const content = joinLines([
        `Hospital: ${row?.name || ""}`,
        row?.slug ? `Slug: ${row.slug}` : null,
        row?.description ? `Summary: ${row.description}` : null,
        row?.location_en ? `Location (EN): ${row.location_en}` : null,
        row?.location_kr ? `Location (KR): ${row.location_kr}` : null,
        row?.address_detail ? `Address Detail: ${row.address_detail}` : null,
        row?.tags?.length ? `Tags: ${row.tags.join(", ")}` : null,
        row?.operating_hours
          ? `Operating Hours: ${JSON.stringify(row.operating_hours)}`
          : null,
        row?.doctor_profile ? `Doctor Profile: ${row.doctor_profile}` : null,
      ]);
      return {
        source_type: sourceType,
        source_id: row.id,
        lang: "en",
        title,
        content,
      };
    }
    case "review": {
      // Fields used:
      // id, treatment_id, user_name, country, rating, content, created_at
      const title = row?.user_name
        ? `Review by ${row.user_name}`
        : "Review";
      const content = joinLines([
        row?.treatment_id ? `Treatment ID: ${row.treatment_id}` : null,
        row?.user_name ? `User: ${row.user_name}` : null,
        row?.country ? `Country: ${row.country}` : null,
        row?.rating != null ? `Rating: ${row.rating}` : null,
        row?.created_at ? `Created: ${row.created_at}` : null,
        row?.content ? `Review: ${row.content}` : null,
      ]);
      return {
        source_type: sourceType,
        source_id: row.id,
        lang: "en",
        title,
        content,
      };
    }
    case "normalized_inquiry": {
      // Fields used:
      // id, language, country, treatment_id, treatment_slug, objective,
      // constraints, raw_message, extraction_confidence, missing_fields, contact
      const title =
        row?.objective ||
        (row?.treatment_slug ? `Inquiry about ${row.treatment_slug}` : null) ||
        "Inquiry";
      const content = joinLines([
        row?.language ? `Language: ${row.language}` : null,
        row?.country ? `Country: ${row.country}` : null,
        row?.treatment_id ? `Treatment ID: ${row.treatment_id}` : null,
        row?.treatment_slug ? `Treatment Slug: ${row.treatment_slug}` : null,
        row?.objective ? `Objective: ${row.objective}` : null,
        row?.constraints
          ? `Constraints: ${JSON.stringify(row.constraints)}`
          : null,
        // raw_message 는 DB에 암호화 저장돼 있어 그대로 넣으면 암호문이 학습 문서를
        // 오염시키고, 복호화해 넣으면 평문 PII 가 RAG 에 남음 — 둘 다 안 되므로 제외.
        // contact(연락처)도 PII 라 제외. 문의 의도는 objective/constraints 로 충분.
        row?.extraction_confidence != null
          ? `Extraction Confidence: ${row.extraction_confidence}`
          : null,
        row?.missing_fields?.length
          ? `Missing Fields: ${row.missing_fields.join(", ")}`
          : null,
      ]);
      return {
        source_type: sourceType,
        source_id: row.id,
        lang: row?.language || "en",
        title,
        content,
      };
    }
    case "center_menu": {
      // row = fetchSourceRows 가 (센터 × 카테고리) 단위로 합쳐 만든 합성 행.
      // 센터 통짜 1문서가 아니라 카테고리별로 쪼갠 이유: chunkText 가 개행을 죽이고 800자에서
      // 무자비하게 자른다 → 통짜면 청크가 항목 중간에서 끊겨 "금액만 있고 무슨 항목인지 없는"
      // 조각이 생기고, 머리에 박은 「국내 비급여가·확정견적 아님」 경고도 첫 청크에만 남는다.
      // 카테고리 단위면 한 문서 = 한 청크라 경고가 항상 금액과 같이 붙어 다닌다.
      const items: Array<{ item_name_ko: string; price_krw: number | null }> =
        row?.items || [];
      const title = `${row?.center_name_ko} · ${row?.category_ko}`;
      const content = joinLines([
        `[${row?.hospital_brand} ${row?.center_name_ko} 센터 메뉴판 | ${row?.category_ko}]`,
        row?.center_summary_ko ? `센터 소개: ${row.center_summary_ko}` : null,
        row?.frequency_ko ? `권장 주기: ${row.frequency_ko}` : null,
        // 이 한 줄이 핵심 안전장치 — 국내 비급여 정가를 외국인 확정견적으로 답하는 걸 막는다.
        `기준: 국내 비급여 정가(KRW), ${row?.revised_on} 개정, ${row?.hospital_brand} 전지점 공통. 외국인 국제수가나 확정 견적이 아니며 실제 치료계획·금액은 진료 후 결정됨. Korea domestic self-pay list price, NOT a final foreign-patient quote.`,
        `항목: ${items
          .map(
            (it) =>
              `${it.item_name_ko} ${
                it.price_krw == null
                  ? "금액 미기재"
                  : `${it.price_krw.toLocaleString("ko-KR")}원`
              }`
          )
          .join(" / ")}`,
      ]);
      return {
        source_type: sourceType,
        source_id: `${row?.center_slug}:${row?.category_ko}`,
        lang: "ko",
        title,
        content,
      };
    }
    case "cancer_info": {
      // row = fetchSourceRows 가 (암종 또는 치료축) × 언어로 펼쳐 만든 합성 행.
      // 원본(immuneCancerDetails.js)은 언어별 값이 한 객체에 섞여 있어 그대로는 문서가 안 된다.
      // ponytail: 갈래별 분기 대신 fetchSourceRows 에서 { title, lines[] } 로 평평하게 만들어 넘긴다.
      const title: string = row?.title || "";
      const content = joinLines([
        `[${title}]`,
        ...(row?.lines || []),
        // 치료 내용을 개별 환자 처방으로 읽지 않게 못 박는다. center_menu 의 금액 경고와 같은 역할.
        `출처: 면력한방병원 공식 안내(${row?.source_url || "immunehospital.com"}). 일반 안내이며 개별 환자의 치료 계획은 진료 후 의료진이 결정한다. General information, not a treatment plan for an individual patient.`,
      ]);
      return {
        source_type: sourceType,
        source_id: `${row?.slug}:${row?.lang}`,
        lang: row?.lang || "ko",
        title,
        content,
      };
    }
    default: {
      const content = joinLines([row?.content || ""]);
      return {
        source_type: sourceType,
        source_id: row.id,
        lang: row?.lang || "en",
        title: row?.title || null,
        content,
      };
    }
  }
};
