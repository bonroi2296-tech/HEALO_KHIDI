type SourceType =
  | "treatment"
  | "hospital"
  | "review"
  | "normalized_inquiry"
  | "policy"
  | "faq";

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
        row?.raw_message ? `Raw Message: ${row.raw_message}` : null,
        row?.extraction_confidence != null
          ? `Extraction Confidence: ${row.extraction_confidence}`
          : null,
        row?.missing_fields?.length
          ? `Missing Fields: ${row.missing_fields.join(", ")}`
          : null,
        row?.contact ? `Contact: ${JSON.stringify(row.contact)}` : null,
      ]);
      return {
        source_type: sourceType,
        source_id: row.id,
        lang: row?.language || "en",
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
