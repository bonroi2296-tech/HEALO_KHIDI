import LoginLegacyWrapper from "./LoginLegacyWrapper";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your healwith patient dashboard.",
  robots: { index: false, follow: false },
};

export default function Login() {
  return <LoginLegacyWrapper />;
}
