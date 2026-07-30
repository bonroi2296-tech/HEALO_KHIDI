import MedicalDisclaimerClientLegacy from "./MedicalDisclaimerClientLegacy";
import { localizedMeta } from "@/lib/i18n/metadata";

// 검색결과에 뜨는 제목·설명은 요청 언어로 (러·카 환자가 구글에서 보는 첫 줄).
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.medicalDisclaimer.title", "seo.medicalDisclaimer.desc");
}

const baseMeta = {
  title: "Medical Disclaimer",
  description:
    "Important medical information notice — healwith is not a substitute for professional medical diagnosis, treatment, or prescription.",
};

export default function MedicalDisclaimerPage() {
  return <MedicalDisclaimerClientLegacy />;
}
