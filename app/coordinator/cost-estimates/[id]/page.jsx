import CoordinatorCostDetailClient from "./CoordinatorCostDetailClient";

export const metadata = { title: "Cost Estimate · Coordinator · HEALO" };

export default async function Page({ params }) {
  const { id } = await params;
  return <CoordinatorCostDetailClient estimateId={id} />;
}
