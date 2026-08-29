import AppInstallClient from "./AppInstallClient";

export const metadata = {
  title: "Install the healwith app",
  description: "Install healwith on your phone — Korean hospital information, consultations and video visits.",
  // 배포용 짧은 주소지 검색 결과에 걸릴 페이지가 아니다.
  robots: { index: false, follow: true },
};

export default function AppInstallPage() {
  return <AppInstallClient />;
}
