"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

 
export default function AuthWrapper({ Component }) {
  const router = useRouter();

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
        case "login":
          router.push("/login");
          break;
        case "signup":
          router.push("/signup");
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

  return <Component setView={setView} />;
}
