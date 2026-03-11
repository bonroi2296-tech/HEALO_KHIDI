"use client";

import { useRouter } from "next/navigation";
import { SuccessPage } from "./SuccessClient";

export default function Success() {
  const router = useRouter();
  const setView = (viewName) => {
    if (viewName === "home") {
      router.push("/");
    } else {
      router.push("/");
    }
  };

  return <SuccessPage setView={setView} />;
}
