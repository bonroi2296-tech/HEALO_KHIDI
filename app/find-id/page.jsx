import FindIdClient from "./FindIdClient";

export const metadata = {
  title: "Find your email | healwith",
  description: "Find the email you signed up with using your name and date of birth.",
  robots: { index: false, follow: false },
};

export default function FindIdPage() {
  return <FindIdClient />;
}
