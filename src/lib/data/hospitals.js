import { mapHospitalRow, mapTreatmentRow } from "../mapper";
import { supabaseServer } from "./supabaseServer";
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
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    logError("[getHospitalList]", error);
    return [];
  }

  return data || [];
};

export const getHospitalById = async (id) => {
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    logError("[getHospitalById]", error);
    return null;
  }

  return mapHospitalRow(data);
};

export const getHospitalBySlug = async (slug) => {
  if (!slug) return null;
  const { data, error } = await supabaseServer
    .from("hospitals")
    .select(HOSPITAL_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (error?.message) logError("getHospitalBySlug", error);
    return null;
  }

  return mapHospitalRow(data);
};

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
