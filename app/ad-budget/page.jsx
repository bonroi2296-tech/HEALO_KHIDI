import AdBudgetPlanner from "@/components/marketing/AdBudgetPlanner";

// 공개 버전 — PO가 로그인 없이 쓰는 광고 예산 계산기.
// 내부 기획 도구라 검색엔진 색인은 막는다(noindex). 민감데이터 없음(순수 계산기).
export const metadata = {
  title: "광고 예산 계산기 — healwith (내부)",
  robots: { index: false, follow: false },
};

export default function AdBudgetPublicPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <AdBudgetPlanner />
    </main>
  );
}
