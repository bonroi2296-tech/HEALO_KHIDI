"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InquiryPage } from "./InquiryClient";
import { supabaseClient } from "@/lib/data/supabaseClient";

export default function InquiryWrapper() {
  const router = useRouter();
  const [mode, setMode] = useState("select");
  const [treatments, setTreatments] = useState([]);

  const setView = useMemo(
    () => (viewName) => {
      switch (viewName) {
        case "home":
          router.push("/");
          break;
        case "list_treatment":
          router.push("/treatments");
          break;
        case "list_hospital":
          router.push("/hospitals");
          break;
        case "admin":
          router.push("/admin");
          break;
        case "inquiry":
          router.push("/inquiry");
          break;
        case "success":
          router.push("/success");
          break;
        default:
          router.push("/");
      }
    },
    [router]
  );

  useEffect(() => {
    let isMounted = true;
    supabaseClient
      .from("treatments")
      .select("id, name, hospital_id, price_min, hospitals(name)")
      .eq("is_published", true)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("[InquiryWrapper] simple list error:", error);
          return;
        }
        if (data) {
          setTreatments(
            data.map((treatment) => ({
              id: treatment.id,
              title: treatment.name,
              hospitalId: treatment.hospital_id,
              hospital: treatment.hospitals?.name,
              price: treatment.price_min
                ? `$${treatment.price_min}`
                : "",
            }))
          );
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <InquiryPage
      setView={setView}
      mode={mode}
      setMode={setMode}
      onClose={() => router.back()}
      treatments={treatments}
    />
  );
}
