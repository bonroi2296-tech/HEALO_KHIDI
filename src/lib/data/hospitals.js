import { cache } from "react";
import { mapHospitalRow, mapTreatmentRow } from "../mapper";
// 중복정리(3단계): anon 서버 클라이언트는 정본 @/lib/supabase/server 로 통합됨.
import { supabaseAnonServer as supabaseServer } from "@/lib/supabase/server";
import { logError } from "../logger";

const HOSPITAL_SELECT =
  "id, slug, name, location_en, location_kr, address_detail, description, tags, rating, reviews_count, images, latitude, longitude, operating_hours, doctor_profile";
const HOSPITAL_LIST_SELECT = "id, slug, created_at, updated_at";
// 상세페이지 전용 — 목록보다 칸이 많다. 상세는 서버가 첫 화면을 «글자까지» 그려서 보내야 하고
// (안 그러면 JS 안 돌리는 검색·AI 로봇이 「불러오는 중」만 읽고 간다),
// 언어별 이름·설명은 i18n 칸이 있어야 나온다. 목록 조회는 가볍게 두려고 일부러 나눠 놨다.
const HOSPITAL_DETAIL_SELECT =
  "id, slug, name, location_kr, location_en, address_detail, website, description, images, thumbnail_image, gallery_images, tags, rating, reviews_count, doctor_profile, latitude, longitude, operating_hours, certifications, medical_equipment, insurance_accepted, insurance_details, annual_surgery_count, establishment_date, doctor_count, external_ratings, specialties, amenities, supported_languages, faq, i18n, is_partner";

export const getFeaturedHospitals = async (limit = 6) => {
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_SELECT)
    .eq("is_published", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logError("[getFeaturedHospitals]", error);
    return [];
  }

  return (data || []).map(mapHospitalRow).filter(Boolean);
};

export const getAllHospitals = async () => {
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_SELECT)
    .eq("is_published", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    logError("[getAllHospitals]", error);
    return [];
  }

  return (data || []).map(mapHospitalRow).filter(Boolean);
};

export const getHospitalList = async ({ limit = 1000 } = {}) => {
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_LIST_SELECT)
    .eq("is_published", true)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    logError("[getHospitalList]", error);
    return [];
  }

  return data || [];
};

// lang 을 받는 이유: 이 결과가 상세페이지의 «서버가 미리 그려주는 첫 화면»으로도 쓰인다.
// 언어를 안 넘기면 러시아어 주소로 들어와도 기본 언어로 그려져 봇이 그걸 읽는다.
export const getHospitalById = cache(async (id, lang) => {
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    // PGRST116 = 행 없음(진짜 404). 그 외 오류는 던져서 500 — null로 뭉개면
    // 상세페이지가 일시적 DB 오류에 notFound()를 불러 살아있는 페이지가
    // 구글 색인에서 빠진다(404는 제거, 5xx는 재시도 — POSTMORTEMS #87 리뷰 게이트).
    if (error.code === "PGRST116") return null;
    logError("[getHospitalById]", error);
    throw new Error("hospital_lookup_failed");
  }

  return mapHospitalRow(data, lang);
});

export const getHospitalBySlug = cache(async (slug, lang) => {
  if (!slug) return null;
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    // maybeSingle: 행 없음은 error 없이 data=null. error가 있으면 진짜 조회 실패 →
    // 던져서 500 (null 반환 시 살아있는 페이지가 404로 색인 제거됨 — #87 리뷰 게이트).
    if (error?.message) logError("getHospitalBySlug", error);
    throw new Error("hospital_lookup_failed");
  }

  return mapHospitalRow(data, lang);
});

export const getHospitalSlugById = async (id) => {
  if (!id) return null;
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select("slug")
    .eq("id", id)
    .single();

  if (error) {
    logError("[getHospitalSlugById]", error);
    return null;
  }

  return data?.slug || null;
};

export const getHospitalTreatments = async (hospitalId) => {
  if (!hospitalId) return [];
  const { data, error } = await supabaseServer
    .from("treatments")
    .select(
      "id, slug, name, description, full_description, hospital_id, price_min, tags, images, benefits, hospitals(slug, name, location_en, location_kr)"
    )
    .eq("hospital_id", hospitalId)
    .eq("is_published", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    logError("[getHospitalTreatments]", error);
    return [];
  }

  return (data || []).map(mapTreatmentRow).filter(Boolean);
};
