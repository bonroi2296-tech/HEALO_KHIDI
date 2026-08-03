import ImagingViewerClient from "./ImagingViewerClient";

export const metadata = {
  title: "CT 영상 보기 · Coordinator · healwith",
};

export default async function CoordinatorImagingPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <ImagingViewerClient
      inquiryId={id}
      path={sp?.path || ""}
      name={sp?.name || ""}
    />
  );
}
