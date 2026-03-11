import { mapTreatmentRow } from "../mapper";
import { supabaseServer } from "./supabaseServer";
import { logError } from "../logger";

const TREATMENT_SELECT =
  "id, slug, name, description, full_description, hospital_id, price_min, tags, images, benefits, hospitals(slug, name, location_en, location_kr)";
const TREATMENT_LIST_SELECT = "id, slug, created_at, updated_at";

export const getFeaturedTreatments = async (limit = 6) => {
  const { data, error } = await supabaseServer
    .from("treatments")
    .select(TREATMENT_SELECT)
    .eq("is_published", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logError("getFeaturedTreatments", error);
    return [];
  }

  return (data || []).map(mapTreatmentRow).filter(Boolean);
};

export const getAllTreatments = async () => {
  const { data, error } = await supabaseServer
    .from("treatments")
    .select(TREATMENT_SELECT)
    .eq("is_published", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    logError("getAllTreatments", error);
    return [];
  }

  return (data || []).map(mapTreatmentRow).filter(Boolean);
};

export const getTreatmentList = async ({ limit = 1000 } = {}) => {
  const { data, error } = await supabaseServer
    .from("treatments")
    .select(TREATMENT_LIST_SELECT)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    logError("getTreatmentList", error);
    return [];
  }

  return data || [];
};

export const getTreatmentById = async (id) => {
  const { data, error } = await supabaseServer
    .from("treatments")
    .select(TREATMENT_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    logError("getTreatmentById", error);
    return null;
  }

  return mapTreatmentRow(data);
};

export const getTreatmentBySlug = async (slug) => {
  if (!slug) return null;
  const { data, error } = await supabaseServer
    .from("treatments")
    .select(TREATMENT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (error?.message) logError("getTreatmentBySlug", error);
    return null;
  }

  return mapTreatmentRow(data);
};

export const getTreatmentSlugById = async (id) => {
  if (!id) return null;
  const { data, error } = await supabaseServer
    .from("treatments")
    .select("slug")
    .eq("id", id)
    .single();

  if (error) {
    logError("getTreatmentSlugById", error);
    return null;
  }

  return data?.slug || null;
};

export const getRelatedTreatments = async (hospitalId, excludeId) => {
  if (!hospitalId) return [];
  const { data, error } = await supabaseServer
    .from("treatments")
    .select(TREATMENT_SELECT)
    .eq("hospital_id", hospitalId)
    .eq("is_published", true)
    .neq("id", excludeId)
    .limit(4);

  if (error) {
    logError("getRelatedTreatments", error);
    return [];
  }

  return (data || []).map(mapTreatmentRow).filter(Boolean);
};
