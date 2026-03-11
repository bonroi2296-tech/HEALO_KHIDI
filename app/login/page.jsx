"use client";

import { useRouter } from "next/navigation";
import { LoginPage } from "./LoginClient";

export default function Login() {
  const router = useRouter();
  const setView = (viewName) => {
    if (viewName === "signup") {
      router.push("/signup");
    } else {
      router.push("/");
    }
  };

  return <LoginPage setView={setView} />;
}
