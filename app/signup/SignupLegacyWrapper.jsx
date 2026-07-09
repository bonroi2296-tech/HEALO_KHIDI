"use client";

import { useRouter } from "next/navigation";
import { SignUpPage } from "./SignupClient";

export default function SignupLegacyWrapper() {
  const router = useRouter();
  const setView = (viewName) => {
    // claim(환자 계정연결) 링크로 왔으면 로그인으로 넘어갈 때도 ?redirect= 유지.
    const redirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
    if (viewName === "login") router.push(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login");
    else router.push("/");
  };
  return <SignUpPage setView={setView} />;
}
