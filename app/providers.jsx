"use client";

import { ToastProvider } from "../src/components/Toast";

export default function Providers({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}
