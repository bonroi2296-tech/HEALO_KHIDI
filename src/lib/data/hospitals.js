import { cache } from "react";
import { mapHospitalRow, mapTreatmentRow } from "../mapper";
// 중복정리(3단계): anon 서버 클라이언트는 정본 @/lib/supabase/server 로 통합됨.
import { supabaseAnonServer as supabaseServer } from "@/lib/supabase/server";
import { logError } from "../logger";

const HOSPITAL_SELECT =
  "id, slug, name, location_en, location_kr, address_detail, description, tags, rating, reviews_count, images, latitude, longitude, operating_hours, doctor_profile";
const HOSPITAL_LIST_SELECT = "id, slug, created_at, updated_at";

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

export const getHospitalById = cache(async (id) => {
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_SELECT)
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

  return mapHospitalRow(data);
});

export const getHospitalBySlug = cache(async (slug) => {
  if (!slug) return null;
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    // maybeSingle: 행 없음은 error 없이 data=null. error가 있으면 진짜 조회 실패 →
    // 던져서 500 (null 반환 시 살아있는 페이지가 404로 색인 제거됨 — #87 리뷰 게이트).
    if (error?.message) logError("getHospitalBySlug", error);
    throw new Error("hospital_lookup_failed");
  }

  return mapHospitalRow(data);
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
