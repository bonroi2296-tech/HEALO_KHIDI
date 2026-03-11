"use client";

import { useRouter } from "next/navigation";
import { SignUpPage } from "./SignupClient";

export default function SignUp() {
  const router = useRouter();
  const setView = (viewName) => {
    if (viewName === "login") {
      router.push("/login");
    } else {
      router.push("/");
    }
  };

  return <SignUpPage setView={setView} />;
}
