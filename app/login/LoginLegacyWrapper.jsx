"use client";

import { useRouter } from "next/navigation";
import { LoginPage } from "./LoginClient";

export default function LoginLegacyWrapper() {
  const router = useRouter();
  const setView = (viewName) => {
    // claim(환자 계정연결) 링크로 왔으면 가입으로 넘어갈 때도 ?redirect= 유지.
    const redirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
    if (viewName === "signup") router.push(redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup");
    else router.push("/");
  };
  return <LoginPage setView={setView} />;
}
