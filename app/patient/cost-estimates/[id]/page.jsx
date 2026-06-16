import CostEstimateDetailClient from "./CostEstimateDetailClient";

export const metadata = {
  title: "Cost Estimate Detail · healwith",
};

export default async function Page({ params }) {
  const { id } = await params;
  return <CostEstimateDetailClient estimateId={id} />;
}
